const btoa = require('btoa')
const highwire = require('highwire')

const FailedStatusFoundError = require('./failed-status-found-error')
const PendingTimeoutError = require('./pending-timeout-error')

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_USER = process.env.GITHUB_USER
const GREENKEEPER_BOT_GITHUB_URL = 'https://github.com/greenkeeperio-bot'
const SQUASH_MERGES = process.env.SQUASH_MERGES || false

const MINUTE = 1000 * 60
const HOUR = MINUTE * 60

const { get, put, post } = highwire

const headers = {
  'Authorization': `Basic ${btoa(GITHUB_USER + ':' + GITHUB_TOKEN)}`
}

const mergePR = (prUrl, prNumber, sha) => {
  const mergeData = {
    sha,
    commit_title: `greenkeeper-keeper(pr: ${prNumber}): :white_check_mark:`,
    commit_message: `greenkeeper-keeper(pr: ${prNumber}): :white_check_mark:`,
    squash: SQUASH_MERGES
  }

  put(`${prUrl}/merge`, mergeData, { headers })
}

const validatePR = (statusesUrl, timeout = MINUTE) =>
  get(statusesUrl, { headers })
    .then((response) => response.body)
    .then((statuses) => {
      const failed = statuses.filter((s) => s.state === 'failed')
      const pending = statuses.filter((s) => s.state === 'pending')

      if (failed.length) {
        return Promise.reject(new FailedStatusFoundError())
      }

      if (pending.length) {
        if (timeout > HOUR) {
          return Promise.reject(new PendingTimeoutError())
        }

        return validatePR(statusesUrl, timeout * 2)
      }

      return Promise.resolve()
    })

const openedByGreenKeeperBot = (sender) => {
  return sender.html_url === GREENKEEPER_BOT_GITHUB_URL
}

const buildErrorComment = (message, prNumber) => {
  return {
    body: `greenkeeper-keeper(pr: ${prNumber}): :x: \`${message}\``
  }
}

const commentWithError = (commentsUrl, prNumber, error) => {
  post(`${commentsUrl}`, buildErrorComment(error.message, prNumber), { headers })
}

module.exports.register = (server, options, next) => {
  server.route({
    method: 'POST',
    path: '/payload',
    handler (request, response) {
      response('ok')

      const { action, sender, pull_request, number } = request.payload

      if (action === 'opened' && openedByGreenKeeperBot(sender)) {
        request.log(['info', 'PR', 'validating'])
        validatePR(pull_request.statuses_url)
          .then(() => request.log(['info', 'PR', 'validated']))
          .then(() => mergePR(
            pull_request.url,
            number,
            pull_request.head.sha
          ))
          .then(() => request.log(['info', 'PR', 'merged']))
          .catch((error) => {
            request.log(['error', 'PR'], error)
            commentWithError(pull_request.comments_url, number, error)
          })
      } else {
        request.log(['PR', 'skipping'])
      }
    }
  })

  next()
}

module.exports.register.attributes = {
  name: 'keeper',
  version: '0.0.1'
}
