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
    default: new Date('1/1/1970'),
  },
  gender: {
    type: Boolean,
    default: true,
  },
  phone: {
    type: String,
    default: '',
  },
  address: {
    type: String,
    default: '',
  },
  avatar: {
    type: String,
    default: '/images/default-avatar.jpg',
  },
  active: {
    type: Boolean,
    default: false,
  },
});

const Member = mongoose.model('Member', memberSchema);

module.exports = Member;
