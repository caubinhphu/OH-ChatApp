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
});

// get host of the room
roomSchema.methods.getHost = function () {
  return this.users.find((user) => user.host);
};

// gte user of the room by _id or socketID
roomSchema.methods.getUser = function (key, value) {
  if (key === 'id') {
    return this.users.find((user) => user.id === value);
  } else if (key === 'socketId') {
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
  return this.users.map((user) => {
    return {
      id: user.id,
      name: user.name,
      socketId: user.socketId,
      host: user.host,
      avatar: user.avatar,
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
  let index = this.waitingRoom.findIndex((user) => user.id === userId);

  if (index !== -1) {
    return this.waitingRoom.splice(index, 1)[0];
  }
};

// remove the user in the room by userId and return this user
roomSchema.methods.removeUserById = function (userId) {
  let index = this.users.findIndex((user) => user.id === userId);

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
