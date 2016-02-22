import Immutable from 'immutable'

class User {
  constructor(uid, username, props = {}) {
    this._uid = uid
    this._username = username
    this._props = props
    this.roomList = new Immutable.Set()
    this.socket = null
  }

  get emailHash() {
    return this._props.email_hash
  }

  get isBanned() {
    return this._props.role === 'Banned'
  }

  get profile() {
    return {
      uid: this.uid,
      username: this.username,
      gravatar: this.emailHash,
      rank: this.role,
    }
  }

  get role() {
    return this._props.role
  }

  get uid() {
    return this._uid
  }

  get username() {
    return this._username
  }

  inRoom(roomName) {
    return this.roomList.has(roomName)
  }

  notify(message) {
    this.socket.emit('chat.event', {
      message, timestamp: Date.now()
    })
  }
}

export { User }
