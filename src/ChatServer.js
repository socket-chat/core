import * as _ from 'lodash'
import { SocketAuthenticator } from './auth'
import { Room, RoomTypes } from './entity/Room'
import { Message } from './entity/Message'

const debug = require('debug')('sc:chat')

const DEFAULT_ROOM = 'lobby'

/**
 * Chat Server
 */
class ChatServer {
  /**
   * @param  {Store} state store
   * @param  {socket.io/Server} sio socket.io Server instance
   */
  constructor(store, sio) {
    this._sio = sio
    this._store = store
    this.middleware = []
  }

  get rooms() {
    return this._store.state.chat.rooms
  }

  get sio() {
    return this._sio
  }

  get users() {
    return this._store.state.chat.users
  }

  _addIncomingMessageHandler(user, socket) {
    socket.on('chat.message', ({ roomId, message } = {}) => {
      this.routeMessage(new Message(user, message, roomId))
    })
  }

  _registerMiddleware() {
    this.middleware.push((message) => {
      if (! this.rooms.has(message.roomId)) {
        throw new Error('Room [' + message.roomId + '] does not exist!')
      }
      return message
    })
  }

  boot(port) {
    const { actions } = this._store
    const authenticator = new SocketAuthenticator()

    const lobby = this.createRoom(DEFAULT_ROOM)

    this._registerMiddleware()

    this.sio.on('connection', authenticator.authorize({
      timeout: 10000
    })).on('authenticated', (socket, user) => {
      socket.on('disconnect', () => {
        this.rooms.filter(r => user.inRoom(r.name))
          .forEach(r => actions.leaveRoom(r, user))
        actions.removeUser(user)
      })

      // re-add the socket to namespaces
      _.each(this.sio.nsps, (nsp) => {
        if (_.find(nsp.sockets, { id: socket.id })) {
          nsp.connected[socket.id] = socket
        }
      })

      this._addIncomingMessageHandler(user, socket)

      user.socket = socket

      actions.addUser(user)
      actions.joinRoom(lobby, user)
    })

    this.sio.listen(port)
  }

  createRoom(name, type = RoomTypes.PUBLIC, users = []) {
    const { actions } = this._store
    const room = new Room(this._store.state, name, type)

    actions.addRoom(room)

    users.forEach(u => actions.joinRoom(room, u))

    return room
  }

  getUserByUsername(username) {
    const match = username.toLowerCase()
    return this.users.find((value) => value.username.toLowerCase() === match)
  }

  routeMessage(msg) {
    const { sender, roomId } = msg

    try {
      this.middleware.every(mw => !! msg && (msg = mw(msg)))
    } catch (e) {
      return sender.notify('Middleware Failed! ' + ('message' in e ? e.message : e))
    }

    if (!! msg) {
      this.rooms.get(roomId).send(msg)
    }
  }

  use(extension) {
    if ('default' in extension) {
      extension.default(this)
    } else {
      extension(this)
    }
  }
}

export { ChatServer }
