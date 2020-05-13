const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    minlength: 9,
    maxlength: 9,
  },
  password: {
    type: String,
    required: true,
    minlength: 4,
    maxlength: 4,
  },
  status: {
    allowChat: {
      type: Boolean,
      default: true,
    },
    state: {
      type: String,
      default: 'open',
    },
  },
  users: [
    {
      type: mongoose.Types.ObjectId,
      ref: 'User',
    },
  ],
  waitingRoom: [
    {
      type: mongoose.Types.ObjectId,
      ref: 'User',
    },
  ],
});

roomSchema.methods.getHost = async function () {
  const hostId = this.users.find(async (userId) => {
    const user = await mongoose.model('User').findById(userId);
    if (user && user.host) {
      return true;
    }
    return false;
  });

  return await mongoose.model('User').findById(hostId);
};

roomSchema.methods.getUser = async function () {
  const userId = this.users.find(async (userId) => {
    const user = await mongoose.model('User').findById(userId);
    if (user && user.host) {
      return true;
    }
    return false;
  });

  return await mongoose.model('User').findById(hostId);
};

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
