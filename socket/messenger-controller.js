const jwt = require('jsonwebtoken');
const path = require('path');
const moment = require('moment');

const Member = require('../models/Member');
const Message = require('../models/Message');
const GroupMessage = require('../models/GroupMessage');


const formatMessage = require('../utils/message');
const cloudinary = require('../utils/cloudinary');
const { formatDiffTime } = require('../utils/messenger');

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
      const cloneSocketId = [...member.socketId]
      const socketInActive = io.sockets.adapter.rooms[member.id.toString()]

      if (socketInActive && socketInActive.length) {
        member.socketId = cloneSocketId.reduce((acc, cur) => {
          if (socketInActive.sockets[cur]) {
            acc.push(cur)
          }
          return acc
        }, [])
      } else {
        member.socketId = []
      }
      
      member.socketId.push(this.id)
      this.join(member._id.toString())
      // member.isCalling = false
      member.markModified('status')
      member.markModified('socketId')
      member.markModified('isCalling')
      setTimeout(async () => {
        await member.updateOne({
          socketId: member.socketId,
          isCalling: false,
          status: 'online'
        })
      }, 200);

      if (member.socketId.length === 1) {
        // send signal online to friends are online
        member.friends.forEach(fr => {
          if (fr._id.status === 'online' && fr._id.socketId.length) {
            io.in(fr._id._id.toString()).emit('msg-friendOnline', { memberId: member.id })
            // fr._id.socketId.forEach(socket => {
            //   io.to(socket).emit('msg-friendOnline', { memberId: member.id });
            // })
          }
        })
      }
    } else {
      this.emit('error', 'Không tồn tại thành viên');
    }
  } catch (error) {
    console.log(error);
    this.emit('error', error.message);
  }
};

// receive msg chat of friend
module.exports.onMessageChat = async function (io, { message, token, type, nameFile, resourceType }, callback) {
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
        } else {
          msg.type = 'text'
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
          msg.id = messageObj.id.toString()

          callback({
            status: 'ok',
            msgId: msg.id
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

        const tokenFriend = jwt.sign(
          { data: { memberId: friendRelated._id.id } },
          process.env.JWT_SECRET
        );

        // if friend is online => send msg by socket
        if (friendRelated._id.status === 'online' && friendRelated._id.socketId.length) {
          // member is online => emit socket
          // io.to(friendRelated._id.socketId).emit(
          //   'msg-messenger',
          //   { senderId: me.id, msg, token: tokenMe }
          // );
          io.in(friendRelated._id.id.toString()).emit('msg-messenger', { senderId: me.id, msg, token: tokenMe })
        }
        this.to(me.id).emit('msg-messenger-me', { receiverId: friendRelated._id.id, msg, token: tokenFriend })
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
      if (member.status === 'online' && member.socketId.length) {
        io.in(member.id).emit('msg-hasNotification', { notification });
      }
    } else {
      this.emit('error', 'Thành viên không tồn tại');
    }
  } catch (error) {
    this.emit('error', error.message);
  }
}

// receive signal has notification
module.exports.onStatusRead = async function (io, { senderId, receiverId, status }) {
  try {
    const member = await Member.findById(receiverId)
    if (member) {
      const index = member.friends.findIndex(fr => fr._id.toString() === senderId)
      if (index !== -1) {
        member.friends[index].beRead = status
        await member.save()
      }
    } else {
      this.emit('error', 'Thành viên không tồn tại');
    }
  } catch (error) {
    this.emit('error', error.message);
  }
}

// receive signal edit message from a client
module.exports.onEditMessage = async function (io, { messageId, content, token }, callBack) {
  try {
    const { data: dataToken } = jwt.verify(token, process.env.JWT_SECRET);
    const member = await Member.findOne({ socketId: this.id })
    if (member && messageId) {
      const message = await Message.findById(messageId)
      if (message && message.memberSendId.toString() === member.id.toString() && (message.type === 'text' || message.type === 'edited')) {
        message.content = content
        message.type = 'edited'
        await message.save()
        callBack({
          status: 'ok'
        })

        if (dataToken.memberId && dataToken.memberId.match(/^[0-9a-fA-F]{24}$/)) {
          const friend = await Member.findById(dataToken.memberId)
          if (friend && friend.status === 'online' && friend.socketId.length) {
            io.in(friend.id).emit('msg-updateMessage', {
              messageId,
              friendId: member.id,
              type: 'edit',
              content
            })
          }
          if (member.socketId.length > 1) {
            io.in(member.id).emit('msg-updateMessage', {
              messageId,
              friendId: friend.id,
              type: 'edit',
              content,
              me: true
            })
          }
        }
      }
    } else {
      this.emit('error', 'Sửa tin nhắn thất bại');
    }
  } catch (error) {
    this.emit('error', error.message);
  }
}
// receive signal delete message from a client
module.exports.onDeleteMessage = async function (io, { messageId, token }, callBack) {
  try {
    const { data: dataToken } = jwt.verify(token, process.env.JWT_SECRET);
    const member = await Member.findOne({ socketId: this.id })
    if (member && messageId) {
      const message = await Message.findById(messageId)
      if (message && message.memberSendId.toString() === member.id.toString()) {
        let publicId = null
        let typeRes = ''
        const id = message.content.match(/files.*$/g)
        if (message.type === 'raw') {
          publicId = 'ohchat/upload/' + id[0]
          typeRes = 'raw'
          message.fileName = ''
        } else if (message.type === 'image') {
          publicId = 'ohchat/upload/' + path.basename(id[0], path.extname(id[0]))
          typeRes = 'image'
          message.fileName = ''
        } else if (message.type === 'video' || message.type === 'audio') {
          publicId = 'ohchat/upload/' + path.basename(id[0], path.extname(id[0]))
          typeRes = 'video'
          message.fileName = ''
        }
        if (publicId) {
          await cloudinary.deleteTypeResources([publicId], typeRes)
        }
        message.content = ''
        message.type = 'deleted'
        await message.save()
        callBack({
          status: 'ok'
        })

        if (dataToken.memberId && dataToken.memberId.match(/^[0-9a-fA-F]{24}$/)) {
          const friend = await Member.findById(dataToken.memberId)
          if (friend && friend.status === 'online' && friend.socketId.length) {
            io.in(friend.id).emit('msg-updateMessage', {
              messageId,
              friendId: member.id.toString(),
              type: 'delete'
            })
          }
          if (member.socketId.length > 1) {
            io.in(member.id).emit('msg-updateMessage', {
              messageId,
              friendId: friend.id,
              type: 'delete',
              me: true
            })
          }
        }
      }
    } else {
      this.emit('error', 'Xóa tin nhắn thất bại');
    }
  } catch (error) { 
    this.emit('error', error.message);
  }
}

// receive signal offer call peer of caller => send to receiver
module.exports.onOfferSignal = async function (io, { receiverId, callerId, signal, typeCall }, callback) {
  try {
    // get caller and receiver
    const callerMem = await getCallerMemAndInfo(callerId, receiverId)

    if (callerMem) {
      // get receiver obj
      const receiverMem = callerMem.friends.find(fr => fr._id)
      if (receiverMem && receiverMem._id.status === 'online' && receiverMem._id.socketId.length) {
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

            callback({
              status: 'ok',
              msgId: messageObj.id.toString(),
              callerId,
              receiverId
            })

            io.to(receiverMem._id.socketId[0]).emit('msg-hasCallMedia', {
              signal,
              callerId,
              callerName: callerMem.name,
              callerAvatar: callerMem.avatar,
              typeCall,
              msgId: messageObj.id.toString()
            })
            // this.emit('msg-doneSendSignalCall', { callerId, receiverId })
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
            io.in(callerMem.id).emit('msg-answerSignal', { signal })
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

        const timeCall = `<small class="time-call">${formatDiffTime(groupMessage.messages[0].time, groupMessage.messages[0].timeEndCall)}</small>`
        const time = moment(groupMessage.messages[0].time).format('H:mm')

        // send signal end call to !sender
        if (sender === 'caller' && receiverMem._id.status === 'online' && receiverMem._id.socketId.length) {
          io.to(receiverMem._id.id).emit('msg-endCall', {
            callerId,
            receiverId,
            sender,
            typeCall,
            msg: {
              id: groupMessage.messages[0].id,
              message: typeCall === 'audio' ? 'Cuộc gọi đến' : 'Cuộc gọi video đến',
              className: typeCall === 'audio' ? 'call-msg call-incoming' : 'call-msg call-incoming call-video',
              timeCall,
              time,
              avatar: callerMem.avatar
            }
          })
          const tokenFriend = jwt.sign(
            { data: { memberId: receiverMem._id.id } },
            process.env.JWT_SECRET
          );
          const msg = formatMessage(
            receiverMem._id.name,
            typeCall === 'audio' ? 'Cuộc gọi đi' : 'Cuộc gọi video đi',
            receiverMem._id.avatar
          )
          msg.id = groupMessage.messages[0].id
          msg.className = typeCall === 'audio' ? 'call-msg call-outgoing' : 'call-msg call-outgoing call-video'
          msg.timeCall = timeCall
          this.to(callerMem.id).emit('msg-messenger-me', {
            receiverId: receiverMem._id.id,
            msg,
            token: tokenFriend,
            type: 'call-end',
            sender
          })
        } else if (sender === 'receiver' && callerMem.status === 'online' && callerMem.socketId.length) {
          io.to(callerMem.id).emit('msg-endCall', {
            callerId,
            receiverId,
            sender,
            typeCall,
            msg: {
              id: groupMessage.messages[0].id,
              message: typeCall === 'audio' ? 'Cuộc gọi đi' : 'Cuộc gọi video đi',
              className: typeCall === 'audio' ? 'call-msg call-outgoing' : 'call-msg call-outgoing call-video',
              timeCall,
              time
            }
          })
          const tokenFriend = jwt.sign(
            { data: { memberId: callerMem.id } },
            process.env.JWT_SECRET
          );
          const msg = formatMessage(
            callerMem.name,
            typeCall === 'audio' ? 'Cuộc gọi đến' : 'Cuộc gọi video đến',
            callerMem.avatar
          )
          msg.id = groupMessage.messages[0].id
          msg.className = typeCall === 'audio' ? 'call-msg call-incoming' : 'call-msg call-incoming call-video'
          msg.timeCall = timeCall
          this.to(receiverMem._id.id).emit('msg-messenger-me', {
            receiverId: callerMem.id,
            msg,
            token: tokenFriend,
            type: 'call-end',
            sender
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
            io.in(callerMem.id).emit('msg-receiverRefuseCall', {
              messageId: groupMessage.messages[0].id,
              receiverId: receiverMem._id.id,
              typeCall
            })
            const tokenFriend = jwt.sign(
              { data: { memberId: callerMem.id } },
              process.env.JWT_SECRET
            );
            const msg = formatMessage(callerMem.name, 'Cuộc gọi nhỡ', callerMem.avatar)
            msg.id = groupMessage.messages[0].id
            msg.className = typeCall === 'audio' ? 'call-msg call-missed' : 'call-msg call-missed call-missed-video'
            this.to(receiverMem._id.id).emit('msg-messenger-me', {
              receiverId: callerMem.id,
              msg,
              token: tokenFriend,
              type: 'call-missed'
            })
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
            io.in(receiverMem._id.id).emit('msg-missedCall', {
              callerId,
              typeCall,
              msgId: groupMessage.messages[0].id
            })

            const tokenFriend = jwt.sign(
              { data: { memberId: receiverMem._id.id } },
              process.env.JWT_SECRET
            );

            const msg = formatMessage(
              receiverMem._id.name,
              typeCall === 'audio' ? 'Cuộc gọi đi' : 'Cuộc gọi video đi',
              receiverMem._id.avatar
            )
            msg.id = groupMessage.messages[0].id
            msg.className = typeCall === 'audio' ? 'call-msg call-outgoing' : 'call-msg call-outgoing call-video'
            this.to(callerMem.id).emit('msg-messenger-me', {
              receiverId: receiverMem._id.id,
              msg,
              token: tokenFriend,
              type: 'call-end',
              sender: 'caller'
            })
          }
        }
      }
    }
  } catch (error) {
    this.emit('error', error.message);
  }
}