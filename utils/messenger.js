const moment = require('moment');

const formatMsg = function (msg, sender, receiver) {
  const msgFormat = {
    id: msg._id,
    content: msg.content,
    avatar: '',
    time: '',
    me: true,
    name: ''
  }
  const timeDate = moment(msg.time).date()
  const nowDate = moment().date()

  if (nowDate - timeDate <= 0) {
    msgFormat.time = moment(msg.time).format('H:mm')
  } else if (nowDate - timeDate === 1) {
    msgFormat.time = 'Hôm qua: ' + moment(msg.time).format('H:mm')
  } else {
    msgFormat.time = moment(msg.time).format('DD/MM/YYYY H:mm')
  }
  if (msg.memberSendId.toString() !== sender.id) {
    msgFormat.me = false
    msgFormat.avatar = receiver.avatar
    msgFormat.name = receiver.name
  }
  return msgFormat
}

// format message list => return [{id, content, time, avatar, me, name}]
const formatMessageList = function (messages, sender, receiver) {
  return messages.map(msg => {
    return formatMsg(msg, sender, receiver)
  }).sort((a, b) => {
    return a.id.getTimestamp() - b.id.getTimestamp()
  })
};

module.exports.formatMessageList = formatMessageList
module.exports.formatMsg = formatMsg