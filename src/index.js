import * as _ from 'lodash'
import SocketServer from 'socket.io'

import { ChatServer } from './chat/ChatServer'
import * as middleware from './chat/middleware'
import { ChatCommandHandler } from './chat/middleware/commands'

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
 * Helper function for adding built in chat commands.
 * @param  {ChatServer} server
 */
const createCommandHandler = (server) => {
  let commandHandler = new ChatCommandHandler()

  _.each(middleware.commands.defaults, (command, slashAction) => {
    commandHandler.registerCommand(slashAction, command)
  })

  server.addMessageMiddleware(commandHandler)
}

/**
 * Helper function for adding default message middleware.
 * @param  {ChatServer} server
 */
const createMessageFilters = (server) => {
  const filtersConfig = server.config('server', 'filters')

  _.map(middleware.filters, (middleware, name) => new middleware(filtersConfig[name] || {}))
    .forEach(filter => server.addMessageMiddleware(filter))
}

/**
 * Creates a new ChatServer instance
 * @return {ChatServer}
 */
export const createChatServer = (opts = {
  commandHandlerFactory: createCommandHandler,
  messageFiltersFactory: createMessageFilters
}) => {
  let sio = createSocketIO()
  let server = new ChatServer(sio)

  server.loadConfig('server', __dirname + '/../config/server.json')

  if (opts.commandHandlerFactory) {
    opts.commandHandlerFactory(server)
  }

  if (opts.messageFiltersFactory) {
    opts.messageFiltersFactory(server)
  }

  return server
}

if (process.argv[1] === __filename) {
  createChatServer().listen(8082)
}

export default {
  createChatServer
}
