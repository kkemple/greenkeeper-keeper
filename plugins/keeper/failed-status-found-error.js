module.exports = class FailedStatusFoundError extends Error {
  constructor (message = 'A failed status was found for this PR.') {
    super(message)
    this.message = message
    this.name = 'FailedStatusFoundError'
  }
}
