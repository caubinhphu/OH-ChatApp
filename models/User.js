const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  host: {
    type: Boolean,
    default: false,
  },
  socketId: {
    type: String,
    default: '',
  },
  userType: {
    type: String,
    default: 'session',
  },
  allowJoin: {
    type: Boolean,
    default: false,
  },
  avatar: {
    type: String,
    default: '/images/default-avatar.jpg',
  },
  timeJoin: Date,
  timeLeave: Date
});

const User = mongoose.model('User', userSchema);

module.exports = User;
