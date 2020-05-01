const Room = function (id, password) {
  this.id = id;
  this.password = password;
  this.allowChat = true;
  this.status = 'open';
  this.users = [];
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

// get the user in the room by idUser
Room.prototype.getUser = function (idUser) {
  return this.users.find((user) => user.id === idUser);
};

// checked the user already exists in the room by socketId
Room.prototype.checkUserInRoom = function (socketId) {
  return this.users.some((user) => user.socketId === socketId);
};

module.exports = Room;
