const moment = require('moment');
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    minlength: 9,
    maxlength: 9,
  },
  password: {
    type: String,
    required: true,
    minlength: 4,
    maxlength: 4,
  },
  status: {
    allowChat: {
      type: Boolean,
      default: true,
    },
    allowMic: {
      type: Boolean,
      default: true,
    },
    allowVideo: {
      type: Boolean,
      default: true,
    },
    allowShare: {
      type: Boolean,
      default: true,
    },
    allowRec: {
      type: Boolean,
      default: true,
    },
    isShareScreen: {
      type: Boolean,
      default: false,
    },
    state: {
      type: String,
      default: 'open',
    },
  },
  users: [
    {
      type: mongoose.Types.ObjectId,
      ref: 'User',
    },
  ],
  waitingRoom: [
    {
      type: mongoose.Types.ObjectId,
      ref: 'User',
    },
  ],
  timeStart: Date,
  messages: [
    {
      type: mongoose.Types.ObjectId,
      ref: 'Message',
    }
  ]
});

// get host of the room
roomSchema.methods.getHost = function () {
  return this.users.find((user) => user.host);
};

// gte user of the room by _id or socketID
roomSchema.methods.getUser = function (key, value) {
  if (key === 'id') {
    return this.users.find((user) => user.id === value);
  } else {
    return this.users.find((user) => user.socketId === value);
  }
};

// get waiting room data to send to client
roomSchema.methods.getWaitingRoom = function () {
  return this.waitingRoom.map((user) => {
    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
    };
  });
};

// get socketId of users in waiting room
roomSchema.methods.getSocketIdWaitingRoom = function () {
  return this.waitingRoom.map((user) => {
    return user.socketId;
  });
};

// get users of the room info to send to client
roomSchema.methods.getRoomUsersInfo = function () {
  return this.users
    .filter(user => !user.timeLeave)
    .map((user) => {
      return {
        id: user.id,
        name: user.name,
        socketId: user.socketId,
        host: user.host,
        avatar: user.avatar,
        raiseHand: user.raiseHand
      };
    });
};

// get users of the room info to export xlsx
roomSchema.methods.getRoomUsersInfoExport = function () {
  return this.users.map((user, index) => {
    let time = 0
    if (user.timeJoin) {
      if (user.timeLeave) {
        time = moment(user.timeLeave).diff(moment(user.timeJoin), 'minutes')
      } else {
        time = moment().diff(moment(user.timeJoin), 'minutes')
      }
    }
    return {
      'STT': index + 1,
      'Họ và tên': user.name,
      'Vào lúc': user.timeJoin,
      'Ra lúc': user.timeLeave,
      'Thời gian': `${time} phút`
    };
  });
};

// allow user join the room
roomSchema.methods.allowJoinRoom = function (userId) {
  const index = this.waitingRoom.findIndex((user) => user.id === userId);
  if (index !== -1) {
    const user = this.waitingRoom[index];
    this.users.push(user);
    this.waitingRoom.splice(index, 1);
    return user;
  }
};

// not allow user join the room
roomSchema.methods.notAllowJoinRoom = function (userId) {
  const index = this.waitingRoom.findIndex((user) => user.id === userId);
  if (index !== -1) {
    return this.waitingRoom.splice(index, 1)[0];
  }
};

// remove the user in the waiting room by idUser
roomSchema.methods.removeUserInWaitingRoom = function (userId) {
  const index = this.waitingRoom.findIndex((user) => user.id === userId);

  if (index !== -1) {
    return this.waitingRoom.splice(index, 1)[0];
  }
};

// remove the user in the room by userId and return this user
roomSchema.methods.removeUserById = function (userId) {
  const index = this.users.findIndex((user) => user.id === userId);

  if (index !== -1) {
    return this.users.splice(index, 1)[0];
  }
};

// get manager of the room
roomSchema.methods.getManager = function () {
  return this.status;
};

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
