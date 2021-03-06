function registerCMCommands(CodeMirror) {
    if (CodeMirror.akimousCommandsRegistered) return
    CodeMirror.akimousCommandsRegistered = true
    const Pos = CodeMirror.Pos
    const commands = CodeMirror.commands

    commands.setExtending = cm => {
        cm.setExtending(true)
    }

    commands.unsetExtending = cm => {
        cm.setExtending(false)
    }

    commands.deleteLineAndGoUp = cm => {
        cm.execCommand('deleteLine')
        cm.execCommand('goLineUp')
        cm.execCommand('goLineEnd')
    }

    commands.deleteLineAndGoDown = cm => {
        cm.execCommand('deleteLine')
        cm.execCommand('goLineStartSmart')
    }
    
    // from CM sublime plugin
    function findPosSubword(doc, start, dir) {
        if (dir < 0 && start.ch === 0)
            return doc.clipPos(Pos(start.line - 1))
        const line = doc.getLine(start.line)
        if (dir > 0 && start.ch >= line.length)
            return doc.clipPos(Pos(start.line + 1, 0))

        const UPPER = 1,
            LOWER = 2,
            DIGIT = 3,
            SPACE = 4,
            OTHER = 5
        let lastType = 0 // not started yet
        let lastChar = ''
        const end = dir < 0 ? -1 : line.length + 1
        let pos = dir < 0 ? start.ch - 1 : start.ch
        for (; pos !== end; pos += dir) {
            const char = line.charAt(pos)
            let type = OTHER
            if (/\d/.test(char)) type = DIGIT
            else if (/\s/.test(char)) type = SPACE
            else if (char === '_') type = OTHER
            else if (CodeMirror.isWordChar(char)) type = LOWER
            if (type === LOWER && char === char.toUpperCase()) type = UPPER
            
            if (type === OTHER && lastType && lastChar !== char) break
            if (!lastType) {
                lastType = type
                lastChar = char
            } else if (lastType !== type) {
                if (lastType === LOWER && type === UPPER && dir < 0) pos--
                else if (lastType === UPPER && type === LOWER && dir > 0) {
                    lastType = LOWER
                    continue
                }
                break
            }
        }
        if (dir < 0 && start.ch - pos > 1) pos -= dir 
        return Pos(start.line, pos)
    }

    function moveSubword(cm, dir) {
        cm.extendSelectionsBy(range => {
            if (cm.display.shift || cm.doc.extend || range.empty())
                return findPosSubword(cm.doc, range.head, dir)
            else
                return dir < 0 ? range.from() : range.to()
        })
    }

    commands.goSubwordLeft = cm => moveSubword(cm, -1)
    commands.goSubwordRight = cm => moveSubword(cm, 1)

    commands.deleteSubwordLeft = cm => {
        cm.operation(() => {
            const head = cm.getCursor()
            const anchor = findPosSubword(cm.doc, head, -1)
            cm.replaceRange('', anchor, head)
            cm.scrollIntoView(anchor)
        })
    }

    commands.duplicateLine = cm => {
        cm.operation(() => {
            const selections = []
            for (const range of cm.listSelections()) {
                if (range.empty())
                    cm.replaceRange(cm.getLine(range.head.line) + '\n', Pos(range.head.line, 0))
                else {
                    const from = range.from()
                    const to = range.to()
                    const lineDelta = to.line - from.line + 1
                    const startingLineContent = cm.getLine(from.line).substring(0, from.ch)
                    let prefix = '\n'
                    if (/\s*/.test(startingLineContent))
                        prefix += startingLineContent
                    cm.replaceRange(prefix + cm.getRange(from, to), to)
                    selections.push({
                        head: Pos(from.line + lineDelta, from.ch),
                        anchor: Pos(to.line + lineDelta, to.ch)
                    })
                }
            }
            cm.setSelections(selections)
            cm.scrollIntoView()
        })
    }

    commands.focusAtCenter = cm => {
        const scrollInfo = cm.getScrollInfo()
        const x = scrollInfo.clientWidth / 2
        const y = scrollInfo.clientHeight / 2
        const pos = cm.coordsChar({
            left: x,
            top: y
        })
        cm.extendSelection(pos)
    }

    commands.toggleCommentIndented = cm => {
        cm.toggleComment({
            indent: true,
            padding: ' '
        })
        if (cm.doc.somethingSelected()) return
        cm.execCommand('goLineDown')
    }

    commands.goLineUp5X = cm => {
        for (let i = 0; i < 5; i++)
            cm.execCommand('goLineUp')
    }

    commands.goLineDown5X = cm => {
        for (let i = 0; i < 5; i++)
            cm.execCommand('goLineDown')
    }

    let currentAnimationId = undefined

    function scroll(cm, amount) {
        cancelAnimationFrame(currentAnimationId)
        const scrollInfo = cm.getScrollInfo()
        const vh = scrollInfo.clientHeight * amount
        const x = scrollInfo.left
        let d = 1.
        let y = scrollInfo.top - vh * d
        const step = () => {
            cm.scrollTo(x, y)
            if (d > 0.1) {
                d -= 0.1
                y -= vh * d
                currentAnimationId = requestAnimationFrame(step)
            }
        }
        step()
    }
    commands.scrollDown = cm => {
        scroll(cm, -0.1)
    }
    commands.scrollUp = cm => {
        scroll(cm, 0.1)
    }

    commands.selectLine = cm => {
        const extended = []
        for (const range of cm.listSelections()) {
            extended.push({
                anchor: Pos(range.from().line, 0),
                head: Pos(range.to().line + 1, 0)
            })
        }
        cm.setSelections(extended)
    }

    commands.selectScope = cm => {
        const extended = []
        const lineCount = cm.lineCount()
        const getIndent = line => {
            const lineContent = cm.getLine(line)
            return lineContent.match(/^\s*/)[0].length
        }
        for (const range of cm.listSelections()) {
            const from = range.from()
            const to = range.to()

            // select same line scope, e.g. " pass" for `def a(): pass`
            if (CodeMirror.cmpPos(from, to) === 0) {
                const lineContent = cm.getLine(from.line)
                if (lineContent.substring(0, from.ch).indexOf(':') >= 0) {
                    const pos = Pos(from.line, from.ch)
                    while (pos.ch > 0) {
                        const token = cm.getTokenAt(pos)
                        if (token.string === ':') break
                        pos.ch = token.start - 1
                    }
                    if (pos.ch >= 0) {
                        extended.push({
                            anchor: pos,
                            head: Pos(pos.line, lineContent.length)
                        })
                        continue
                    }
                }
            }

            const scopeIndent = Math.min(getIndent(from.line), getIndent(to.line))

            let startLine, endLine
            for (startLine = from.line; startLine > 0; startLine--) {
                const indent = getIndent(startLine - 1)
                if (indent < scopeIndent) break
            }
            for (endLine = to.line; endLine < lineCount - 1; endLine++) {
                const indent = getIndent(endLine + 1)
                if (indent < scopeIndent) break
            }

            // If the last line is empty, don't select it.
            let endLineContent = cm.getLine(endLine)
            while (endLine > to.line && /^\s*$/.test(endLineContent)) {
                endLineContent = cm.getLine(--endLine)
            }

            // If no change in selection yet, select parent level.
            if (startLine === from.line && endLine === to.line) {
                while (startLine > 0 && /^\s*$/.test(cm.getLine(startLine)))
                    startLine -= 1
            }
            extended.push({
                anchor: Pos(startLine, getIndent(startLine)),
                head: Pos(endLine, endLineContent.length)
            })
        }
        cm.setSelections(extended)
    }

    CodeMirror.scanForRegex = (cm, where, direction, regex) => {
        const maxScanLines = 5
        const lineEnd = direction > 0 ?
            Math.min(where.line + maxScanLines, cm.lastLine() + 1) :
            Math.max(cm.firstLine() - 1, where.line - maxScanLines)
        const bracketPairs = direction > 0 ? {
            '(': ')',
            '[': ']',
            '{': '}',
        } : {
            ')': '(',
            ']': '[',
            '}': '{',
        }
        const pos = Pos(where.line, 0)
        for (let line = where.line; line != lineEnd; pos.line = line += direction) {
            const lineContent = cm.getLine(line)
            if (!line) continue
            let ch = direction > 0 ? 0 : lineContent.length
            let end = direction > 0 ? lineContent.length + 1 : -1
            if (line === where.line)
                ch = direction > 0 ? where.ch + 1 : where.ch

            const stack = []

            while (ch != end) {
                pos.ch = ch
                const token = cm.getTokenAt(pos)
                const anotherHalf = bracketPairs[token.string]
                if (anotherHalf) {
                    stack.push(anotherHalf)
                } else if (stack.length > 0 && stack[stack.length - 1] === token.string) {
                    stack.pop()
                } else if (stack.length === 0 && regex.test(token.string)) {
                    return {
                        token,
                        line,
                        ch: direction > 0 ? ch - 1 : ch
                    }
                }
                if (direction > 0) {
                    ch = token.end + 1
                } else {
                    ch = (token.start === token.end) ? token.start - 1 : token.start
                }
            }
        }
        return false
    }

    commands.selectBetweenBrackets = cm => {
        const extended = []

        for (const range of cm.listSelections()) {
            const from = range.from()
            const to = range.to()
            // prevent unexpected result during cursor move
            from.sticky = null
            to.sticky = null

            // priority 3: select scope
            let left = CodeMirror.scanForRegex(cm, from, -1, /[([{]/)
            let right = CodeMirror.scanForRegex(cm, to, 1, /[)\]}]/)
            let compareLeft = CodeMirror.cmpPos(from, left)
            let compareRight = CodeMirror.cmpPos(to, right)
            let shouldExpandAgain = false

            if (!(left && right)) continue
            if (compareLeft === 1 && compareRight <= 1 && cm.getTokenAt(from).string === ' ') {
                from.ch -= 1
                left = CodeMirror.scanForRegex(cm, from, -1, /[([{]/)
                shouldExpandAgain = true
            }
            if (shouldExpandAgain || (compareLeft === 0 && compareRight === 0)) {
                // if all contents in brackets are selected, expand to include brackets themselves
                if (/[([{]/.test(left.token.string) && /[)\]}]/.test(right.token.string)) {
                    left.ch -= 1
                    right.ch += 1
                }
            }
            extended.push({
                anchor: left,
                head: right
            })
        }
        if (extended.length)
            cm.setSelections(extended)
    }

    commands.selectSmart = cm => {
        const extended = []

        for (const range of cm.listSelections()) {
            const from = range.from()
            const to = range.to()
            // prevent unexpected result during cursor move
            from.sticky = null
            to.sticky = null

            // priority 1: select word
            if (CodeMirror.cmpPos(from, to) === 0) {
                const middleToken = cm.getTokenAt(from)
                const rightToken = cm.getTokenAt(Pos(from.line, from.ch + 1))

                if (middleToken.type === null && rightToken.type !== null) {
                    extended.push(cm.findWordAt(from))
                } else {
                    extended.push(cm.findWordAt(Pos(from.line, from.ch - 1)))
                }
                continue
            }

            // priority 2: select token
            if (from.line === to.line) {
                const fromToken = cm.getTokenAt(from)
                const toToken = cm.getTokenAt(to)

                if (fromToken.start === toToken.start &&
                    (from.ch !== fromToken.start || to.ch !== toToken.end)) {
                    extended.push({
                        anchor: Pos(from.line, fromToken.start),
                        head: Pos(to.line, toToken.end)
                    })
                    continue
                }
            }

            // priority 3: select scope
            let left = CodeMirror.scanForRegex(cm, from, -1, /[([{,]/)
            let right = CodeMirror.scanForRegex(cm, to, 1, /[)\]},]/)
            let compareLeft = CodeMirror.cmpPos(from, left)
            let compareRight = CodeMirror.cmpPos(to, right)
            let shouldExpandAgain = false

            if (left && right) {
                if (compareLeft === 1 && compareRight <= 1 && cm.getTokenAt(from).string === ' ') {
                    from.ch -= 1
                    left = CodeMirror.scanForRegex(cm, from, -1, /[([{,]/)
                    shouldExpandAgain = true
                }
                if (shouldExpandAgain || (compareLeft === 0 && compareRight === 0)) {
                    let shouldContinue = true
                    if (left.token.string === ',') {
                        from.ch -= 1
                        left = CodeMirror.scanForRegex(cm, from, -1, /[([{]/)
                        shouldContinue = false
                    }
                    if (right.token.string === ',') {
                        to.ch += 2
                        right = CodeMirror.scanForRegex(cm, to, 1, /[)\]}]/)
                        shouldContinue = false
                    }
                    // if all contents in brackets are selected, expand to include brackets themselves
                    if (shouldContinue && /[([{]/.test(left.token.string) && /[)\]}]/.test(right.token.string)) {
                        left.ch -= 1
                        right.ch++
                    }

                }
                extended.push({
                    anchor: left,
                    head: right
                })
                continue
            }

            // priority 4: select the whole scope if none of above applies
            return commands.selectScope(cm)
        }
        cm.setSelections(extended)
    }

    commands.goToPreviousBracket = cm => {
        cm.extendSelectionsBy(range => {
            const cursor = range.from()
            let target = cm.findMatchingBracket(cursor)
            let head = target && (target.forward ? target.from : target.to)
            let tail = target && (target.forward ? target.to : target.from)
            if (!head || CodeMirror.cmpPos(cursor, head) <= 1) {
                cursor.ch -= 1
                head = CodeMirror.scanForRegex(cm, cursor, -1, /[([{]/)
            } else if (CodeMirror.cmpPos(cursor, tail) === 0) {
                head.ch += 1
            }
            return head || range.from()
        })
    }

    commands.goToNextBracket = cm => {
        cm.extendSelectionsBy(range => {
            const cursor = range.to()
            let target = cm.findMatchingBracket(cursor)
            let head = target && (target.forward ? target.from : target.to)
            let tail = target && (target.forward ? target.to : target.from)
            if (!tail || CodeMirror.cmpPos(cursor, tail) >= 0) {
                cursor.ch += 1
                tail = CodeMirror.scanForRegex(cm, cursor, 1, /[)\]}]/)
            } else if (CodeMirror.cmpPos(cursor, head) === 0) {
                tail.ch += 1
            }
            return tail || range.to()
        })
    }

    commands.fold = cm => {
        const cursor = cm.getCursor()
        cm.foldCode(cursor, {
            scanUp: true,
            minFoldSize: 2,
        })
    }
    
    commands.moveToLineEndAndInsertLineAfter = cm => {
        commands.goLineEnd(cm)
        commands.newlineAndIndent(cm)
    }
    
    // Replace goGroupLeft, goGroupRight, etc. to avoid skipping over consecutive braces
    function moveH(cm, dir, unit) {
        const cursor = {...cm.getCursor()} // must not modify original cursor or cm.moveH will break
        if (dir < 0)
            cursor.ch += dir
        const neighboringChar = cm.getRange(cursor, {
            line: cursor.line,
            ch: cursor.ch + 1
        })
        if (/[()[\]{}'"]/.test(neighboringChar)) {
            return cm.moveH(dir, 'char')
        }
        if (unit === 'subword') {
            return cm.execCommand(dir < 0 ? 'goSubwordLeft' : 'goSubwordRight')
        }
        return cm.moveH(dir, unit)
    }
    
    commands.goGroupLeft2 = cm => moveH(cm, -1, 'group')
    commands.goGroupRight2 = cm => moveH(cm, 1, 'group')
    commands.goSubwordLeft2 = cm => moveH(cm, -1, 'subword')
    commands.goSubwordRight2 = cm => moveH(cm, 1, 'subword')
}

export default registerCMCommands
