const Room = function (name) {
  this.name = name;
  this.users = [];
};

Room.prototype.addUser = function (user) {
  this.users.push(user);
};

Room.prototype.removeUser = function (idUser) {
  let index = this.users.findIndex((user) => user.id === idUser);

  if (index !== -1) {
    return this.users.splice(index, 1)[0];
  }
};

Room.prototype.getUser = function (idUser) {
  return this.users.find((user) => user.id === idUser);
};

Room.prototype.checkUserInRoom = function (idUser) {
  return this.users.some((user) => user.id === idUser);
};

module.exports = Room;
