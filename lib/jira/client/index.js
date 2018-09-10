const { Installation } = require('../../models')
const getAxiosInstance = require('./axios')

/*
 * Similar to the existing Octokit rest.js instance included in probot
 * apps by default, this client adds a Jira client that allows us to
 * abstract away the underlying HTTP requests made for each action. In
 * general, the client should match the Octokit rest.js design for clear
 * interoperability.
 */
module.exports = async (id, installationId, jiraHost) => {
  const { jiraHost: baseURL, sharedSecret: secret } = await Installation.getForHost(jiraHost)

  const instance = getAxiosInstance(id, installationId, baseURL, secret)

  const client = {
    baseURL: instance.defaults.baseURL,
    issues: {
      // eslint-disable-next-line camelcase
      get: (issue_id, query = { fields: 'summary' }) => instance.get(`/rest/api/latest/issue/:issue_id`, {
        fields: {
          ...query,
          issue_id
        }
      }),
      getAll: async (issueIds, query) => (await Promise.all(issueIds.map(issueId => client.issues.get(issueId, query).catch(error => error))))
        .filter(response => response.status === 200)
        .map(response => response.data),
      parse: (text) => {
        const jiraIssueRegex = /[A-Z]+-[0-9]+/g

        return text.match(jiraIssueRegex)
      },
      comments: {
        // eslint-disable-next-line camelcase
        getForIssue: (issue_id) => instance.get(`/rest/api/latest/issue/:issue_id/comment`, {
          fields: {
            issue_id
          }
        }),
        // eslint-disable-next-line camelcase
        addForIssue: (issue_id, payload) => instance.post(`/rest/api/latest/issue/:issue_id/comment`, payload, {
          fields: {
            issue_id
          }
        })
      },
      transitions: {
        // eslint-disable-next-line camelcase
        getForIssue: (issue_id) => instance.get(`/rest/api/latest/issue/:issue_id/transitions`, {
          fields: {
            issue_id
          }
        }),
        // eslint-disable-next-line camelcase
        updateForIssue: (issue_id, transition_id) => instance.post(`/rest/api/latest/issue/:issue_id/transitions`, {
          transition: {
            id: transition_id
          }
        }, {
          fields: {
            issue_id
          }
        })
      },
      worklogs: {
        // eslint-disable-next-line camelcase
        getForIssue: (issue_id) => instance.get(`/rest/api/latest/issue/:issue_id/worklog`, {
          fields: {
            issue_id
          }
        }),
        // eslint-disable-next-line camelcase
        addForIssue: (issue_id, payload) => instance.post(`/rest/api/latest/issue/:issue_id/worklog`, payload, {
          fields: {
            issue_id
          }
        })
      }
    },
    devinfo: {
      updateRepository: (data) => instance.post('/rest/devinfo/0.10/bulk', {
        preventTransitions: false,
        repositories: [data]
      })
    }
  }

  return client
}