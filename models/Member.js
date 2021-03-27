const mongoose = require('mongoose');

const memberSchema = mongoose.Schema({
  email: {
    type: String,
    default: '',
  },
  password: {
    type: String,
    default: '',
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
  verifyToken: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'local',
  },
  OAuthId: {
    type: String,
    default: '',
  },
  friends: [{
    _id: {
      type: mongoose.Types.ObjectId,
      ref: 'Member',
    },
    groupMessageId: {
      type: mongoose.Types.ObjectId,
      ref: 'GroupMessage',
    },
  }, ],
  socketId: {
    type: String,
    default: ''
  },
  // newEmail: {
  //   type: String,
  //   default: '',
  // },
  status: {
    // type: 'online' or time text latest online
    type: String,
    default: '1969-12-31T17:00:00.000Z',
  },
  isCalling: {
    type: Boolean,
    default: false
  },
  url: {
    type: String,
    default: ''
  }
});

// get all friends
memberSchema.methods.getFriends = function () {
  return this.friends.map((friend) => {
    console.log(friend);
    return {
      id: friend._id.id,
      name: friend._id.name,
      avatar: friend._id.avatar,
      status: friend._id.status,
      url: friend._id.url,
    }
  });
};

// get all friends have message
memberSchema.methods.getFriendsHaveMessage = function () {
  return this.friends.map((friend) => {
    // console.log(friend.groupMessageId);
    return {
      id: friend._id.id,
      url: friend._id.url,
      name: friend._id.name,
      avatar: friend._id.avatar,
      status: friend._id.status,
      messages: friend.groupMessageId.messages
    }
  });
};

const Member = mongoose.model('Member', memberSchema);

module.exports = Member;