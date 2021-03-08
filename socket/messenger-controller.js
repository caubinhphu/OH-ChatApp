const jwt = require('jsonwebtoken');

const Member = require('../models/Member');
const Message = require('../models/Message');
const GroupMessage = require('../models/GroupMessage');


const formatMessage = require('../utils/message');

// receive event join to the room from client
module.exports.onMemberOnline = async function (io, { memberId }) {
  try {
  // find member
    const member = await Member.findById(memberId).populate('friends._id');
    if (member) {
      // change status and socketId
      member.status = 'online'
      member.socketId = this.id

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

module.exports.onMessageChat = async function (io, { message, token }) {
  try {
    // verify token
    const { data: dataToken } = jwt.verify(token, process.env.JWT_SECRET);

    // const friend = await Member.findById(dataToken.memberId)
    const me = await Member.findOne({ socketId: this.id })
                           .populate({
                             path: 'friends._id',
                             match: { _id: dataToken.memberId }
                           })
                           .populate('friends.groupMessageId')

    if (me) {
      // save msg to db
      // find friend related from friends of me and friend id
      const friendRelated =  me.friends.find(fr => fr._id)
      if (friendRelated) {
        // format msg
        const msg = formatMessage(me.name, message, me.avatar)

        // me save msg
        // find group msg
        const groupMessage = await GroupMessage.findById(friendRelated.groupMessageId)
        if (groupMessage) {
          // create new message
          const messageObj = await Message.create({
            time: new Date(),
            content: msg.message,
            memberSendId: me.id
          })
          // push msg to group and save group
          groupMessage.messages.push(messageObj)
          await groupMessage.save()
        } else {
          this.emit('error', 'Group chat không tồn tại');
        }

        // if friend is online => send msg by socket
        if (friendRelated._id.status === 'online' && friendRelated._id.socketId) {
          // member is online => emit socket
          io.to(friendRelated._id.socketId).emit('msg-messenger', {senderId: me.id, msg});
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

module.exports.onOfferSignal = async function (io, { receiverId, callerId, signal }) {
  try {
    // get caller and receiver
    const me = await Member.findById(callerId)
                            .populate({
                              path: 'friends._id',
                              match: { _id: receiverId }
                            })
    if (me) {
      // get receiver obj
      const friend = me.friends.find(fr => fr._id)
      if (friend && friend._id.status === 'online' && friend._id.socketId) {
        if (me.isCalling) {
          this.emit('msg-callError', {
            msg: 'Bạn không thể thực hiện cuộc gọi vì bạn đang có một cuộc gọi khác'
          });
        } else if (friend._id.isCalling) {
          this.emit('msg-callError', {
            msg: 'Bạn không thể thực hiện cuộc gọi vì bạn của bạn đang có một cuộc gọi khác'
          });
        } else {
          me.isCalling = true
          await me.save()

          const fri = await Member.findById(receiverId)
          if (fri) {
            fri.isCalling = true
            await fri.save()
          }

          io.to(friend._id.socketId).emit('msg-hasCallAudio', { signal, callerId })
        }
      } else {
        this.emit('msg-callError', {
          msg: 'Người dùng không online'
        });
      }
    }
  } catch (error) {
    this.emit('error', error.message);
  }
}

module.exports.onAnswerSignal = async function (io, { signal, callerId }) {
  try {
    const friend = await Member.findById(callerId)
    if (friend && friend.status === 'online') {
      io.to(friend.socketId).emit('msg-answerSignal', { signal })
    }
  } catch (error) {
    this.emit('error', error.message);
  }
}

module.exports.onConnectPeerFail = async function (io, { callerId, receiverId, code }) {
  try {
    const callerMem = await Member.findById(callerId)
    const receiverMem = await Member.findById(receiverId)
    if (callerMem) {
      callerMem.isCalling = false

      await callerMem.save()
    }
    if (receiverMem) {
      receiverMem.isCalling = false

      await receiverMem.save()
    }

    if (code === 'ERR_DATA_CHANNEL') {
      const friend = callerMem.friends.find(fr => fr._id.toString() === receiverId)
      if (friend) {
        const groupMessage = await GroupMessage.findById(friend.groupMessageId)
        if (groupMessage) {
          const messageObj = await Message.create({
            time: new Date(),
            content: 'Cuộc gọi kết thúc',
            memberSendId: callerMem.id,
            type: 'call-audio'
          })
          // push msg to group and save group
          groupMessage.messages.push(messageObj)
          await groupMessage.save()
        }
      }
    }
  } catch (error) {
    this.emit('error', error.message);
  }
}

module.exports.onRefuseCall = async function (io, { callerId, receiverId }) {
  try {
    console.log(callerId, receiverId);
    const callerMem = await Member.findById(callerId)
    if (callerMem) {
      const receiver = callerMem.friends.find(fr => fr._id.toString() === receiverId)
      if (receiver) {
        const groupMessage = await GroupMessage.findById(receiver.groupMessageId)
        if (groupMessage) {
          const messageObj = await Message.create({
            time: new Date(),
            content: 'Cuộc gọi kết thúc',
            memberSendId: callerMem.id,
            type: 'call-audio-refuse'
          })
          // push msg to group and save group
          groupMessage.messages.push(messageObj)
          await groupMessage.save()
        }
        if (callerMem.status === 'online' && callerMem.socketId) {
          io.to(callerMem.socketId).emit('msg-receiverRefuseCall')
        }
      }
    }
  } catch (error) {
    this.emit('error', error.message);
  }
}