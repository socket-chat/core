import * as _ from 'lodash'
import Immutable from 'immutable'
import { SocketAuthenticator } from './auth'
import { Room, RoomTypes } from './entity/Room'
import { Message } from './entity/Message'

const debug = require('debug')('sc:chat')

const DEFAULT_ROOM = 'lobby'

const executePromiseChain = (stack, context) => {
  if (stack.size === 0) {
    return Promise.resolve(context)
  }

  const method = stack.last()
  return method(context)
    .then((ctx) => executePromiseChain(stack.pop(), ctx))
}

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
    this._middlewareList = new Immutable.List()
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
      return Promise.resolve(message)
    })
  }

  announce(event, message) {
    this.users.forEach(u => u.socket.emit(event, message))
  }

  boot(port, connHandler, authenticator = null) {
    const { actions } = this._store
    const lobby = this.createRoom(DEFAULT_ROOM)

    if (! authenticator) {
      authenticator = new SocketAuthenticator()
    }

    this._registerMiddleware()

    this._middlewareList = new Immutable.List(this.middleware).reverse()

    this.sio.on('connection', authenticator.authorize({
      timeout: 10000
    })).on('authenticated', (socket, user) => {
      socket.on('disconnect', () => {
        user.roomList.forEach(r => {
          actions.leaveRoom(this.rooms.get(r), user)
        })
        actions.removeUser(user)
      })

      // re-add the socket to namespaces
      _.each(this.sio.nsps, (nsp) => {
        if (_.find(nsp.sockets, { id: socket.id })) {
          nsp.connected[socket.id] = socket
        }
      })

      this._addIncomingMessageHandler(user, socket)

      if (connHandler) {
        connHandler(socket)
      }

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

  notify(message) {
    this.announce('chat.event', { message, timestamp: Date.now() })
  }

  routeMessage(msg) {
    executePromiseChain(this._middlewareList, msg)
      .then((message) => this.rooms.get(message.roomId).send(message))
      .catch((err) => msg.sender.notify('Middleware Failed! ' + ('message' in err ? err.message : err)))
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
