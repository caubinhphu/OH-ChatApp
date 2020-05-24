const mongoose = require('mongoose');

const controller = require('./controller');

// connect mongodb
mongoose.connect(process.env.URI_MONGODB, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

const socket = function (io) {
  io.on('connection', (socket) => {
    // handle error
    socket.on('error', controller.onError);

    // receive event create a room from client
    socket.on('createRoom', controller.onCreateRoom);

    // receive event join to the room from client
    socket.on('joinRoom', function (data) {
      controller.onJoinRoom.bind(this, io, data)();
    });

    // receive event joinChat from client
    socket.on('joinChat', function (data) {
      controller.onJoinChat.bind(this, io, data)();
    });

    // receive event allow join room from server
    socket.on('allowJoinRoom', function (data) {
      controller.onAllowJoinRoom.bind(this, io, data)();
    });

    // receive event not allow join room from host client
    socket.on('notAllowJoinRoom', function (data) {
      controller.onNotAllowJoinRoom.bind(this, io, data)();
    });

    // receive message from client
    socket.on('messageChat', controller.onMessageChat);

    // receive info management of host room form client
    socket.on('changeManagement', controller.onChangeManagement);

    // receive info leave waiting room form client
    socket.on('leaveWaitingRoom', function (data) {
      controller.onLeaveWaitingRoom.bind(this, io, data)();
    });

    // receive offer signal of stream
    socket.on('offerStream', (data) => {
      console.log(data.receiveId || 'null');
      console.log(data.callerId || 'null');
      io.to(data.receiveId).emit('offerSignal', {
        callerId: data.callerId,
        signal: data.signal,
      });
    });

    // receive offer signal of stream
    socket.on('answerStream', (data) => {
      io.to(data.callerId).emit('answerSignal', {
        signal: data.signal,
        answerId: socket.id,
      });
    });

    // receive event require disconnect from client
    socket.on('disconnectRequest', controller.onDisconnectRequest);

    // disconnect
    socket.on('disconnect', function (data) {
      controller.onDisconnect.bind(this, io, data)();
    });
  });
};

module.exports = socket;
