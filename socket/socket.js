const mongoose = require('mongoose');

const roomController = require('./meeting-controller');

const formatMessage = require('../utils/message');

// connect mongodb
mongoose.connect(process.env.URI_MONGODB, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

const socket = function (io) {
  io.on('connection', (socket) => {
    // handle error
    socket.on('error', roomController.onError);

    // receive event create a room from client
    socket.on('createRoom', roomController.onCreateRoom);

    // receive event join to the room from client
    socket.on('joinRoom', function (data) {
      roomController.onJoinRoom.bind(this, io, data)();
    });

    // receive event joinChat from client
    socket.on('joinChat', function (data) {
      roomController.onJoinChat.bind(this, io, data)();
    });

    // receive event allow join room from server
    socket.on('allowJoinRoom', function (data) {
      roomController.onAllowJoinRoom.bind(this, io, data)();
    });

    // receive event not allow join room from host client
    socket.on('notAllowJoinRoom', function (data) {
      roomController.onNotAllowJoinRoom.bind(this, io, data)();
    });

    // receive message from client
    socket.on('messageChat', roomController.onMessageChat);

    // receive info management of host room form client
    socket.on('changeManagement', roomController.onChangeManagement);

    // receive info leave waiting room form client
    socket.on('leaveWaitingRoom', function (data) {
      roomController.onLeaveWaitingRoom.bind(this, io, data)();
    });

    // receive offer signal of stream
    socket.on('offerStream', function (data) {
      roomController.onOfferStream.bind(this, io, data)();
    });

    // receive offer signal of stream
    socket.on('answerStream', function (data) {
      roomController.onAnswerStream.bind(this, io, data)();
    });

    // receive signal stop video stream from a client
    socket.on('stopVideoStream', roomController.onStopVideoStream);

    // receive event require disconnect from client
    socket.on('disconnectRequest', roomController.onDisconnectRequest);

    // disconnect
    socket.on('disconnect', function (data) {
      roomController.onDisconnect.bind(this, io, data)();
    });

    // messenger
    // receive message from client
    socket.on('messengerChat', (data) => {
      socket.broadcast.emit(
        'messenger',
        formatMessage("Hải", data.message, "/images/oh-bot.jpg")
      );
    });

    // share screen
    // receive track stream share screen
    socket.on('shareScreenStream', (data) => {
      console.log(data);
      socket.broadcast.emit(
        'shareScreen',
        data
      );
    })
  });
};

module.exports = socket;