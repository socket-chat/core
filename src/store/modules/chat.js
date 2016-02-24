import Immutable from 'immutable'

import {
  ROOM_ADD,
  ROOM_DELETE,
  ROOM_JOIN,
  ROOM_LEAVE,
  USER_ADD,
  USER_REMOVE
} from '../mutation-types'

export const chatInitialState = {
  rooms: new Immutable.Map(),
  users: new Immutable.Map(),
}

export const chatMutations = {
  [ROOM_ADD] ({ chat }, room) {
    chat.rooms = chat.rooms.set(room.name, room)
  },

  [ROOM_DELETE] ({ chat }, room) {
    chat.rooms = chat.rooms.delete(room.name)
  },

  [ROOM_JOIN] ({ chat }, room, user) {
    room.members = room.members.add(user.uid)
    user.roomList = user.roomList.add(room.name)
  },

  [ROOM_LEAVE] ({ chat }, room, user) {
    room.members = room.members.remove(user.uid)
    user.roomList = user.roomList.delete(room.name)
  },

  [USER_ADD] ({ chat }, user) {
    chat.users = chat.users.set(user.uid, user)
  },

  [USER_REMOVE] ({ chat }, user) {
    chat.users = chat.users.delete(user.uid)
  }
}

