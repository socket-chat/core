import * as _ from 'lodash'

import { JWTAuthProvider } from './JWTAuthProvider'

const debug = require('debug')('sc:auth')

const defaultAuthProvider = () => {
  return new JWTAuthProvider()
}

const defaultAuthState = () => {
  return {
    user: null,
    valid: false,
    fingerprint: null,
    attemptedAt: null,
    authenticatedAt: null
  }
}

class SocketAuthenticator {
  constructor(opts = {
    authStateFactory: null,
    beforeAuthSuccess: null,
    authProviderFactory: null
  }) {
    this._authStateFactory = opts.authStateFactory || defaultAuthState
    this._beforeAuthSuccess = opts.beforeAuthSuccess || ((socket) => true)
    this._authProvider = (opts.authProviderFactory || defaultAuthProvider)()
  }

  _attemptAuthentication(socket, { token, authToken }) {
    socket.patchAuthState({
      fingerprint: authToken,
      attemptedAt: Date.now()
    })

    return this._verifyToken(socket, token)
      .then(() => this._beforeAuthSuccess(socket))
      .then(() => {
        debug('authenticated')
        socket.emit('auth.success')
        socket.patchAuthState({ valid: true })
      })
  }

  _createDefaultAuthState() {
    return this._authStateFactory()
  }

  _verifyToken(socket, token) {
    return this._authProvider
      .verifyUser(token)
      .then((user) => {
        socket.patchAuthState({
          user, authenticatedAt: Date.now(), valid: true
        })
      })
  }

  attempt(socket) {
    return new Promise((resolve, reject) => {
      socket.auth = this._createDefaultAuthState()

      socket.patchAuthState = (update) => {
        socket.auth = {
          ...socket.auth,
          ...update
        }
      }

      socket.emit('auth.require')
      socket.on('auth.attempt', (data) => {
        this._attemptAuthentication(socket, data)
          .then(() => {
            resolve(socket, socket.auth.user)
          })
          .catch((err) => {
            debug('error during authentication: ' + err)
            reject(err)
          })
      })
    })
  }

  authorize(opts = { timeout: 10000 }) {
    return (socket) => {
      const server = socket.server

      const failAuth = (err) => {
        socket.emit('auth.failure', err)
        socket.disconnect('unauthorized')
      }

      debug('new conn: ' + socket.id)
      socket.connectedAt = Date.now()

      const Namespace = Object.getPrototypeOf(server.sockets).constructor
      if (! Namespace.events.includes('authenticated')) {
        Namespace.events.push('authenticated')
      }

      if (opts.timeout > 0) {
        setTimeout(() => {
          if (! socket.auth || ! socket.auth.valid) {
            failAuth()
          }
        }, opts.timeout)
      }

      this.attempt(socket)
        .then(() => {
          const namespace = (server.nsps && socket.nsp && server.nsps[socket.nsp.name]) || server.sockets
          namespace.emit('authenticated', socket, socket.auth.user)
        })
        .catch((err) => {
          debug(err)
          failAuth(err)
        })

    }
  }
}

export { SocketAuthenticator }
