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
  timeLeave: Date,
  raiseHand: {
    type: Boolean,
    default: false
  },
  allowCommunication: {
    type: Boolean,
    default: true
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
