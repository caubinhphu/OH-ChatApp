const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const formatMessage = require('./utils/message');
const RoomManagement = require('./utils/RoomManagement');
const Room = require('./utils/Room');
const User = require('./utils/User');

// names bot
const botName = 'OH Bot';

// connect mongodb
mongoose.connect(process.env.URI_MONGODB, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

// models
const RoomX = require('./models/Room.model');
const UserX = require('./models/User.model');

// roomManagement
const roomManagement = new RoomManagement();

const socket = function (io) {
  io.on('connection', (socket) => {
    // handle error
    socket.on('error', (errorMsg) => {
      // console.log(errorMsg);
      socket.emit('errorMessage', errorMsg);
    });

    // receive event create a room from client
    socket.on('createRoom', async ({ roomId, password, hostname }) => {
      try {
        // create and save a new room
        const room = await RoomX.create({
          roomId,
          password,
        });

        // create and save a new user is host
        const host = await UserX.create({
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
    });

    // receive event join to the room from client
    socket.on('joinRoom', async ({ roomId, passRoom, username }) => {
      // find the room
      const room = await RoomX.findOne({ roomId });

      // check room exists?
      if (room) {
        // room exists
        // check password of room
        if (room.password === passRoom) {
          if (room.status.state === 'open') {
            try {
              // join successful
              // create and save a new user
              const user = await UserX.create({
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
              socket.emit('joinRoomSuccess', token);
            } catch (err) {
              socket.emit('error', err.message);
            }
          } else if (room.status.state === 'locked') {
            // room is locked
            socket.emit('error', 'Phòng đã bị host khóa, không thể tham gia');
          } else if (room.status.state === 'waiting') {
            // room is waiting
            // create and save a new user
            const user = await UserX.create({
              name: username,
              socketId: socket.id, // set socket id to send to client request when process allow join room
            });

            // add user to the waiting room
            room.waitingRoom.push(user._id);
            await room.save();

            // notify the host room of a change of waiting room
            // find host of this room
            const roomUpdate = await RoomX.findOne({ roomId })
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
            socket.emit('toWaitingRoom', {
              msg: 'Phòng đang ở chế độ phòng chờ, cần chờ host phê duyệt',
              roomId: room.roomId,
              userId: user.id,
            });
          }
        } else {
          // password not match
          // send message to client
          socket.emit(
            'error',
            'Mật khẩu phòng không đúng, xin hãy kiểm tra lại'
          );
        }
      } else {
        // room not exists
        socket.emit('error', 'Phòng không tồn tại, xin hãy kiểm tra lại');
      }
    });

    // receive event joinChat from client
    socket.on('joinChat', async ({ token }) => {
      // verify token
      try {
        // verify token
        const { data: dataToken } = jwt.verify(token, process.env.JWT_SECRET);

        // join socket (user) to the room
        socket.join(dataToken.roomId);

        // emit welcome room
        socket.emit(
          'message',
          formatMessage(botName, 'Chào mừng đến với OH chat')
        );

        // find the room join with users in the this room
        const room = await RoomX.findOne({
          roomId: dataToken.roomId,
        }).populate('users');
        if (room) {
          // find user of this socket to set socket
          const user = room.getUser('id', dataToken.userId);

          if (user) {
            // set socket chat for the user
            user.socketId = socket.id;
            await user.save();

            // broadcast emit join room
            socket
              .to(room.roomId)
              .broadcast.emit(
                'message',
                formatMessage(botName, `${user.name} đã tham gia vào phòng`)
              );

            // emit allowed chat to socket client
            socket.emit('changeStatusRoom', {
              key: 'allowChat',
              value: room.status.allowChat,
            });

            // update room info => send room info (name & users)
            io.to(room.roomId).emit('roomInfo', {
              nameRoom: room.roomId,
              users: room.getRoomUsersInfo(),
            });
            // send password of room if user is host
            if (user.host) {
              socket.emit('sendPasswordRoom', room.password);
            }
          } else {
            // not exists participant
            socket.emit(
              'error',
              'Thành viên không tồn tại, xin hãy kiểm tra lại'
            );
          }
        } else {
          // not exist room
          socket.emit('error', 'Phòng không tồn tại, xin hãy kiểm tra lại');
        }
      } catch (err) {
        // token not match
        socket.emit('error', 'Access token không hợp lệ!');
      }
    });

    // receive event allow join room from server
    socket.on('allowJoinRoom', async ({ userId, token }) => {
      try {
        // verify token
        const { data: dataToken } = jwt.verify(token, process.env.JWT_SECRET);

        // get room with host
        const room = await RoomX.findOne({
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
              socket.emit('error', 'Thành viên này đã rời phòng chờ');
            }

            // send to host of this room info waiting room
            io.to(host.socketId).emit('changeWaitingRoom', {
              waitingRoom: room.getWaitingRoom(),
            });
          } else {
            socket.emit('error', 'Bạn không phải host, bạn không có quyền này');
          }
        } else {
          socket.emit('error', 'Phòng không tồn tại, hãy kiểm tra lại');
        }
      } catch (err) {
        // token not match
        socket.emit('error', 'Access token không hợp lệ!');
      }
    });

    // receive event not allow join room from host client
    socket.on('notAllowJoinRoom', async ({ userId, token }) => {
      try {
        // verify token
        const { data: dataToken } = jwt.verify(token, process.env.JWT_SECRET);

        // get room join with host
        const room = await RoomX.findOne({
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
              await UserX.deleteOne({ _id: user._id });

              // send token to client request join room
              io.to(user.socketId).emit(
                'joinRoomBlocked',
                'Yêu cầu tham gia phòng của bạn không được host chấp nhận!'
              );
            } else {
              socket.emit('error', 'Thành viên này đã rời phòng chờ');
            }

            // send to host of this room info waiting room
            io.to(host.socketId).emit('changeWaitingRoom', {
              waitingRoom: room.getWaitingRoom(),
            });
          } else {
            socket.emit('error', 'Bạn không phải host, bạn không có quyền này');
          }
        } else {
          socket.emit('error', 'Phòng không tồn tại, hãy kiểm tra lại');
        }
      } catch (err) {
        // token not match
        socket.emit('error', 'Access token không hợp lệ!');
      }
    });

    // receive message from client
    socket.on('messageChat', async ({ token, message }) => {
      try {
        // verify token
        const { data: dataToken } = jwt.verify(token, process.env.JWT_SECRET);

        // find room join with users in this room
        const room = await RoomX.findOne({
          roomId: dataToken.roomId,
        }).populate({
          path: 'users',
        });

        if (room) {
          // find user send message
          const user = room.users.find((u) => u.id === dataToken.userId);
          if (user) {
            if (room.status.allowChat || user.host) {
              // send message to all user in the room
              io.to(room.roomId).emit(
                'message',
                formatMessage(user.name, message)
              );
            } else {
              // not allowed chat
              socket.emit('error', 'Chat bị cấm bởi host');
            }
          } else {
            // not exists participant
            socket.emit(
              'error',
              'Thành viên không tồn tại, xin hãy kiểm tra lại'
            );
          }
        } else {
          // not exist room
          socket.emit('error', 'Phòng không tồn tại, xin hãy kiểm tra lại');
        }
      } catch (err) {
        // token not match
        socket.emit('error', 'Access token không hợp lệ!');
      }
    });

    // receive info management of host room form client
    socket.on('changeManagement', async ({ token, value, status }) => {
      try {
        // verify token
        const { data: dataToken } = jwt.verify(token, process.env.JWT_SECRET);

        // find the room join with host of this room
        const room = await RoomX.findOne({
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
              socket.to(room.roomId).broadcast.emit('changeStatusRoom', {
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
            socket.emit('error', 'Bạn không phải host, bạn không có quyền này');
          }
        } else {
          socket.emit('error', 'Phòng không tồn tại, hãy kiểm tra lại');
        }
      } catch (err) {
        socket.emit('error', 'Access token không hợp lệ, hãy kiểm tra lại');
      }
    });

    // receive info leave waiting room form client
    socket.on('leaveWaitingRoom', async ({ typeLeave, roomId, userId }) => {
      // get the room
      const room = await RoomX.findOne({ roomId })
        .populate('users')
        .populate('waitingRoom');

      if (room) {
        if (typeLeave === 'self') {
          const user = room.removeUserInWaitingRoom(userId);
          if (user) {
            // save the room
            await room.save();

            // delete user
            await UserX.deleteOne({ _id: userId });

            // emit notify leave waiting room to client
            socket.emit('leaveWaitingRoomComplete', 'OK');
          } else {
            socket.emit(
              'error',
              'Thành viên không tồn tại, xin hãy kiểm tra lại'
            );
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
        socket.emit('error', 'Phòng không tồn tại, xin hãy kiểm tra lại');
      }
    });

    // receive event require disconnect from client
    socket.on('disconnectRequest', (reason) => {
      // emit disconnect
      socket.emit('disconnect', reason);
    });

    // disconnect
    socket.on('disconnect', async (reason) => {
      // find user by socketId to find the room
      const user = await UserX.findOne({ socketId: socket.id });
      if (user) {
        const room = await RoomX.findOne({ users: user._id })
          .populate('users')
          .populate('waitingRoom');

        if (room) {
          if (reason.typeLeave === 'self') {
            // self leave
            // remove user from this room
            room.removeUserById(user.id);
            await room.save();
            await UserX.deleteOne({ _id: user._id });

            // send message notify for remaining users in the room
            socket
              .to(room.id)
              .broadcast.emit(
                'message',
                formatMessage(botName, `${user.name} đã rời phòng`)
              );

            // if not exists user in the room => delete this room
            if (room.users.length <= 0) {
              // get socketId of users in waiting room to notify for them
              const socketIdsWaitingRoom = room.getSocketIdWaitingRoom();

              // delete users in waiting room
              await UserX.deleteMany({ _id: { $in: room.waitingRoom } });
              // delete the room
              await RoomX.deleteOne({ roomId: room.roomId });

              // notify end room for user in waiting room
              socketIdsWaitingRoom.forEach((socketId) => {
                io.to(socketId).emit(
                  'joinRoomBlocked',
                  'Phòng bạn yêu cầu đã kết thúc chat!'
                );
              });
            } else {
              // update room info => send room info (name & users)
              socket.to(room.roomId).broadcast.emit('roomInfo', {
                nameRoom: room.roomId,
                users: room.getRoomUsersInfo(),
              });
            }
            // send message to client after disconnect
            socket.emit('leaveComplete', 'OK');
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
                await UserX.deleteMany({ _id: { $in: room.waitingRoom } });

                // delete users in the room
                await UserX.deleteMany({ _id: { $in: room.users } });

                // delete the room
                await RoomX.deleteOne({ roomId: room.roomId });

                // notify end room for user in waiting room
                socketIdsWaitingRoom.forEach((socketId) => {
                  io.to(socketId).emit(
                    'joinRoomBlocked',
                    'Phòng bạn yêu cầu đã kết thúc chat!'
                  );
                });
                socket.emit('leaveAllCompleteForHost', 'OK');
                socket.to(room.roomId).broadcast.emit('leaveAllComplete', 'OK');
              } else {
                socket.emit(
                  'error',
                  'Bạn không phải host, bạn không có quyền này'
                );
              }
            } catch (err) {
              socket.emit('error', 'Access token không hợp lệ!');
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
                  await UserX.deleteOne({ _id: user._id });

                  // send message to user is kicked out the room
                  io.to(user.socketId).emit('kickedOutRoom', 'OK');
                }

                // update room info => send room info (name & users)
                io.to(room.roomId).emit('roomInfo', {
                  nameRoom: room.roomId,
                  users: room.getRoomUsersInfo(),
                });
              } else {
                socket.emit(
                  'error',
                  'Bạn không phải host, bạn không có quyền này'
                );
              }
            } catch (err) {
              socket.emit('error', 'Access token không hợp lệ!');
            }
          }
        } else {
          socket.emit('error', 'Phòng không tồn tại, xin hãy kiểm tra lại');
        }
      } else {
        socket.emit('error', 'Thành viên không tồn tại, xin hãy kiểm tra lại');
      }
    });
  });
};

module.exports = socket;
