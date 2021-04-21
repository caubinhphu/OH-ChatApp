const mongoose = require('mongoose')

const messageSchema = mongoose.Schema({
  data: Object,
  authorId: {
    type: mongoose.Types.ObjectId,
    ref: 'Member'
  }
})

const Text = mongoose.model('Text', messageSchema)

module.exports = Text
