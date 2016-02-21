import * as _ from 'lodash'
import SocketServer from 'socket.io'

import { ChatServer } from './ChatServer'
import StateStore from './store'

const debug = require('debug')('sc:server')

/**
 * Creates a new socket.io/Server instance
 * @param  {Object} opts.authenticationHandler - used for adding authentication
 * logic to a socket upon connection
 * @return {socket.io/Server} socket.io/Server instance
 */
const createSocketIO = () => {
  const sio = new SocketServer(8080)

  // Since we need to authenticate users before they can send or receive
  // messages, we will remove the socket from all namespaces when they connect.
  // Only after they authenticate successfully, we will re-add them to
  // available namespaces.
  _.each(sio.nsps, (nsp) => {
    nsp.on('connect', (socket) => {
      if (! socket.auth || ! socket.auth.valid) {
        delete nsp.connected[socket.id]
      }
    })
  })

  return sio
}

/**
 * Creates a new ChatServer instance
 * @return {ChatServer}
 */
const createChatServer = () => {
  return new ChatServer(StateStore, createSocketIO())
}

export default createChatServer
