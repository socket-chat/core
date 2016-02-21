import * as _ from 'lodash'
import * as types from './mutation-types'

// room being created or destroyed
export const addRoom = types.ROOM_ADD
export const deleteRoom = types.ROOM_DELETE

// authenticated user joining or leaving a room
export const joinRoom = ({ dispatch }, room, user) => {
  dispatch(types.ROOM_JOIN, room, user)
  room.notifyJoin(user)
}

export const leaveRoom = ({ dispatch }, room, user) => {
  dispatch(types.ROOM_LEAVE, room, user)
  room.notifyLeave(user)
}

// add or remove an authenticated user from the chat server
export const addUser = types.USER_ADD
export const removeUser = types.USER_REMOVE
