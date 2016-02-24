const crypto = require('crypto')

const md5 = (data) => crypto.createHash('md5').update(data).digest('hex')


/**
 * A message sent by a user.
 */
class Message {
  /**
   * @param  {User} sender user sending the message
   * @param  {String} body message body
   */
  constructor(sender, body, roomId) {
    this.sender = sender
    this.body = body
    this.sent = false
    this.roomId = roomId
    this.sentAt = Date.now()
    this.id = md5(this.roomId + this.body + this.sentAt)
  }

  encode() {
    return {
      msgId: this.id,
      message: this.body,
      roomId: this.roomId,
      timestamp: this.sentAt,
      rank: this.sender.role,
      user: this.sender.username,
      gravatar: this.sender.emailHash,
    }
  }
}

export { Message }
