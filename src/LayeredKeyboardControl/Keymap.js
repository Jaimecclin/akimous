const editorCommandKeymap = {
    'KeyI': 'goLineUp',
    'KeyK': 'goLineDown',
    'KeyJ': 'goGroupLeft',
    'KeyL': 'goGroupRight',
    
    'KeyH': 'goLineLeftSmart',
    'Semicolon': 'goLineRight',
    'KeyU': 'goLineUp5X',
    'KeyO': 'goLineDown5X',
    'KeyY': 'goDocStart',
    'KeyP': 'goDocEnd',
    
    'KeyE': 'scrollUp',
    'KeyD': 'scrollDown',
    'KeyC': 'focusAtCenter',
    
    'KeyS': 'moveLineDown',
    'KeyW': 'moveLineUp',
    
    'KeyR': 'selectLine',
    'KeyG': 'selectScope',
    'KeyF': 'selectSmart',
    
    'Backspace': 'delGroupBefore',
    'Delete': 'delGroupAfter',
    
}

const genericCommandKeymap = {
    'KeyI': 'up',
    'KeyK': 'down',
    'KeyU': 'up5X',
    'KeyO': 'down5X',
    'KeyY': 'top',
    'KeyP': 'bottom',
    'KeyH': 'top',
    'Semicolon': 'bottom',
    
    'Digit1': '1',
    'Digit2': '2',
    'Digit3': '3',
    'Digit4': '4',
    'Digit5': '5',
    'Digit6': '6',
    'Digit7': '7',
    'Digit8': '8',
}

export default {
    editorCommandKeymap,
    genericCommandKeymap
}