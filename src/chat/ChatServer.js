import * as _ from 'lodash'
import { Config } from './Config'
import { SocketAuthenticator } from './auth'
import { Room, RoomTypes } from './entity/Room'

const debugMiddleware = require('debug')('middleware')

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
    this._config = {}
    this._messageMiddleware = []
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

  get middleware() {
    let obj = {}
    this._messageMiddleware.forEach(middleware => obj[middleware.constructor.name] = middleware)
    return obj
  }

  /**
   * Adds {@link Middleware} to the message middleware pipeline.
   * @param {Middleware} middleware [description]
   */
  addMessageMiddleware(middleware) {
    this._messageMiddleware.push(middleware)
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

  /**
   * Pass a {@link Message} through its middleware pipeline.
   * @param  {Message} message
   */
  handleMessage(message) {
    try {
      this._messageMiddleware.forEach(middleware => {
        debugMiddleware('running: ' + middleware.constructor.name)
        middleware.handle(message, (msg) => debugMiddleware('next called: ' + msg))
      })
    } catch (e) {
      debugMiddleware('error: ' + e.message)
      return false
    }
    return true
  }

  /**
   * Fetch the specified config.
   * @param  {String} name name of the loaded config
   * @param  {String} path [description]
   * @return {null|mixed}
   */
  config(name, path = '') {
    return this._config[name].get(path)
  }

  /**
   * Loads config from a file.
   * @param  {String} name key used to retrieve config
   * @param  {String} path path to config file
   */
  loadConfig(name, path) {
    this._config[name] = new Config(path)
  }
}

export { ChatServer }
