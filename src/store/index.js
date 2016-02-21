import { Store } from './Store'
import * as actions from './actions'
import { chatMutations, chatInitialState } from './modules/chat'

export default new Store({
  state: {
    chat: chatInitialState
  },
  actions,
  mutations: [
    chatMutations
  ]
})
