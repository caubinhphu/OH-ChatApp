const mongoose = require('mongoose');

const groupMessengerSchema = mongoose.Schema({
  messengers: [
    {
      type: mongoose.Types.ObjectId,
      ref: 'Messenger',
    },
  ],

  // mã bảo vệ????
});

const GroupMember = mongoose.model('GroupMember', groupMessengerSchema);

module.exports = GroupMember;
