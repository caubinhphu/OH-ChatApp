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
    class: '',
    timeCall: '',
    fileName: '',
    isLink: false,
    type: msg.type
  }

  const diffDate = moment().diff(moment(msg.time), 'days')

  if (diffDate <= 0) {
    msgFormat.time = moment(msg.time).format('H:mm')
  } else if (diffDate === 1) {
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
    msgFormat.timeCall = formatDiffTime(msg.time, msg.timeEndCall || new Date())
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
  } else if (msg.type === 'call-video') {
    msgFormat.timeCall = formatDiffTime(msg.time, msg.timeEndCall || new Date())
    if (msg.memberSendId.toString() !== me.id) {
      msgFormat.content = 'Cuộc gọi video đến'
      msgFormat.class = 'call-msg call-incoming call-video'
    } else {
      msgFormat.content = 'Cuộc gọi đi'
      msgFormat.class = 'call-msg call-outgoing'
    }
  } else if (msg.type === 'call-video-refuse') {
    if (msg.memberSendId.toString() !== me.id) {
      msgFormat.content = 'Cuộc gọi nhỡ video'
      msgFormat.class = 'call-msg call-missed call-missed-video'
    } else {
      msgFormat.content = 'Cuộc gọi video đi'
      msgFormat.class = 'call-msg call-outgoing call-video'
    }
  } else if (msg.type === 'deleted') {
    msgFormat.content = 'Tin nhắn đã bị xóa'
    msgFormat.class = 'deleted'
  } else if (msg.type === 'edited') {
    msgFormat.class = 'edited'
  } else if (msg.type === 'text') {
  } else if (msg.type === 'start') {
    msgFormat.content = `
      <img src="${friend.avatar}" alt="${friend.name}"/>
      <h4>${friend.name}</h4>
      <div>Các bạn đã trở thành bạn của nhau</div>
    `
    msgFormat.class = 'msg-start'
  } else {
    msgFormat.fileName = msg.fileName
  }

  if (isValidHttpUrl(msgFormat.content)) {
    msgFormat.isLink = true
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
  if (me.id === latestMsgObj.memberSendId.toString()) {
    msg += 'Bạn: '
  }

  if (latestMsgObj.type === 'text' || latestMsgObj.type === 'edited') {
    msg += latestMsgObj.content
  } else if (latestMsgObj.type === 'call-audio' || latestMsgObj.type === 'call-video') {
    if (me.id === latestMsgObj.memberSendId.toString()) {
      msg = `Bạn đã gọi cho ${friend.name}`
    } else {
      msg = `${friend.name} đã gọi cho bạn`
    }
  } else if (latestMsgObj.type === 'call-audio-refuse' || latestMsgObj.type === 'call-video-refuse') {
    if (me.id === latestMsgObj.memberSendId.toString()) {
      msg = `Bạn đã gọi cho ${friend.name}`
    } else {
      msg = `Bạn đã bỏ lỡ cuộc gọi của ${friend.name}`
    }
  } else if (latestMsgObj.type === 'start') {
    msg = 'Các bạn đã trở thành bạn bè'
  } else if (latestMsgObj.type === 'deleted') {
    msg = 'Tin nhắn đã bị xóa'
  } else {
    if (me.id === latestMsgObj.memberSendId.toString()) {
      msg = 'Bạn đã gửi 1 đính kèm'
    } else {
      msg = `${friend.name} đã gửi 1 đính kèm`
    }
  }
  latestMessage.msg = msg
  latestMessage.timeFromNow = moment(latestMsgObj.time).fromNow(true)

  return latestMessage
}

/**
 * Function format diff time
 * @param {Date} start Start time
 * @param {Date} end End time
 * @returns time diff be format
 */
function formatDiffTime(start, end) {
  const mPass = moment(start)
  const mPresent = moment(end)
  const h = mPresent.diff(mPass, 'hours')
  const m = mPresent.diff(mPass, 'minutes') - h * 60
  const s = mPresent.diff(mPass, 'seconds') - h * 3600 - m * 60

  return `${h ? h + 'h' : ''}${m ? m + 'p' : ''}${(h || m)  && !s ? '' : s + 's'}`
}

function isValidHttpUrl(string) {
  let url;
  try { url = new URL(string); }
  catch (_) { return false; }
  return url.protocol === 'http:' || url.protocol === 'https:';
}

module.exports.formatMessageList = formatMessageList
module.exports.formatMsg = formatMsg
module.exports.formatLatestMsg = formatLatestMsg
module.exports.formatDiffTime = formatDiffTime
