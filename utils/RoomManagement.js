const RoomManagement = function () {
  this.rooms = [];
};

RoomManagement.prototype.getRoom = function (nameRoom) {
  return this.rooms.find((room) => room.name === nameRoom);
};

RoomManagement.prototype.isRoomExists = function (nameRoom) {
  let index = this.rooms.findIndex((room) => room.name === nameRoom);
  if (index === -1) {
    return false;
  }
  return true;
};

RoomManagement.prototype.addRoom = function (room) {
  this.rooms.push(room);
};

RoomManagement.prototype.removeRoom = function (nameRoom) {
  let index = this.rooms.findIndex((room) => room.name === nameRoom);
  if (index !== -1) {
    this.rooms.splice(index, 1);
  }
};

RoomManagement.prototype.findRoomIncludeUser = function (idUser) {
  return this.rooms.find((room) => {
    return room.checkUserInRoom(idUser);
  });
};

module.exports = RoomManagement;
