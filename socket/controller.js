const jwt = require('jsonwebtoken');

const formatMessage = require('../utils/message');

// models
const Room = require('../models/Room.model');
const User = require('../models/User.model');

// names bot
const botName = 'OH Bot';

// handle error
module.exports.onError = function (errorMsg) {
  this.emit('errorMessage', errorMsg);
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
    this.emit('createRoomCompleted', token);
  } catch (err) {
    this.emit('error', 'Phòng đã tồn tại, xin hãy tải lại trang!');
  }
};

// receive event join to the room from client
module.exports.onJoinRoom = async function (
  io,
  { roomId, passRoom, username }
) {
  // find the room
  const room = await Room.findOne({ roomId });

  // check room exists?
  if (room) {
    // room exists
    // check password of room
    if (room.password === passRoom) {
      if (room.status.state === 'open') {
        try {
          // join successful
          // create and save a new user
          const user = await User.create({
            name: username,
          });

          // add the new user to the room
          room.users.push(user._id);
          await room.save();

          // generate jwt token
          const token = jwt.sign(
            { data: { userId: user.id, roomId } },
            process.env.JWT_SECRET
          );

          // send token to client
          this.emit('joinRoomSuccess', token);
        } catch (err) {
          this.emit('error', err.message);
        }
      } else if (room.status.state === 'locked') {
        // room is locked
        this.emit('error', 'Phòng đã bị host khóa, không thể tham gia');
      } else if (room.status.state === 'waiting') {
        // room is waiting
        // create and save a new user
        const user = await User.create({
          name: username,
          socketId: this.id, // set socket id to send to client request when process allow join room
        });

        // add user to the waiting room
        room.waitingRoom.push(user._id);
        await room.save();

        // notify the host room of a change of waiting room
        // find host of this room
        const roomUpdate = await Room.findOne({ roomId })
          .populate('users')
          .populate('waitingRoom');

        const host = roomUpdate.getHost();
        if (host) {
          // send to host of this room info waiting room
          io.to(host.socketId).emit('changeWaitingRoom', {
            waitingRoom: roomUpdate.getWaitingRoom(),
          });
        }

        // emit notify to client
        this.emit('toWaitingRoom', {
          msg: 'Phòng đang ở chế độ phòng chờ, cần chờ host phê duyệt',
          roomId: room.roomId,
          userId: user.id,
        });
      }
    } else {
      // password not match
      // send message to client
      this.emit('error', 'Mật khẩu phòng không đúng, xin hãy kiểm tra lại');
    }
  } else {
    // room not exists
    this.emit('error', 'Phòng không tồn tại, xin hãy kiểm tra lại');
  }
};

// receive event joinChat from client
module.exports.onJoinChat = async function (io, { token }) {
  // verify token
  try {
    // verify token
    const { data: dataToken } = jwt.verify(token, process.env.JWT_SECRET);

    // find the room join with users in the this room
    const room = await Room.findOne({
      roomId: dataToken.roomId,
    }).populate('users');

    if (room) {
      // find user of this socket to set socket
      const user = room.getUser('id', dataToken.userId);

      if (user) {
        // join socket (user) to the room
        this.join(dataToken.roomId);

        // emit welcome room
        this.emit(
          'message',
          formatMessage(botName, 'Chào mừng đến với OH chat')
        );

        // set socket chat for the user
        user.socketId = this.id;
        user.allowJoin = false;
        await user.save();

        // broadcast emit join room
        this.to(room.roomId).emit(
          'message',
          formatMessage(botName, `${user.name} đã tham gia vào phòng`)
        );

        // emit allowed chat to socket client
        this.emit('changeStatusRoom', {
          key: 'allowChat',
          value: room.status.allowChat,
        });

        // update room info => send room info (name & users)
        io.to(room.roomId).emit('roomInfo', {
          nameRoom: room.roomId,
          users: room.getRoomUsersInfo(),
        });
        // send password and manager item of room if user is host
        if (user.host) {
          this.emit('sendPasswordRoom', room.password);
          this.emit('roomManager', room.getManager());
        }
      } else {
        // not exists participant
        this.emit('error', 'Thành viên không tồn tại, xin hãy kiểm tra lại');
      }
    } else {
      // not exist room
      this.emit('error', 'Phòng không tồn tại, xin hãy kiểm tra lại');
    }
  } catch (err) {
    // token not match
    this.emit('error', 'Access token không hợp lệ!');
  }
};

// receive message from client
module.exports.onMessageChat = async function ({ token, message }) {
  try {
    // verify token
    const { data: dataToken } = jwt.verify(token, process.env.JWT_SECRET);

    // find room join with users in this room
    const room = await Room.findOne({
      roomId: dataToken.roomId,
    }).populate({
      path: 'users',
    });

    if (room) {
      // find user send message
      const user = room.users.find((u) => u.id === dataToken.userId);
      if (user) {
        if (room.status.allowChat || user.host) {
          // broadcast message to all user in the room
          this.to(room.roomId).emit(
            'message',
            formatMessage(user.name, message)
          );
        } else {
          // not allowed chat
          this.emit('error', 'Chat bị cấm bởi host');
        }
      } else {
        // not exists participant
        this.emit('error', 'Thành viên không tồn tại, xin hãy kiểm tra lại');
      }
    } else {
      // not exist room
      this.emit('error', 'Phòng không tồn tại, xin hãy kiểm tra lại');
    }
  } catch (err) {
    // token not match
    this.emit('error', 'Access token không hợp lệ!');
  }
};

// receive event allow join room from server
module.exports.onAllowJoinRoom = async function (io, { userId, token }) {
  try {
    // verify token
    const { data: dataToken } = jwt.verify(token, process.env.JWT_SECRET);

    // get room with host
    const room = await Room.findOne({
      roomId: dataToken.roomId,
    })
      .populate('users')
      .populate('waitingRoom');
    if (room) {
      // get user of this socket and check user is host the room
      const host = room.getUser('id', dataToken.userId);
      if (host && host.host) {
        const user = room.allowJoinRoom(userId);
        if (user) {
          user.allowJoin = true;
          await user.save();
          // save room data
          await room.save();

          // generate token
          const token = jwt.sign(
            {
              data: { userId: user.id, roomId: room.roomId },
            },
            process.env.JWT_SECRET
          );

          // send token to client request join room
          io.to(user.socketId).emit('joinRoomSuccess', token);
        } else {
          this.emit('error', 'Thành viên này đã rời phòng chờ');
        }

        // send to host of this room info waiting room
        io.to(host.socketId).emit('changeWaitingRoom', {
          waitingRoom: room.getWaitingRoom(),
        });
      } else {
        this.emit('error', 'Bạn không phải host, bạn không có quyền này');
      }
    } else {
      this.emit('error', 'Phòng không tồn tại, hãy kiểm tra lại');
    }
  } catch (err) {
    // token not match
    this.emit('error', 'Access token không hợp lệ!');
  }
};

// receive event not allow join room from host client
module.exports.onNotAllowJoinRoom = async function (io, { userId, token }) {
  try {
    // verify token
    const { data: dataToken } = jwt.verify(token, process.env.JWT_SECRET);

    // get room join with host
    const room = await Room.findOne({
      roomId: dataToken.roomId,
    })
      .populate('users')
      .populate('waitingRoom');

    if (room) {
      // get user of this socket and check user is host the room
      const host = room.getUser('id', dataToken.userId);
      if (host && host.host) {
        const user = room.notAllowJoinRoom(userId);
        if (user) {
          // save room data
          await room.save();

          // remove user
          await User.deleteOne({ _id: user._id });

          // send token to client request join room
          io.to(user.socketId).emit(
            'joinRoomBlocked',
            'Yêu cầu tham gia phòng của bạn không được host chấp nhận!'
          );
        } else {
          this.emit('error', 'Thành viên này đã rời phòng chờ');
        }

        // send to host of this room info waiting room
        io.to(host.socketId).emit('changeWaitingRoom', {
          waitingRoom: room.getWaitingRoom(),
        });
      } else {
        this.emit('error', 'Bạn không phải host, bạn không có quyền này');
      }
    } else {
      this.emit('error', 'Phòng không tồn tại, hãy kiểm tra lại');
    }
  } catch (err) {
    // token not match
    this.emit('error', 'Access token không hợp lệ!');
  }
};

// receive info management of host room form client
module.exports.onChangeManagement = async function ({ token, value, status }) {
  try {
    // verify token
    const { data: dataToken } = jwt.verify(token, process.env.JWT_SECRET);

    // find the room join with host of this room
    const room = await Room.findOne({
      roomId: dataToken.roomId,
    }).populate('users');
    if (room) {
      // find user of this socket and check this user is host the room
      const host = room.getUser('id', dataToken.userId);
      if (host && host.host) {
        // user is host
        // manager room
        if (value === 'turnoff-chat') {
          // turn off chat and save room
          room.status.allowChat = !status;
          await room.save();

          // send info change manage from host
          this.to(room.roomId).emit('changeStatusRoom', {
            key: 'allowChat',
            value: room.status.allowChat,
          });
        } else if (value === 'lock-room') {
          // look the room
          if (status) {
            // change and save the room
            room.status.state = 'locked';
            await room.save();
          }
        } else if (value === 'open-room') {
          // open the room
          if (status) {
            // change and save the room
            room.status.state = 'open';
            await room.save();
          }
        } else if (value === 'waiting-room') {
          // set waiting the room
          if (status) {
            // change and save the room
            room.status.state = 'waiting';
            await room.save();
          }
        }
      } else {
        this.emit('error', 'Bạn không phải host, bạn không có quyền này');
      }
    } else {
      this.emit('error', 'Phòng không tồn tại, hãy kiểm tra lại');
    }
  } catch (err) {
    this.emit('error', 'Access token không hợp lệ, hãy kiểm tra lại');
  }
};

// receive info leave waiting room form client
module.exports.onLeaveWaitingRoom = async function (
  io,
  { typeLeave, roomId, userId }
) {
  // get the room
  const room = await Room.findOne({ roomId })
    .populate('users')
    .populate('waitingRoom');

  if (room) {
    if (typeLeave === 'self') {
      const user = room.removeUserInWaitingRoom(userId);
      if (user) {
        // save the room
        await room.save();

        // delete user
        await User.deleteOne({ _id: userId });

        // emit notify leave waiting room to client
        this.emit('leaveWaitingRoomComplete', 'OK');
      } else {
        this.emit('error', 'Thành viên không tồn tại, xin hãy kiểm tra lại');
      }
    }
    // find host of this room
    const host = room.getHost();
    if (host) {
      // send to host of this room info waiting room
      io.to(host.socketId).emit('changeWaitingRoom', {
        waitingRoom: room.getWaitingRoom(),
      });
    }
  } else {
    this.emit('error', 'Phòng không tồn tại, xin hãy kiểm tra lại');
  }
};

// receive event require disconnect from client
module.exports.onDisconnectRequest = function (reason) {
  // emit disconnect
  this.emit('disconnect', reason);
};

// disconnect
module.exports.onDisconnect = async function (io, reason) {
  // find user by socketId to find the room
  const user = await User.findOne({ socketId: this.id });
  if (user) {
    const room = await Room.findOne({ users: user._id })
      .populate('users')
      .populate('waitingRoom');

    if (room) {
      if (reason.typeLeave === 'self') {
        // self leave
        // remove user from this room
        room.removeUserById(user.id);
        await room.save();
        await User.deleteOne({ _id: user._id });

        // send message notify for remaining users in the room
        this.to(room.roomId).emit(
          'message',
          formatMessage(botName, `${user.name} đã rời phòng`)
        );

        // if not exists user in the room => delete this room
        if (room.users.length <= 0) {
          // get socketId of users in waiting room to notify for them
          const socketIdsWaitingRoom = room.getSocketIdWaitingRoom();

          // delete users in waiting room
          await User.deleteMany({ _id: { $in: room.waitingRoom } });
          // delete the room
          await Room.deleteOne({ roomId: room.roomId });

          // notify end room for user in waiting room
          socketIdsWaitingRoom.forEach((socketId) => {
            io.to(socketId).emit(
              'joinRoomBlocked',
              'Phòng bạn yêu cầu đã kết thúc chat!'
            );
          });
        } else {
          // update room info => send room info (name & users)
          this.to(room.roomId).emit('roomInfo', {
            nameRoom: room.roomId,
            users: room.getRoomUsersInfo(),
          });
        }
        // send message to client after disconnect
        this.emit('leaveComplete', 'OK');
      } else if (reason.typeLeave === 'all') {
        // check token
        try {
          const { data: dataToken } = jwt.verify(
            reason.token,
            process.env.JWT_SECRET
          );
          const host = room.getUser('id', dataToken.userId);
          if (host && host.host) {
            // get socketId of users in waiting room to notify for them
            const socketIdsWaitingRoom = room.getSocketIdWaitingRoom();

            // delete users in waiting room
            await User.deleteMany({ _id: { $in: room.waitingRoom } });

            // delete users in the room
            await User.deleteMany({ _id: { $in: room.users } });

            // delete the room
            await Room.deleteOne({ roomId: room.roomId });

            // notify end room for user in waiting room
            socketIdsWaitingRoom.forEach((socketId) => {
              io.to(socketId).emit(
                'joinRoomBlocked',
                'Phòng bạn yêu cầu đã kết thúc chat!'
              );
            });
            this.emit('leaveAllCompleteForHost', 'OK');
            this.to(room.roomId).emit('leaveAllComplete', 'OK');
          } else {
            this.emit('error', 'Bạn không phải host, bạn không có quyền này');
          }
        } catch (err) {
          this.emit('error', 'Access token không hợp lệ!');
        }
      } else if (reason.typeLeave === 'kicked') {
        // check token
        try {
          const { data: dataToken } = jwt.verify(
            reason.token,
            process.env.JWT_SECRET
          );
          const host = room.getUser('id', dataToken.userId);
          if (host && host.host) {
            // remove user in the room
            const user = room.removeUserById(reason.userId);

            if (user) {
              // save the room
              await room.save();

              // remove the user
              await User.deleteOne({ _id: user._id });

              // send message to user is kicked out the room
              io.to(user.socketId).emit('kickedOutRoom', 'OK');
            }

            // update room info => send room info (name & users)
            io.to(room.roomId).emit('roomInfo', {
              nameRoom: room.roomId,
              users: room.getRoomUsersInfo(),
            });
          } else {
            this.emit('error', 'Bạn không phải host, bạn không có quyền này');
          }
        } catch (err) {
          this.emit('error', 'Access token không hợp lệ!');
        }
      } else {
        // close page
        if (!user.allowJoin) {
          // remove user from this room
          room.removeUserById(user.id);
          await room.save();
          await User.deleteOne({ _id: user._id });

          // send message notify for remaining users in the room
          this.to(room.roomId).emit(
            'message',
            formatMessage(botName, `${user.name} đã rời phòng`)
          );
          // if not exists user in the room => delete this room
          if (room.users.length <= 0) {
            // get socketId of users in waiting room to notify for them
            const socketIdsWaitingRoom = room.getSocketIdWaitingRoom();

            // delete users in waiting room
            await User.deleteMany({ _id: { $in: room.waitingRoom } });
            // delete the room
            await Room.deleteOne({ roomId: room.roomId });

            // notify end room for user in waiting room
            socketIdsWaitingRoom.forEach((socketId) => {
              io.to(socketId).emit(
                'joinRoomBlocked',
                'Phòng bạn yêu cầu đã kết thúc chat!'
              );
            });
          } else {
            // update room info => send room info (name & users)
            this.to(room.roomId).emit('roomInfo', {
              nameRoom: room.roomId,
              users: room.getRoomUsersInfo(),
            });
          }
        }
      }
    } else {
      this.emit('error', 'Phòng không tồn tại, xin hãy kiểm tra lại');
    }
  } else {
    this.emit('error', 'Thành viên không tồn tại, xin hãy kiểm tra lại');
  }
};
