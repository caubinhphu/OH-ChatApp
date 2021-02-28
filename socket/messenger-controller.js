const Member = require('../models/Member');

// receive event join to the room from client
module.exports.onMemberOnline = async function ({ memberId }) {
  try {
  // find member
    const member = await Member.findById(memberId);
    if (member) {
      // change status and socketId
      member.status = 'online'
      member.socketId = this.id

      await member.save()
    } else {
      this.emit('error', 'Không tồn tại thành viên');
    }
  } catch (error) {
    this.emit('error', error.message);
  }
};