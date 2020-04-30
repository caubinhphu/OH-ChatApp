const User = function (id, name, isHost) {
  this.id = id;
  this.name = name;
  this.host = isHost;
  this.socketId = '';
};

module.exports = User;
