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
    default: 'text', // file, image
  },
  memberSendId: {
    type: mongoose.Types.ObjectId,
    ref: 'Member',
  }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
