const jwt = require('jsonwebtoken');
const path = require('path');

const formatMessage = require('../utils/message');

// models
const Room = require('../models/Room');
const User = require('../models/User');
const Member = require('../models/Member');
const Message = require('../models/Message');

const cloudinary = require('../utils/cloudinary');

// names bot
const botName = 'OH Bot';
const botAvatar = '/images/oh-bot.jpg';

const hasErr = 'Có lỗi xảy ra'

// handle error
module.exports.onError = function (errorMsg) {
  this.emit('errorMessage', errorMsg);
};

// receive event create a room from client
module.exports.onCreateRoom = async function ({
  roomId,
  password,
  hostname,
  memberId,
}) {
  try {
    // create and save a new room
    const room = await Room.create({
      roomId,
      password,
      timeStart: new Date()
    });

    if (memberId === '') {
      memberId = null;
    }
    // get member logged in
    const member = await Member.findById(memberId);

    // create and save a new user is host
    let host = null;
    // check member exists or not logged in
    if (member) {
      host = await User.create({
        name: hostname,
        host: true,
        avatar: member.avatar,
        userType: 'member',
      });
    } else {
      host = await User.create({
        name: hostname,
        host: true,
      });
    }

    // add host in the room
    room.users.push(host._id);
    await room.save();

    // generate jwt token
    const token = jwt.sign(
      { data: { userId: host.id, roomId } },
      process.env.JWT_SECRET
    );

    // send token to client
    this.emit('createRoomCompleted', { token, roomId });
  } catch (err) {
    this.emit('error', 'Phòng đã tồn tại, xin hãy tải lại trang!');
  }
};

// receive event join to the room from client
module.exports.onJoinRoom = async function (
  io,
  { roomId, passRoom, username, memberId }
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
          let user = null;
          if (memberId === '') {
            memberId = null;
          }
          const member = await Member.findById(memberId);
          if (member) {
            user = await User.create({
              name: username,
              userType: 'member',
              avatar: member.avatar,
            });
          } else {
            user = await User.create({
              name: username,
            });
          }

          // add the new user to the room
          room.users.push(user._id);
          await room.save();

          // generate jwt token
          const token = jwt.sign(
            { data: { userId: user.id, roomId } },
            process.env.JWT_SECRET
          );

          // send token to client
          this.emit('joinRoomSuccess', { token, roomId });
        } catch (err) {
          this.emit('error', err.message);
        }
      } else if (room.status.state === 'locked') {
        // room is locked
        this.emit('error', 'Phòng đã bị chủ phòng khóa, không thể tham gia');
      } else if (room.status.state === 'waiting') {
        // room is waiting
        // create and save a new user
        let user = null;
        const member = await Member.findById(memberId || null);
        if (member) {
          user = await User.create({
            name: username,
            socketId: this.id, // set socket id to send to client request when process allow join room
            avatar: member.avatar,
          });
        } else {
          user = await User.create({
            name: username,
            socketId: this.id, // set socket id to send to client request when process allow join room
          });
        }

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
          msg: 'Phòng đang ở chế độ phòng chờ, cần chờ chủ phòng phê duyệt',
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
          formatMessage(botName + ' - Join', 'Chào mừng đến với OH chat', botAvatar)
        );

        // set socket chat for the user
        user.socketId = this.id;
        user.allowJoin = false;
        user.timeJoin = new Date()
        await user.save();

        // broadcast emit join room
        this.to(room.roomId).emit(
          'message',
          formatMessage(
            botName + ' - Join',
            `${user.name} đã tham gia vào phòng`,
            botAvatar
          )
        );

        // emit allowed chat to socket client
        this.emit('changeStatusRoom', {
          key: 'allowChat',
          value: room.status.allowChat,
        });

        // update room info => send room info (name & password & users)
        io.to(room.roomId).emit('roomInfo', {
          nameRoom: room.roomId,
          password: room.password,
          users: room.getRoomUsersInfo(),
        });

        // send userId(socketId) exclude this socket
        this.emit('roomInfoForStream', {
          nameRoom: room.roomId,
          users: room
            .getRoomUsersInfo()
            // .filter((user) => user.socketId !== this.id)
            .map((user) => {
              return { id: user.socketId, avatar: user.avatar, name: user.name };
            }),
        });

        // send password and manager item of room if user is host
        if (user.host) {
          // this.emit('sendPasswordRoom', room.password);
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
module.exports.onMessageChat = async function ({ token, message, type, nameFile, resourceType }) {
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
          const msgFormatted = formatMessage(user.name, message, user.avatar)
          if (type === 'file') {
            msgFormatted.type = 'file'
            msgFormatted.nameFile = nameFile
          }
          this.to(room.roomId).emit('message', msgFormatted);
          const msg = await Message.create({
            time: new Date(),
            content: msgFormatted.message,
            externalModelType: 'User',
            memberSendId: user._id,
            type: type === 'file' ? resourceType : 'text'
          })

          room.messages.push(msg._id)
          await room.save()
        } else {
          // not allowed chat
          this.emit('error', 'Trò chuyện bị cấm bởi chủ phòng');
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
          const tokenJoin = jwt.sign(
            {
              data: { userId: user.id, roomId: room.roomId },
            },
            process.env.JWT_SECRET
          );

          // send token to client request join room
          io.to(user.socketId).emit('joinRoomSuccess', { token: tokenJoin, room: room.roomId });
        } else {
          this.emit('error', 'Thành viên này đã rời phòng chờ');
        }

        // send to host of this room info waiting room
        io.to(host.socketId).emit('changeWaitingRoom', {
          waitingRoom: room.getWaitingRoom(),
        });
      } else {
        this.emit('error', 'Bạn không phải chủ phòng, bạn không có quyền này');
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
            'Yêu cầu tham gia phòng của bạn không được chủ phòng chấp nhận!'
          );
        } else {
          this.emit('error', 'Thành viên này đã rời phòng chờ');
        }

        // send to host of this room info waiting room
        io.to(host.socketId).emit('changeWaitingRoom', {
          waitingRoom: room.getWaitingRoom(),
        });
      } else {
        this.emit('error', 'Bạn không phải chủ phòng, bạn không có quyền này');
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
        } else if (value === 'turnoff-mic') {
          // turn off mic and save room
          room.status.allowMic = !status;
          await room.save();

          // send info change manage from host
          this.to(room.roomId).emit('changeStatusRoom', {
            key: 'allowMic',
            value: room.status.allowMic,
          });
        } else if (value === 'turnoff-video') {
          // turn off chat and save room
          room.status.allowVideo = !status;
          await room.save();

          // send info change manage from host
          this.to(room.roomId).emit('changeStatusRoom', {
            key: 'allowVideo',
            value: room.status.allowVideo,
          });
        } else if (value === 'turnoff-share') {
          // turn off chat and save room
          room.status.allowShare = !status;
          await room.save();

          // send info change manage from host
          this.to(room.roomId).emit('changeStatusRoom', {
            key: 'allowShare',
            value: room.status.allowShare,
          });
        } else if (value === 'turnoff-rec') {
          // turn off chat and save room
          room.status.allowRec = !status;
          await room.save();

          // send info change manage from host
          this.to(room.roomId).emit('changeStatusRoom', {
            key: 'allowRec',
            value: room.status.allowRec
          });
        }
      } else {
        this.emit('error', 'Bạn không phải chủ phòng, bạn không có quyền này');
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

// receive offer signal of stream
module.exports.onOfferStream = function (io, data) {
  io.to(data.receiveId).emit('offerSignal', {
    callerId: data.callerId,
    avatarCaller: data.avatar,
    callerName: data.callerName,
    signal: data.signal,
  });
};

// receive offer signal of stream
module.exports.onAnswerStream = function (io, data) {
  io.to(data.callerId).emit('answerSignal', {
    signal: data.signal,
    answerId: this.id,
  });
};

// receive signal stop video stream from a client
module.exports.onStopVideoStream = async function () {
  try {
    const user = await User.findOne({ socketId: this.id });
    if (user) {
      const room = await Room.findOne({ users: user._id });
      if (room) {
        this.to(room.roomId).broadcast.emit('stopVideo', this.id);
      }
    }
  } catch (error) {
    this.emit('error', hasErr);
  }
};

// receive signal stop audio stream from a client
module.exports.onStopAudioStream = async function () {
  try {
    const user = await User.findOne({ socketId: this.id });
    if (user) {
      const room = await Room.findOne({ users: user._id });
      if (room) {
        this.to(room.roomId).broadcast.emit('stopAudio', this.id);
      }
    }
  } catch (error) {
    this.emit('error', hasErr);
  }
};

// receive signal check can turn on mic from a client
module.exports.onCheckCanTurnOnMic = async function () {
  try {
     const user = await User.findOne({ socketId: this.id });
    if (user) {
      const room = await Room.findOne({ users: user._id });
      if (room) {
        if (user.host || (room.status.allowMic  && user.allowCommunication)) {
          this.emit('isCanTurnOnMic', { allowMic: true });
        } else {
          this.emit('isCanTurnOnMic', { allowMic: false })
        }
      }
    }
  } catch (error) {
    this.emit('error', hasErr);
  }
};

// receive signal check can turn on video from a client
module.exports.onCheckCanTurnOnVideo = async function () {
  try {
     const user = await User.findOne({ socketId: this.id });
    if (user) {
      const room = await Room.findOne({ users: user._id });
      if (room) {
        if (user.host || (room.status.allowVideo && user.allowCommunication)) {
          this.emit('isCanTurnOnVideo', { allowVideo: true });
        } else {
          this.emit('isCanTurnOnVideo', { allowVideo: false })
        }
      }
    }
  } catch (error) {
    this.emit('error', hasErr);
  }
};

// receive signal check can share screen from a client
module.exports.onCheckCanShareScreen = async function () {
  try {
     const user = await User.findOne({ socketId: this.id });
    if (user) {
      const room = await Room.findOne({ users: user._id });
      if (room) {
        if (room.status.isShareScreen) {
          this.emit('isCanShareScreen', { isShareScreen: true });
        } else if (user.host || (room.status.allowShare && user.allowCommunication)) {
          this.emit('isCanShareScreen', { isShareScreen: false });
        } else {
          this.emit('isCanShareScreen', { isShareScreen: true, unAllowShare: true })
        }
      }
    }
  } catch (error) {
    this.emit('error', hasErr);
  }
};

// receive signal begin share screen from a client
module.exports.onBeginShareScreen = async function () {
  try {
    const user = await User.findOne({ socketId: this.id });
    if (user) {
      const room = await Room.findOne({ users: user._id });
      if (room) {
        room.status.isShareScreen = true;
        await room.save();
      }
    }
  } catch (error) {
    this.emit('error', hasErr);
  }
};

// receive signal stop share screen stream from a client
module.exports.onStopShareScreenStream = async function () {
  try {
    const user = await User.findOne({ socketId: this.id });
    if (user) {
      const room = await Room.findOne({ users: user._id });
      if (room) {
        this.to(room.roomId).broadcast.emit('stopShareScreen', this.id);
        room.status.isShareScreen = false;
        await room.save();
      }
    }
  } catch (error) {
    this.emit('error', hasErr);
  }
};

// receive signal check can record screen from a client
module.exports.onCheckAllowRecord = async function () {
  try {
    const user = await User.findOne({ socketId: this.id });
    if (user) {
      const room = await Room.findOne({ users: user._id });
      if (room) {
        if (user.host || (room.status.allowRec && user.allowCommunication)) {
          this.emit('resultCheckRecord', { canRec: true })
        } else {
          this.emit('resultCheckRecord', { canRec: false })
        }
      }
    }
  } catch (error) {
    this.emit('error', hasErr);
  }
};

// receive signal check can record screen from a client
module.exports.onRaiseHand = async function (io, { raise }) {
  try {
    const user = await User.findOne({ socketId: this.id });
    if (user) {
      const room = await Room.findOne({ users: user._id }).populate('users');
      if (room) {
        const userInRoom = room.users.find(u => u.id.toString() === user.id.toString())
        if (userInRoom) {
          userInRoom.raiseHand = raise
          await userInRoom.save()

          io.to(room.roomId).emit('roomInfoUsers', {
            users: room.getRoomUsersInfo()
          });

          if (raise) {
            this.to(room.roomId).emit('hasRaiseHand', { name: user.name });
          }
        }
      }
    }
  } catch (error) {
    this.emit('error', hasErr);
  }
};

// receive signal toggle allow communication from a client
module.exports.onToggleAllowCommunication = async function (io, { userId, isAllow }) {
  try {
    const user = await User.findById(userId);
    if (user && typeof isAllow === 'boolean') {
      const room = await Room.findOne({ users: user._id }).populate('users');
      if (room) {
        user.allowCommunication = isAllow
        await user.save()

        io.to(user.socketId).emit('changeAllowCommunication', { isAllow })
      }
    }
  } catch (error) {
    this.emit('error', hasErr);
  }
};

// receive event require disconnect from client
module.exports.onDisconnectRequest = function (reason) {
  // emit disconnect
  this.emit('disconnect', reason);
};

// disconnect
module.exports.onDisconnect = async function (io, reason) {
  // console.log('disconnect', this.id);

  // check is member
  const member = await Member.findOne({ socketId: this.id }).populate('friends._id');
  if (member) {
    // set offline for member
    member.socketId = ''
    member.status = new Date().toISOString()
    member.isCalling = false

    await member.save()

    // send signal offline to friends are online
    member.friends.forEach(fr => {
      if (fr._id.status === 'online' && fr._id.socketId) {
        io.to(fr._id.socketId).emit('msg-friendOffline', { memberId: member.id });
      }
    })
  } else {
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
          // room.removeUserById(user.id);

          const userInRoom = room.users.find(u => u.id.toString() === user.id.toString())
          if (userInRoom) {
            userInRoom.timeLeave = new Date()
            userInRoom.save()
          }
          // user.timeLeave = new Date()
          // await user.save()

          // await User.deleteOne({ _id: user._id });
          // send message notify for remaining users in the room
          this.to(room.roomId).emit(
            'message',
            formatMessage(botName + ' - Leave', `${user.name} đã rời phòng`, botAvatar)
          );

          if (room.users.some(u => !u.timeLeave && u.id.toString() !== user.id.toString())) {
            // update room info => send room info (name & password & users)
            this.to(room.roomId).emit('roomInfo', {
              nameRoom: room.roomId,
              password: room.password,
              users: room.getRoomUsersInfo(),
            });

            this.to(room.roomId).broadcast.emit('infoLeaveRoomForStream', {
              userId: user.socketId,
            });
          } else {
            // delete the room
            await Room.deleteOne({ roomId: room.roomId });

            // if not exists user in the room => delete this room
            // get socketId of users in waiting room to notify for them
            const socketIdsWaitingRoom = room.getSocketIdWaitingRoom();

            // delete users in waiting room
            await User.deleteMany({ _id: { $in: room.waitingRoom } });
            // delete users in room
            await User.deleteMany({ _id: { $in: room.users } });

            // delete file upload
            await removeFileUpload(room.messages)

            // delete messages in room
            await Message.deleteMany({ _id: { $in: room.messages } });

            // notify end room for user in waiting room
            socketIdsWaitingRoom.forEach((socketId) => {
              io.to(socketId).emit(
                'joinRoomBlocked',
                'Phòng bạn yêu cầu đã kết thúc chat!'
              );
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
              // delete the room
              await Room.deleteOne({ roomId: room.roomId });

              // get socketId of users in waiting room to notify for them
              const socketIdsWaitingRoom = room.getSocketIdWaitingRoom();

              // delete users in waiting room
              await User.deleteMany({ _id: { $in: room.waitingRoom } });

              // delete users in the room
              await User.deleteMany({ _id: { $in: room.users } });

              // delete file upload
              await removeFileUpload(room.messages)

              // delete messages in room
              await Message.deleteMany({ _id: { $in: room.messages } });

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
              this.emit('error', 'Bạn không phải chủ phòng, bạn không có quyền này');
            }
          } catch (err) {
            // console.log(err);
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
              // const user = room.removeUserById(reason.userId);
              // const userBeKick = await User.findById(reason.userId)
              const userBeKick = room.users.find(u => u.id.toString() === reason.userId.toString())
              // if (userBeKick) {
              //   userBeKick.timeLeave = new Date()
              //   userBeKick.save()
              // }

              if (userBeKick) {
                // save the room
                // await room.save();
                userBeKick.timeLeave = new Date()
                await userBeKick.save()

                // remove the user
                // await User.deleteOne({ _id: userBeKick._id });

                // send message to user is kicked out the room
                io.to(userBeKick.socketId).emit('kickedOutRoom', 'OK');

                this.to(room.roomId).emit(
                  'message',
                  formatMessage(botName + ' - Leave', `${userBeKick.name} đã rời phòng`, botAvatar)
                );
                this.emit('message', formatMessage(botName + ' - Leave', `${userBeKick.name} đã rời phòng`, botAvatar))
              }

              // update room info => send room info (name & password & users)
              io.to(room.roomId).emit('roomInfo', {
                nameRoom: room.roomId,
                password: room.password,
                users: room.getRoomUsersInfo(),
              });

              io.to(room.roomId).emit('infoLeaveRoomForStream', {
                userId: userBeKick.socketId,
              });
            } else {
              this.emit('error', 'Bạn không phải chủ phòng, bạn không có quyền này');
            }
          } catch (err) {
            this.emit('error', 'Access token không hợp lệ!');
          }
        } else {
          // close page
          if (!user.allowJoin && !user.timeLeave) {
            // remove user from this room
            // room.removeUserById(user.id);
            // await room.save();
            // await User.deleteOne({ _id: user._id });
            const userInRoom = room.users.find(u => u.id.toString() === user.id.toString())
            userInRoom.timeLeave = new Date()
            await userInRoom.save()

            // send message notify for remaining users in the room
            this.to(room.roomId).emit(
              'message',
              formatMessage(botName + ' - Leave', `${user.name} đã rời phòng`, botAvatar)
            );
            // if not exists user in the room => delete this room
            if (room.users.some(u => !u.timeLeave && u.id.toString() !== user.id.toString())) {
              // update room info => send room info (name & password & users)
               this.to(room.roomId).emit('roomInfo', {
                nameRoom: room.roomId,
                password: room.password,
                users: room.getRoomUsersInfo(),
              });
              this.to(room.roomId).broadcast.emit('infoLeaveRoomForStream', {
                userId: user.socketId,
              });
            } else {
              // delete the room
              await Room.deleteOne({ roomId: room.roomId });

              // get socketId of users in waiting room to notify for them
              const socketIdsWaitingRoom = room.getSocketIdWaitingRoom();

              // delete users in waiting room
              await User.deleteMany({ _id: { $in: room.waitingRoom } });

              // delete users in room
              await User.deleteMany({ _id: { $in: room.users } });

              // delete file upload
              await removeFileUpload(room.messages)

              // delete messages in room
              await Message.deleteMany({ _id: { $in: room.messages } });

              // notify end room for user in waiting room
              socketIdsWaitingRoom.forEach((socketId) => {
                io.to(socketId).emit(
                  'joinRoomBlocked',
                  'Phòng bạn yêu cầu đã kết thúc chat!'
                );
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
  }
};

async function removeFileUpload(messageIds) {
  try {
    // delete file upload
    const messageFiles = await Message.find({ _id: { $in: messageIds }, type: { $in: ['raw', 'image', 'video'] } })
    if (messageFiles) {
      const publicIds = {
        resRaws: [],
        resImages: [],
        resVideos: []
      }

      messageFiles.forEach(msg => {
        const id = msg.content.match(/room.*$/g)
        if (id) {
          if (msg.type === 'raw') {
            publicIds.resRaws.push('ohchat/upload/' + id[0])
          } else if (msg.type === 'image') {
            publicIds.resImages.push('ohchat/upload/' + path.basename(id[0], path.extname(id[0])))
          } else if (msg.type === 'video' || msg.type === 'audio') {
            publicIds.resVideos.push('ohchat/upload/' + path.basename(id[0], path.extname(id[0])))
          }
        }
      })
      await cloudinary.deleteResources(publicIds)
    }
  } catch (error) {
    return error
  }
}
