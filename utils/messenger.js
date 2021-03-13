const moment = require('moment');

/**
 * Function format message
 * @param {object} msg Message
 * @param {object} me Me Document
 * @param {object} friend Friend Document
 * @returns message be format
 */
const formatMsg = function (msg, me, friend) {
  const msgFormat = {
    id: msg._id,
    content: msg.content,
    avatar: '',
    time: '',
    me: true,
    name: '',
    class: ''
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
  if (msg.memberSendId.toString() !== me.id) {
    msgFormat.me = false
    msgFormat.avatar = friend.avatar
    msgFormat.name = friend.name
  }

  if (msg.type === 'call-audio') {
    if (msg.memberSendId.toString() !== me.id) {
      msgFormat.content = 'Cuộc gọi đến'
      msgFormat.class = 'call-msg call-incoming'
    } else {
      msgFormat.content = 'Cuộc gọi đi'
      msgFormat.class = 'call-msg call-outgoing'
    }
  } else if (msg.type === 'call-audio-refuse') {
    if (msg.memberSendId.toString() !== me.id) {
      msgFormat.content = 'Cuộc gọi nhỡ'
      msgFormat.class = 'call-msg call-missed'
    } else {
      msgFormat.content = 'Cuộc gọi đi'
      msgFormat.class = 'call-msg call-outgoing'
    }
  }
  return msgFormat
}

/**
 * Function format message list
 * @param {object[]} messages Messages
 * @param {object} me Me Document
 * @param {object} friend Friend Document
 * @returns messages are format
 */
const formatMessageList = function (messages, me, friend) {
  return messages.map(msg => {
    return formatMsg(msg, me, friend)
  }).sort((a, b) => {
    return a.id.getTimestamp() - b.id.getTimestamp()
  })
};

/**
 * Function format latest message
 * @param {object} latestMsgObj Message Object
 * @param {object} me Me Document
 * @param {object} friend Friend Document
 * @returns latest message be format
 */
const formatLatestMsg = function (latestMsgObj, me, friend) {
  const latestMessage = {
    msg: '',
    timeFromNow: ''
  }
  let msg = '';
  if (me.id === latestMsgObj.memberSendId) {
    msg += 'Bạn: '
  }

  if (latestMsgObj.type === 'text') {
    msg += latestMsgObj.content
  } else if (latestMsgObj.type === 'call-audio') {
    if (me.id === latestMsgObj.memberSendId) {
      msg = `Bạn đã gọi cho ${friend.name}`
    } else {
      msg = `${friend.name} đã gọi cho bạn`
    }
  } else if (latestMsgObj.type === 'call-audio-refuse') {
    if (me.id === latestMsgObj.memberSendId) {
      msg = `Bạn đã gọi cho ${friend.name}`
    } else {
      msg = `Bạn đã bỏ lỡ cuộc gọi của ${friend.name}`
    }
  } else {
    if (me.id === latestMsgObj.memberSendId) {
      msg = 'Bạn đã gửi một đính kèm'
    } else {
      msg = `${friend.name} đã gửi một đính kèm`
    }
  }
  latestMessage.msg = msg
  latestMessage.timeFromNow = moment(latestMsgObj.time).fromNow(true)

  return latestMessage
}


module.exports.formatMessageList = formatMessageList
module.exports.formatMsg = formatMsg
module.exports.formatLatestMsg = formatLatestMsg