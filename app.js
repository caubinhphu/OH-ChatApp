require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');

// init server
const app = express();
const server = http.createServer(app);

// io
const io = require('socket.io')(server);

// port of server
const PORT = process.env.PORT || 3000;

// router
const chatRoute = require('./routers/chat.route');

// set public folder
app.use(express.static(path.join(__dirname, 'public')));

// set view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

const formatMessage = require('./utils/message');
const RoomManagement = require('./utils/RoomManagement');
const Room = require('./utils/Room');
const User = require('./utils/User');

// names bot
const botName = 'OH Bot';

// roomManagement
const roomManagement = new RoomManagement();

// handle socket
io.on('connection', (socket) => {
  // handle error
  socket.on('error', (errorMgs) => {
    // console.log(errorMgs);
    socket.emit('errorMessage', errorMgs);
  });

  // receive event create a room from client
  socket.on('createRoom', ({ idRoom, password, hostname }) => {
    // checked id room already not exists
    if (!roomManagement.isRoomExists(idRoom)) {
      // create a new room
      const roomChat = new Room(idRoom, password);
      roomManagement.addRoom(roomChat);

      // add host user to the room
      // generate id user
      let idUser = Math.round(Math.random() * 1e9)
        .toString()
        .padStart(9, '0');
      // create host user
      let user = new User(idUser, hostname, true);
      roomChat.addUser(user);

      // join socket (user) to the room
      // socket.join(roomChat.id);

      // generate jwt token
      let token = jwt.sign(
        { data: { idUser: user.id, idRoom: idRoom } },
        process.env.JWT_SECRET
      );
      // send token to client
      socket.emit('createRoomCompleted', token);
    } else {
      // room already exists
      // emit error -> handle error
      socket.emit('error', 'Phòng đã tồn tại, xin hãy tải lại trang!');
    }
  });

  // receive event join to the room from client
  socket.on('joinRoom', ({ idRoom, passRoom, username }) => {
    // find room
    const roomChat = roomManagement.getRoom(idRoom);

    // check room exists?
    if (roomChat) {
      // room exists
      // check password of room
      if (roomChat.password === passRoom) {
        if (roomChat.status === 'open') {
          // join successful
          // create new user
          // generate id user
          let idUser = Math.round(Math.random() * 1e9)
            .toString()
            .padStart(9, '0');
          let user = new User(idUser, username, false);
          roomChat.addUser(user);

          // join socket (user) to the room
          // socket.join(roomChat.id);

          // generate jwt token
          let token = jwt.sign(
            { data: { idUser: user.id, idRoom: idRoom } },
            process.env.JWT_SECRET
          );

          // send token to client
          socket.emit('joinRoomSuccess', token);
        } else if (roomChat.status === 'locked') {
          // room is locked
          socket.emit('error', 'Phòng đã bị host khóa, không thể tham gia');
        } else if (roomChat.status === 'waiting') {
          // room is waiting
          // create new user
          // generate id user
          let idUser = Math.round(Math.random() * 1e9)
            .toString()
            .padStart(9, '0');
          let user = new User(idUser, username, false);
          roomChat.addUserToWaitingRoom(user);

          console.log(roomChat);

          // emit notify to client
          socket.emit('toWaitingRoom', {
            mgs: 'Phòng đang ở chế độ phòng chờ, cần chờ host phê duyệt',
            idRoom: roomChat.id,
            idUser,
          });
        }
      } else {
        // password not match
        // send message to client
        socket.emit('error', 'Mật khẩu phòng không đúng, xin hãy kiểm tra lại');
      }
    } else {
      // room not exists
      // emit error -> handle error
      socket.emit('error', 'Phòng không tồn tại, xin hãy kiểm tra lại');
    }
  });

  // receive event joinChat from client
  socket.on('joinChat', ({ token }) => {
    // verify token
    try {
      // verify token
      let { data } = jwt.verify(token, process.env.JWT_SECRET);

      // join socket (user) to the room
      socket.join(data.idRoom);

      // emit welcome room
      socket.emit(
        'message',
        formatMessage(botName, 'Chào mừng đến với OH chat')
      );

      // find room
      const roomChat = roomManagement.getRoom(data.idRoom);
      if (roomChat) {
        // find user
        const user = roomChat.getUser(data.idUser);
        if (user) {
          user.socketId = socket.id;
          // broadcast emit join room
          socket
            .to(roomChat.id)
            .broadcast.emit(
              'message',
              formatMessage(botName, `${user.name} đã tham gia vào phòng`)
            );

          // emit allowed chat to socket client
          socket.emit('changeStatusRoom', {
            key: 'allowChat',
            value: roomChat.allowChat,
          });

          // update room info => send room info (name & users)
          io.to(roomChat.id).emit('roomInfo', {
            nameRoom: roomChat.id,
            users: roomChat.users,
          });

          // send password of room if user is host
          if (user.host) {
            socket.emit('sendPasswordRoom', roomChat.password);
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

  // receive message from client
  socket.on('messageChat', ({ token, message }) => {
    try {
      // verify token
      let { data } = jwt.verify(token, process.env.JWT_SECRET);

      // find room
      const roomChat = roomManagement.getRoom(data.idRoom);
      if (roomChat) {
        const user = roomChat.getUser(data.idUser);
        if (user) {
          if (roomChat.allowChat || user.host) {
            // send message to all user in the room
            io.to(roomChat.id).emit(
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
  socket.on('changeManagement', ({ token, value, status }) => {
    try {
      // verify token
      let { data } = jwt.verify(token, process.env.JWT_SECRET);

      // find room
      const roomChat = roomManagement.getRoom(data.idRoom);
      if (roomChat) {
        // find user
        const user = roomChat.getUser(data.idUser);
        if (user) {
          // check user is host
          if (user.host) {
            // manage room
            if (value === 'turnoff-chat') {
              // turn off chat
              roomChat.allowChat = !status;
              socket.to(roomChat.id).broadcast.emit('changeStatusRoom', {
                key: 'allowChat',
                value: roomChat.allowChat,
              });
            } else if (value === 'lock-room') {
              // look the room
              if (status) {
                roomChat.status = 'locked';
              }
            } else if (value === 'open-room') {
              // open the room
              if (status) {
                roomChat.status = 'open';
              }
            } else if (value === 'waiting-room') {
              // set waiting the room
              if (status) {
                roomChat.status = 'waiting';
              }
            }
          } else {
            socket.emit('error', 'Bạn không phải host, bạn không có quyền này');
          }
        } else {
          socket.emit('error', 'User không tồn tại, hãy kiểm tra lại');
        }
      } else {
        socket.emit('error', 'Phòng không tồn tại, hãy kiểm tra lại');
      }
    } catch (err) {
      socket.emit('error', 'Access token không hợp lệ, hãy kiểm tra lại');
    }
  });

  // receive info leave waiting room form client
  socket.on('leaveWaitingRoom', ({ typeLeave, idRoom, idUser }) => {
    // find the room
    const roomChat = roomManagement.getRoom(idRoom);
    if (roomChat) {
      if (typeLeave === 'self') {
        const user = roomChat.removeUserInWaitingRoom(idUser);
        if (user) {
          // emit notify leave waiting room to client
          socket.emit('leaveWaitingRoomComplete', 'OK');
        }
      }
    }
  });

  // receive event require disconnect from client
  socket.on('disconnectRequire', (reason) => {
    // emit disconnect
    socket.emit('disconnect', reason);
  });

  // disconnect
  socket.on('disconnect', (reason) => {
    // find room by user socketId
    const roomChat = roomManagement.findRoomIncludeUser(socket.id);
    if (roomChat) {
      if (reason.typeLeave === 'self') {
        // self leave
        // remove user from this room
        const user = roomChat.removeUser(socket.id);

        if (user) {
          // send message notify for remaining users in the room
          socket
            .to(roomChat.id)
            .broadcast.emit(
              'message',
              formatMessage(botName, `${user.name} đã rời phòng`)
            );

          // if not exists user in the room => delete this room
          if (roomChat.users.length <= 0) {
            roomManagement.removeRoom(roomChat.id);
          } else {
            // update room info => send room info (name & users)
            socket.to(roomChat.id).broadcast.emit('roomInfo', {
              nameRoom: roomChat.id,
              users: roomChat.users,
            });
          }
          // send message to client after disconnect
          socket.emit('leaveComplete', 'OK');
        }
      } else if (reason.typeLeave === 'all') {
        roomManagement.removeRoom(roomChat.id);
        socket.emit('leaveAllCompleteForHost', 'OK');
        socket.to(roomChat.id).broadcast.emit('leaveAllComplete', 'OK');
      }
    }
  });
});

// use router
app.use('/', chatRoute);

server.listen(PORT, () => console.log(`Server is running at port ${PORT}`));
