import g from './Globals'

const config = {}
const projectConfig = {}
g.config = config
g.projectConfig = projectConfig

function setConfig(section, content) {
    Object.assign(config[section], content)
    g.configSession.send('SetConfig', {
        [section]: content
    })
}

function setProjectConfig(section, content) {
    console.warn(section, projectConfig[section], content)
    Object.assign(projectConfig[section], content)
    g.projectSession.send('SetProjectConfig', {
        [section]: content
    })
}

export { config, projectConfig, setConfig, setProjectConfig }
