const Text = require('../models/Text')

// receive event join text from client
module.exports.onJoinText = async function ({ textId }) {
  if (textId && textId.match(/^[0-9a-fA-F]{24}$/)) {
    this.join(textId)

    const text = await Text.findById(textId)
    if (text) {
      console.log(text.data);
      this.emit('text-loadData', { data: text.data })
    }
  }
};

// receive event change text from client
module.exports.onTextChange = function ({ delta, textId }) {
  if (textId) {
    this.to(textId).emit('text-change-r', { delta });
  }
};

// receive event save text from client
module.exports.onTextSave = async function ({ data, textId }) {
  if (textId && textId.match(/^[0-9a-fA-F]{24}$/)) {
    await Text.findByIdAndUpdate(textId, { data })

    this.emit('text-saved')
  }
};
