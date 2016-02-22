import Immutable from 'immutable'

const MAX_HISTORY = 3

export const RoomTypes = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE'
}

export class Room {
  constructor(state, name, type = RoomTypes.PUBLIC) {
    this._state = state
    this._name = name
    this._type = type
    this.members = new Immutable.Set()
    this.messages = new Immutable.List()
  }

  get name() {
    return this._name
  }

  get userProfiles() {
    return this.users.map(u => u.profile)
  }

  get users() {
    return this.members.map(uid => this._state.chat.users.get(uid))
  }

  announce(event, data) {
    this.users.forEach(u => u.socket.emit(event, data))
  }

  canJoin(user) {
    if (this._type === RoomTypes.PRIVATE) {
      return this.name.split('-').slice(1).find(s => s === user.username.toLowerCase())
    }
    return this._type === RoomTypes.PUBLIC
  }

  prune() {
    this.messages = new Immutable.List()
    this.announce('chat.prune', { roomId: this.roomId })
  }

  scrollback(user) {
    user.socket.emit('chat.room.scrollback', {
      roomId: this.name,
      messages: this.messages.map(m => m.encode())
    })
  }

  send(message) {
    let messageList = this.messages

    if (this.messages.size >= MAX_HISTORY) {
      messageList = this.messages.slice(1)
    }

    this.messages = messageList.push(message)

    this.announce('chat.message', message.encode())
  }

  notifyJoin(user) {
    user.socket.emit('chat.room.joined', {
      users: this.userProfiles,
      roomId: this.name
    })
    this.scrollback(user)

    this.announce('chat.user.joined', { roomId: this.name, user: user.profile })
  }

  notifyLeave(user) {
    this.announce('chat.user.left', { roomId: this.name, uid: user.uid })
  }
}

export default Room
