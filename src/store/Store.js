/**
 * MIT License
 * Copyright © 2016 Evan You
 *
 * The code in this file has been adapted from https://github.com/vuejs/vuex
 * to remove the dependency on Vue as well removing frontend specific code for
 * hot reloading capabilities.
 */


/**
 * Create a actual callable action function.
 *
 * @param {String|Function} action
 * @param {Vuex} store
 * @return {Function} [description]
 */

const createAction = (action, store) => {
  if (typeof action === 'string') {
    // simple action string shorthand
    return (...payload) => store.dispatch(action, ...payload)
  } else if (typeof action === 'function') {
    // normal action
    return (...payload) => action(store, ...payload)
  }
}

/**
 * Merge an array of objects into one.
 *
 * @param {Array<Object>} arr
 * @param {Boolean} allowDuplicate
 * @return {Object}
 */

const mergeObjects = (arr, allowDuplicate) => {
  return arr.reduce((prev, obj) => {
    Object.keys(obj).forEach(key => {
      const existing = prev[key]
      if (existing) {
        // allow multiple mutation objects to contain duplicate
        // handlers for the same mutation type
        if (allowDuplicate) {
          if (Array.isArray(existing)) {
            existing.push(obj[key])
          } else {
            prev[key] = [prev[key], obj[key]]
          }
        } else {
          console.warn(`[Store] Duplicate action: ${ key }`)
        }
      } else {
        prev[key] = obj[key]
      }
    })
    return prev
  }, {})
}

/**
 * Deep clone an object. Faster than JSON.parse(JSON.stringify()).
 *
 * @param {*} obj
 * @return {*}
 */

const deepClone = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(deepClone)
  } else if (obj && typeof obj === 'object') {
    var cloned = {}
    var keys = Object.keys(obj)
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i]
      cloned[key] = deepClone(obj[key])
    }
    return cloned
  } else {
    return obj
  }
}

export class Store {

  /**
   * @param {Object} options
   *        - {Object} state
   *        - {Object} actions
   *        - {Object} mutations
   *        - {Array} middlewares
   *        - {Boolean} strict
   */

  constructor ({
    state = {},
    actions = {},
    mutations = {},
    middlewares = [],
    getters = {},
    strict = false
  } = {}) {
    // bind dispatch to self
    const dispatch = this.dispatch
    this.dispatch = (...args) => {
      dispatch.apply(this, args)
    }
    this._state = { ...state }
    this._dispatching = false
    this.actions = Object.create(null)
    this.getters = Object.create(null)
    this._setupActions(actions)
    this._setupMutations(mutations)
    this._setupGetters(getters)
  }

  /**
   * Getter for the entire state tree.
   * Read only.
   *
   * @return {Object}
   */

  get state () {
    return this._state
  }

  set state (v) {
    throw new Error('[Store] Store root state is read only.')
  }

  /**
   * Dispatch an action.
   *
   * @param {String} type
   */

  dispatch (type, ...payload) {
    const mutation = this._mutations[type]
    const state = this.state
    if (mutation) {
      this._dispatching = true
      // apply the mutation
      if (Array.isArray(mutation)) {
        mutation.forEach(m => m(state, ...payload))
      } else {
        mutation(state, ...payload)
      }
      this._dispatching = false
    } else {
      console.warn(`[Store] Unknown mutation: ${ type }`)
    }
  }

  /**
   * Set up the callable action functions exposed to components.
   * This method can be called multiple times for hot updates.
   * We keep the real action functions in an internal object,
   * and expose the public object which are just wrapper
   * functions that point to the real ones. This is so that
   * the reals ones can be hot reloaded.
   *
   * @param {Object} actions
   * @param {Boolean} [hot]
   */

  _setupActions (actions, hot) {
    this._actions = Object.create(null)
    actions = Array.isArray(actions)
      ? mergeObjects(actions)
      : actions
    Object.keys(actions).forEach(name => {
      this._actions[name] = createAction(actions[name], this)
      if (!this.actions[name]) {
        this.actions[name] = (...args) => this._actions[name](...args)
      }
    })
  }

  /**
   * Set up the callable getter functions exposed to components.
   * This method can be called multiple times for hot updates.
   * We keep the real getter functions in an internal object,
   * and expose the public object which are just wrapper
   * functions that point to the real ones. This is so that
   * the reals ones can be hot reloaded.
   *
   * @param {Object} getters
   * @param {Boolean} [hot]
   */
  _setupGetters (getters, hot) {
    this._getters = Object.create(null)
    getters = Array.isArray(getters)
      ? mergeObjects(getters)
      : getters
    Object.keys(getters).forEach(name => {
      this._getters[name] = (...payload) => getters[name](this.state, ...payload)
      if (!this.getters[name]) {
        this.getters[name] = (...args) => this._getters[name](...args)
      }
    })
  }

  /**
   * Setup the mutation handlers. Effectively a event listener.
   * This method can be called multiple times for hot updates.
   *
   * @param {Object} mutations
   */

  _setupMutations (mutations) {
    this._mutations = Array.isArray(mutations)
      ? mergeObjects(mutations, true)
      : mutations
  }
}

// also export the default
export default {
  Store
}
