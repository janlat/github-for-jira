const transformPush = require('../transforms/push')

module.exports = async (context, jiraClient, util) => {
  const { data: jiraPayload, commands } = transformPush(context.payload)

  if (!jiraPayload) {
    return
  }

  await jiraClient.devinfo.updateRepository(jiraPayload)

  await util.runJiraCommands(commands)
}