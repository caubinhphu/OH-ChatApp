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
    default: 'text', // [text, file, image, video, call-audio, call-audio-refuse, call-video, call-video-refuse]
  },
  memberSendId: {
    type: mongoose.Types.ObjectId,
    ref: 'Member',
  },
  timeEndCall: Date
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
