const express = require('express');
const path = require('path');
const http = require('http');

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
  socket.on('joinRoom', ({ username, room }) => {
    // check room exists?
    if (!roomManagement.isRoomExists(room)) {
      // room not exists
      roomManagement.addRoom(new Room(room));
    }

    // find room by socket room
    const roomChat = roomManagement.getRoom(room);

    // add user to room
    roomChat.addUser(new User(socket.id, username));

    // join socket (user) to the room
    socket.join(roomChat.name);

    // emit welcome room
    socket.emit('message', formatMessage(botName, 'Chào mừng đến với OH chat'));

    // broadcast emit join room
    socket
      .to(roomChat.name)
      .broadcast.emit(
        'message',
        formatMessage(botName, `${username} đã tham gia vào phòng`)
      );

    // update room info => send room info (name & users)
    io.to(roomChat.name).emit('roomInfo', {
      nameRoom: roomChat.name,
      users: roomChat.users,
    });
  });

  // receive message from client
  socket.on('messageChat', (message) => {
    // find room by user id
    const roomChat = roomManagement.findRoomIncludeUser(socket.id);
    // find user by the room
    const user = roomChat.getUser(socket.id);

    // send message to all user in the room
    io.to(roomChat.name).emit('message', formatMessage(user.name, message));
  });

  // disconnect
  socket.on('disconnect', () => {
    // find room by user id
    const roomChat = roomManagement.findRoomIncludeUser(socket.id);
    if (roomChat) {
      // remove user from this room
      const user = roomChat.removeUser(socket.id);
      if (user) {
        // send message notify for remaining users in the room
        socket
          .to(roomChat.name)
          .broadcast.emit(
            'message',
            formatMessage(botName, `${user.name} đã rời phòng`)
          );

        // if not exists user in the room => delete this room
        if (roomChat.users.length <= 0) {
          roomManagement.removeRoom(roomChat.name);
        } else {
          // update room info => send room info (name & users)
          io.to(roomChat.name).emit('roomInfo', {
            nameRoom: roomChat.name,
            users: roomChat.users,
          });
        }
      }
    }
  });
});

// use router
app.use('/', chatRoute);

server.listen(PORT, () => console.log(`Server is running at port ${PORT}`));
