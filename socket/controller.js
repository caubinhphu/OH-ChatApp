// handle error
module.exports.onError = function (errorMsg) {
  // console.log(errorMsg);
  socket.emit('errorMessage', errorMsg);
};

// receive event create a room from client
module.exports.onCreateRoom = async function ({ roomId, password, hostname }) {
  try {
    // create and save a new room
    const room = await Room.create({
      roomId,
      password,
    });

    // create and save a new user is host
    const host = await User.create({
      name: hostname,
      host: true,
    });

    // add host in the room
    room.users.push(host._id);
    await room.save();

    // generate jwt token
    const token = jwt.sign(
      { data: { userId: host.id, roomId } },
      process.env.JWT_SECRET
    );

    // send token to client
    socket.emit('createRoomCompleted', token);
  } catch (err) {
    socket.emit('error', 'Phòng đã tồn tại, xin hãy tải lại trang!');
  }
};

module.exports.test = function (msg) {
  console.log(msg);
  console.log(this);
};
