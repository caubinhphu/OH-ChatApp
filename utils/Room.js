const Room = function (id, password) {
  this.id = id;
  this.password = password;
  this.allowChat = true;
  this.status = 'open';
  this.users = [];
  this.waitingRoom = [];
};

// add a new user to the room
Room.prototype.addUser = function (user) {
  this.users.push(user);
};

// remove the user in the room by socketId and return this user
Room.prototype.removeUser = function (socketId) {
  let index = this.users.findIndex((user) => user.socketId === socketId);

  if (index !== -1) {
    return this.users.splice(index, 1)[0];
  }
};

// remove the user in the room by idUser and return this user
Room.prototype.removeUserById = function (idUser) {
  let index = this.users.findIndex((user) => user.id === idUser);

  if (index !== -1) {
    return this.users.splice(index, 1)[0];
  }
};

// get the user in the room by idUser
Room.prototype.getUser = function (idUser) {
  return this.users.find((user) => user.id === idUser);
};

// checked the user already exists in the room by socketId
Room.prototype.checkUserInRoom = function (socketId) {
  return this.users.some((user) => user.socketId === socketId);
};

// add a new user to waiting room
Room.prototype.addUserToWaitingRoom = function (user) {
  this.waitingRoom.push(user);
};

// remove the user in the waiting room by idUser
Room.prototype.removeUserInWaitingRoom = function (idUser) {
  let index = this.waitingRoom.findIndex((user) => user.id === idUser);

  if (index !== -1) {
    return this.waitingRoom.splice(index, 1)[0];
  }
};

// get the user in the waiting room by idUser
Room.prototype.getUserInWaitingRoom = function (idUser) {
  return this.waitingRoom.find((user) => user.id === idUser);
};

// get host of the room
Room.prototype.getHost = function () {
  return this.users.find((user) => user.host);
};

// allow user join the room
Room.prototype.allowJoinRoom = function (idUser) {
  const index = this.waitingRoom.findIndex((user) => user.id === idUser);
  if (index !== -1) {
    const user = this.waitingRoom[index];
    this.users.push(user);
    this.waitingRoom.splice(index, 1);
    return user;
  }
};

// not allow user join the room
Room.prototype.notAllowJoinRoom = function (idUser) {
  const index = this.waitingRoom.findIndex((user) => user.id === idUser);
  if (index !== -1) {
    return this.waitingRoom.splice(index, 1)[0];
  }
};

module.exports = Room;
