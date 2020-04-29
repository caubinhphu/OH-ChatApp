const RoomManagement = function () {
  this.rooms = [];
};

// get the room in the rooms by nameRoom
RoomManagement.prototype.getRoom = function (nameRoom) {
  return this.rooms.find((room) => room.name === nameRoom);
};

// checked the room already exists in the rooms  by nameRoom
RoomManagement.prototype.isRoomExists = function (nameRoom) {
  let index = this.rooms.findIndex((room) => room.name === nameRoom);
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
RoomManagement.prototype.removeRoom = function (nameRoom) {
  let index = this.rooms.findIndex((room) => room.name === nameRoom);
  if (index !== -1) {
    this.rooms.splice(index, 1);
  }
};

// find the room ikn the rooms by idUser
RoomManagement.prototype.findRoomIncludeUser = function (idUser) {
  return this.rooms.find((room) => {
    return room.checkUserInRoom(idUser);
  });
};

module.exports = RoomManagement;
