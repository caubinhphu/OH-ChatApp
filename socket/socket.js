const mongoose = require('mongoose');

const roomController = require('./meeting-controller');
const messengerController = require('./messenger-controller');
const utilitiesController = require('./utilities-controller');

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

    // receive signal check can turn on mic from a client
    socket.on('checkCanTurnOnMic', roomController.onCheckCanTurnOnMic);

    // receive signal stop audio stream from a client
    socket.on('stopAudioStream', roomController.onStopAudioStream);

    // receive signal check can turn on video from a client
    socket.on('checkCanTurnOnVideo', roomController.onCheckCanTurnOnVideo);

    // receive signal stop video stream from a client
    socket.on('stopVideoStream', roomController.onStopVideoStream);

    // receive signal stop share screen stream from a client
    socket.on('stopShareScreenStream', roomController.onStopShareScreenStream);

    // receive signal check can share screen from a client
    socket.on('checkCanShareScreen', roomController.onCheckCanShareScreen);

    // receive signal begin share screen from a client
    socket.on('beginShareScreen', roomController.onBeginShareScreen);

    // receive signal check can record screen from a client
    socket.on('checkAllowRecord', roomController.onCheckAllowRecord);

    // receive signal raise hand from a client
    socket.on('raiseHand', function(data) {
      roomController.onRaiseHand.bind(this, io, data)()
    });

    // receive signal toggle allow communication from a client
    socket.on('toggleAllowCommunication', function(data) {
      roomController.onToggleAllowCommunication.bind(this, io, data)()
    });

    // receive event require disconnect from client
    socket.on('disconnectRequest', roomController.onDisconnectRequest);

    // disconnect
    socket.on('disconnect', function (data) {
      roomController.onDisconnect.bind(this, io, data)();
    });


    // ----------------- messenger ------------------
    // receive signal online from client
    socket.on('msg-memberOnline', function (data) {
      messengerController.onMemberOnline.bind(this, io, data)()
    })

    // receive message from client
    socket.on('msg-messageChat', function (data, callback) {
      messengerController.onMessageChat.bind(this, io, data, callback)()
    });

    // receive signal offer call peer of caller => send to receiver
    socket.on('msg-offerStream', function(data, callback) {
      messengerController.onOfferSignal.bind(this, io, data, callback)()
    })

    // receive signal answer call peer of receiver => send to caller
    socket.on('msg-answerStream', function(data) {
      messengerController.onAnswerSignal.bind(this, io, data)()
    })

    // receive signal connect peer fail
    socket.on('msg-connectPeerFail', function(data) {
      messengerController.onConnectPeerFail.bind(this, io, data)()
    })

    // receive signal refuse call from receiver
    socket.on('msg-refuseCall', function(data) {
      messengerController.onRefuseCall.bind(this, io, data)()
    })

    // receive signal call timeout
    socket.on('msg-callTimeout', function(data) {
      messengerController.onCallTimeout.bind(this, io, data)()
    })

    // receive signal has notification
    socket.on('msg-notification', function(data) {
      messengerController.onNotification.bind(this, io, data)()
    })

    // receive signal status read msg
    socket.on('msg-statusRead', function(data) {
      messengerController.onStatusRead.bind(this, io, data)()
    })

    // receive signal delete message from a client
    socket.on('msg-deleteMessage', function(data, callBack) {
      messengerController.onDeleteMessage.bind(this, io, data, callBack)()
    });

    // receive signal edit message from a client
    socket.on('msg-editMessage', function(data, callBack) {
      messengerController.onEditMessage.bind(this, io, data, callBack)()
    });

    // ------------------------ Text -----------------------------
    // receive event join text from client
    socket.on('join-text', utilitiesController.onJoinText)

    // receive event change text from client
    socket.on('text-change-s', utilitiesController.onTextChange)

    // receive event save text from client
    socket.on('text-save', utilitiesController.onTextSave)

    // receive event change text name from client
    socket.on('text-name-s', utilitiesController.onChangeTextName)
  });
};

module.exports = socket;