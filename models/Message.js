const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
  time: {
    type: Date,
    default: new Date(),
  },
  content: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'text', // [text, raw, image, video, audio, call-audio, call-audio-refuse, call-video, call-video-refuse]
  },
  externalModelType:{
    type: String,
    default: 'Member'
  },
  memberSendId: {
    type: mongoose.Types.ObjectId,
    refPath: 'externalModelType',
  },
  timeEndCall: Date,
  fileName: String
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
