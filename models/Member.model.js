const mongoose = require('mongoose');

const memberSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  birthOfDate: {
    type: Date,
  },
  gender: {
    type: Boolean,
  },
  phone: {
    type: String,
  },
  address: {
    type: String,
  },
  avatar: {
    type: String,
    default: '/images/avatar-default.jpg',
  },
});

const Member = mongoose.model('Member', memberSchema);

module.exports = Member;
