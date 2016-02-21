import * as _ from 'lodash'
import { SocketAuthenticator } from './auth'
import { Room, RoomTypes } from './entity/Room'

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

  boot(port) {
    const { actions } = this._store
    const authenticator = new SocketAuthenticator()

    this.createRoom(DEFAULT_ROOM)
    const lobby = this.rooms.get(DEFAULT_ROOM)

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

      user.socket = socket

      actions.addUser(user)
      actions.joinRoom(lobby, user)
    })

    this.sio.listen(port)
  }

  createRoom(name, type = RoomTypes.PUBLIC) {
    this._store.actions.addRoom(
      new Room(this._store.state, name, type)
    )
  }
}

export { ChatServer }
