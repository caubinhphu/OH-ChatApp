const mongoose = require('mongoose');

const messengerSchema = mongoose.Schema({
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
});

const Messenger = mongoose.model('Messenger', messengerSchema);

module.exports = Messenger;
