const mongoose = require('mongoose');

const groupMessageSchema = mongoose.Schema({
  messages: [
    {
      type: mongoose.Types.ObjectId,
      ref: 'Message',
    }
  ],

  // mã bảo vệ????
});

const GroupMessage = mongoose.model('GroupMessage', groupMessageSchema);

module.exports = GroupMessage;