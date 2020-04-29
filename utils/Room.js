const Room = function (name) {
  this.name = name;
  this.users = [];
};

// add a new user to the room
Room.prototype.addUser = function (user) {
  this.users.push(user);
};

// remove the user in the room by idUser and return this user
Room.prototype.removeUser = function (idUser) {
  let index = this.users.findIndex((user) => user.id === idUser);

  if (index !== -1) {
    return this.users.splice(index, 1)[0];
  }
};

// get the user in the room by idUser
Room.prototype.getUser = function (idUser) {
  return this.users.find((user) => user.id === idUser);
};

// checked the user already exists in the room by idUser
Room.prototype.checkUserInRoom = function (idUser) {
  return this.users.some((user) => user.id === idUser);
};

module.exports = Room;
