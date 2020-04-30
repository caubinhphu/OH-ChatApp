const RoomManagement = function () {
  this.rooms = [];
};

// get the room in the rooms by nameRoom
RoomManagement.prototype.getRoom = function (idRoom) {
  return this.rooms.find((room) => room.id === idRoom);
};

// checked the room already exists in the rooms  by nameRoom
RoomManagement.prototype.isRoomExists = function (idRoom) {
  let index = this.rooms.findIndex((room) => room.id === idRoom);
  if (index === -1) {
    return false;
  }
  return true;
};

// add a new room to the rooms
RoomManagement.prototype.addRoom = function (room) {
  this.rooms.push(room);
};

// remove the room in the rooms by nameRoom
RoomManagement.prototype.removeRoom = function (idRoom) {
  let index = this.rooms.findIndex((room) => room.id === idRoom);
  if (index !== -1) {
    this.rooms.splice(index, 1);
  }
};

// find the room ikn the rooms by socketId
RoomManagement.prototype.findRoomIncludeUser = function (socketId) {
  return this.rooms.find((room) => {
    return room.checkUserInRoom(socketId);
  });
};

module.exports = RoomManagement;
