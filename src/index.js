import SocketServer from 'socket.io'

import { ChatServer } from './chat/ChatServer'
import * as middleware from './chat/middleware'

const debug = require('debug')('server')

/**
 * Creates a new socket.io/Server instance
 * @return {socket.io/Server} socket.io/Server instance
 */
let createSocketIO = () => {
  const sio = new SocketServer(8080)

  sio.on('connection', (socket) => {
    debug('new conn: ' + socket.id)
  })

  return sio
}

/**
 * Runs bootstrapping code on a {@link ChatServer} instance.
 * @param  {ChatServer} server {@link ChatServer} instance to bootstrap
 * @return {ChatServer} original instance after bootstrap methods have been applied
 */
let bootstrapChatServer = (server) => {
  const CONFIG_DIR = __dirname + '/../config/'
  let configPath = (path) => CONFIG_DIR + path

  // load config
  server.loadConfig('server', configPath('server.json'))

  // load middlewares
  middleware.attachMiddleware(server)

  return server
}

/**
 * Creates a new ChatServer instance
 * @return {ChatServer}
 */
let createChatServer = () => {
  let sio = createSocketIO()
  let server = new ChatServer(sio)

  bootstrapChatServer(server)

  return server
}

createChatServer(args)
  .listen(8888)
