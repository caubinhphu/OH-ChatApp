const mongoose = require('mongoose')

const textSchema = mongoose.Schema({
  data: Object,
  authorId: {
    type: mongoose.Types.ObjectId,
    ref: 'Member'
  }
})

const Text = mongoose.model('Text', textSchema)

module.exports = Text
