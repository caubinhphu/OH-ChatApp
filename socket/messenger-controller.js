const jwt = require('jsonwebtoken');

const Member = require('../models/Member');
const Message = require('../models/Message');
const GroupMessage = require('../models/GroupMessage');


const formatMessage = require('../utils/message');

/**
 * Function get caller member and its info
 * @param {string} callerId caller ID
 * @param {string} receiverId receiver ID
 * @returns Caller member and info
 */
function getCallerMemAndInfo(callerId, receiverId) {
  return new Promise((resolve, reject) => {
    Member.findById(callerId || null)
      .populate({
        path: 'friends._id',
        match: {
          _id: receiverId
        },
        options: {
          limit: 1
        }
      })
      .populate('friends.groupMessageId')
      .exec((err, member) => {
        if (err) {
          reject(err)
        } else {
          resolve(member)
        }
      })
  })
}

/**
 * Function get group message has latest call audio
 * @param {object | string} groupMessageId group message id
 * @returns group message has latest call audio
 */
function getGroupHasCallLatest(groupMessageId, type = 'call-audio') {
  return new Promise((resolve, reject) => {
    GroupMessage.findById(groupMessageId)
      .populate({
        path: 'messages',
        match: {
          type
        },
        options: {
          limit: 1,
          sort: {
            _id: -1
          }
        }
      })
      .exec((err, group) => {
        if (err) {
          reject(err)
        } else {
          resolve(group)
        }
      })
  })
}

// receive event join to the room from client
module.exports.onMemberOnline = async function (io, { memberId }) {
  try {
  // find member
    const member = await Member.findById(memberId || null).populate('friends._id');
    if (member) {
      // change status and socketId
      member.status = 'online'
      member.socketId = this.id
      member.isCalling = false
      member.markModified('status')
      await member.save()

      // send signal online to friends are online
      member.friends.forEach(fr => {
        if (fr._id.status === 'online' && fr._id.socketId) {
          io.to(fr._id.socketId).emit('msg-friendOnline', { memberId: member.id });
        }
      })
    } else {
      this.emit('error', 'Không tồn tại thành viên');
    }
  } catch (error) {
    this.emit('error', error.message);
  }
};

// receive msg chat of friend
module.exports.onMessageChat = async function (io, { message, token, type, nameFile, resourceType }) {
  try {
    // verify token
    const { data: dataToken } = jwt.verify(token, process.env.JWT_SECRET);

    const me = await Member.findOne({ socketId: this.id })
      .populate({
        path: 'friends._id',
        match: { _id: dataToken.memberId },
        options: {
          limit: 1
        }
      })
      .populate('friends.groupMessageId')
    if (me) {
      // save msg to db
      // find friend related from friends of me and friend id
      const friendRelated =  me.friends.find(fr => fr._id)
      if (friendRelated) {
        // format msg
        const msg = formatMessage(me.name, message, me.avatar)
        if (type === 'file') {
          msg.type = 'file'
          msg.nameFile = nameFile
          msg.resourceType = resourceType
        }
        msg.url = me.url
        // me save msg
        // find group msg
        if (friendRelated.groupMessageId) {
          // create new message
          const messageObj = await Message.create({
            time: new Date(),
            content: msg.message,
            memberSendId: me.id,
            type: type === 'file' ? resourceType : 'text',
            fileName: type === 'file' ? nameFile : ''
          })
          // push msg to group and save group
          friendRelated.groupMessageId.messages.push(messageObj)
          await friendRelated.groupMessageId.save()
        } else {
          this.emit('error', 'Group chat không tồn tại');
        }

        const tokenMe = jwt.sign(
          { data: { memberId: me.id } },
          process.env.JWT_SECRET
        );

        // if friend is online => send msg by socket
        if (friendRelated._id.status === 'online' && friendRelated._id.socketId) {
          // member is online => emit socket
          io.to(friendRelated._id.socketId).emit(
            'msg-messenger',
            { senderId: me.id, msg, token: tokenMe }
          );
        }
      } else {
        this.emit('error', 'Không thể chat với người không phải là bạn của bạn');
      }
    } else {
      this.emit('error', 'Thành viên không tồn tại');
    }
  } catch (error) {
    this.emit('error', error.message);
  }
}

// receive signal has notification
module.exports.onNotification = async function (io, { notification }) {
  try {
    const member = await Member.findById(notification.memberId)
    if (member) {
      // send signal has notification
      if (member.status === 'online' && member.socketId) {
        io.to(member.socketId).emit('msg-hasNotification', { notification });
      }
    } else {
      this.emit('error', 'Thành viên không tồn tại');
    }
  } catch (error) {
    this.emit('error', error.message);
  }
}

// receive signal offer call peer of caller => send to receiver
module.exports.onOfferSignal = async function (io, { receiverId, callerId, signal, typeCall }) {
  try {
    // get caller and receiver
    const callerMem = await getCallerMemAndInfo(callerId, receiverId)

    if (callerMem) {
      // get receiver obj
      const receiverMem = callerMem.friends.find(fr => fr._id)
      if (receiverMem && receiverMem._id.status === 'online' && receiverMem._id.socketId) {
        if (callerMem.isCalling) {
          this.emit('msg-callError', {
            msg: 'Không thể thực hiện cuộc gọi vì bạn đang có một cuộc gọi khác'
          });
        } else if (receiverMem._id.isCalling) {
          this.emit('msg-callError', {
            msg: `${ receiverMem._id.name } đang bận`
          });
        } else {
          callerMem.isCalling = true
          await callerMem.save()

          receiverMem._id.isCalling = true
          await receiverMem._id.save()

          if (receiverMem.groupMessageId) {
            const messageObj = await Message.create({
              time: new Date(),
              content: 'Cuộc gọi thoại',
              memberSendId: callerMem.id,
              type: typeCall === 'audio' ? 'call-audio' : 'call-video',
              timeEndCall: new Date()
            })

            // push msg to group and save group
            receiverMem.groupMessageId.messages.push(messageObj)
            await receiverMem.groupMessageId.save()

            io.to(receiverMem._id.socketId).emit('msg-hasCallMedia', {
              signal,
              callerId,
              callerName: callerMem.name,
              callerAvatar: callerMem.avatar,
              typeCall
            })
            this.emit('msg-doneSendSignalCall', { callerId, receiverId })
          }
        }
      } else {
        this.emit('msg-callError', {
          msg: `${ receiverMem._id.name } đang không online`
        });
      }
    }
  } catch (error) {
    this.emit('error', error.message);
  }
}

// receive signal answer call peer of receiver => send to caller
module.exports.onAnswerSignal = async function (io, { signal, callerId, receiverId, typeCall }) {
  try {
    // get caller and receiver
    const callerMem = await getCallerMemAndInfo(callerId, receiverId)

    if(callerMem) {
      const receiverMem = callerMem.friends.find(fr => fr._id)
      if (receiverMem && receiverMem.groupMessageId) {
        const groupMessage = await getGroupHasCallLatest(
          receiverMem.groupMessageId,
          typeCall === 'audio' ? 'call-audio' : 'call-video'
        )
        if (groupMessage && groupMessage.messages.length) {
          if (callerMem.isCalling) {
            io.to(callerMem.socketId).emit('msg-answerSignal', { signal })
          } else {
            groupMessage.messages[0].type = typeCall === 'audio' ? 'call-audio-refuse' : 'call-video-refuse'
            await groupMessage.messages[0].save()
          }
        }
      }
    }
  } catch (error) {
    this.emit('error', error.message);
  }
}

// receive signal connect peer fail
module.exports.onConnectPeerFail = async function (io, { callerId, receiverId, code, sender, typeCall }) {
  try {
    // get caller and receiver
    const callerMem = await getCallerMemAndInfo(callerId, receiverId)

    if (callerMem) {
      callerMem.isCalling = false
      await callerMem.save()

      const receiverMem = callerMem.friends.find(fr => fr._id)
      if (receiverMem && code === 'ERR_DATA_CHANNEL') {
        receiverMem._id.isCalling = false
        await receiverMem._id.save()

        const groupMessage = await getGroupHasCallLatest(
          receiverMem.groupMessageId,
          typeCall === 'audio' ? 'call-audio' : 'call-video'
        )

        if (groupMessage && groupMessage.messages.length) {
          groupMessage.messages[0].timeEndCall = new Date()
          await groupMessage.messages[0].save()
        }

        // send signal end call to !sender
        if (sender === 'caller' && receiverMem._id.status === 'online' && receiverMem._id.socketId) {
          io.to(receiverMem._id.socketId).emit('msg-endCall', {
            callerId,
            receiverId,
            sender,
            typeCall
          })
        } else if (sender === 'receiver' && callerMem.status === 'online' && callerMem.socketId) {
          io.to(callerMem.socketId).emit('msg-endCall', {
            callerId,
            receiverId,
            sender,
            typeCall
          })
        }
      }
    }
  } catch (error) {
    this.emit('error', error.message);
  }
}

// receive signal refuse call from receiver
module.exports.onRefuseCall = async function (io, { callerId, receiverId, typeCall }) {
  try {
    // get caller and receiver
    const callerMem = await getCallerMemAndInfo(callerId, receiverId)

    if (callerMem) {
      callerMem.isCalling = false
      await callerMem.save()

      const receiverMem = callerMem.friends.find(fr => fr._id)
      if (receiverMem) {
        receiverMem._id.isCalling = false
        await receiverMem._id.save()
        if (receiverMem.groupMessageId) {
          const groupMessage = await getGroupHasCallLatest(
            receiverMem.groupMessageId,
            typeCall === 'audio' ? 'call-audio' : 'call-video'
          )

          if (groupMessage && groupMessage.messages.length) {
            groupMessage.messages[0].type = typeCall === 'audio' ? 'call-audio-refuse' : 'call-video-refuse'
            await groupMessage.messages[0].save()

            // send signal to caller
            io.to(callerMem.socketId).emit('msg-receiverRefuseCall')
          }
        }
      }
    }
  } catch (error) {
    this.emit('error', error.message);
  }
}

// receive signal call timeout
module.exports.onCallTimeout = async function (io, { callerId, receiverId, typeCall }) {
  try {
    // get caller and receiver
    const callerMem = await getCallerMemAndInfo(callerId, receiverId)

    if (callerMem) {
      callerMem.isCalling = false
      await callerMem.save()

      const receiverMem = callerMem.friends.find(fr => fr._id)

      if (receiverMem) {
        receiverMem._id.isCalling = false
        await receiverMem._id.save()

        if (receiverMem.groupMessageId) {
          const groupMessage = await getGroupHasCallLatest(
            receiverMem.groupMessageId,
            typeCall === 'audio' ? 'call-audio' : 'call-video'
          )

          if (groupMessage && groupMessage.messages.length) {
            groupMessage.messages[0].type = typeCall === 'audio' ? 'call-audio-refuse' : 'call-video-refuse'
            await groupMessage.messages[0].save()

            // send to receiver signal call timeout
            io.to(receiverMem._id.socketId).emit('msg-missedCall', {
              callerId,
              typeCall
            })
          }
        }
      }
    }
  } catch (error) {
    this.emit('error', error.message);
  }
}