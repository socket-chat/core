import Immutable from 'immutable'

export const RoomTypes = {
  PUBLIC: 'PUBLIC'
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

  send(message) {
    let messageList = this.messages

    if (this.messages.size >= MAX_HISTORY) {
      messageList = this.messages.slice(1)
    }

    this.messages = messageList.push(message)
  }

  notifyJoin(user) {
    user.socket.emit('chat.room.joined', {
      users: this.userProfiles,
      roomId: this.name
    })

    this.announce('chat.user.joined', { roomId: this.name, user: user.profile })
  }

  notifyLeave(user) {
    this.announce('chat.user.left', { roomId: this.name, uid: user.uid })
  }
}

export default Room
