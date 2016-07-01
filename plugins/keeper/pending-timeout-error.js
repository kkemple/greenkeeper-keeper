module.exports = class PendingTimeoutError extends Error {
  constructor (message = 'Pending statuses timeout.') {
    super(message)
    this.message = message
    this.name = 'PendingTimeoutError'
  }
}
