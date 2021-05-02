const mongoose = require('mongoose')

const notificationSchema = mongoose.Schema({
  content: String,
  time: Date,
  link: String,
  image: String,
  isRead: {
    type: Boolean,
    default: false
  },
  memberId: {
    type: mongoose.Types.ObjectId,
    ref: 'Member'
  }
})

const Notification = mongoose.model('Notification', notificationSchema)

module.exports = Notification
