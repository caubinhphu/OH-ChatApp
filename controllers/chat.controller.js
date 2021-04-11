const xlsx = require('xlsx')
const jwt = require('jsonwebtoken');
const path = require('path')
const fs = require('fs')

const Room = require('../models/Room');

const siteRoom = 'OH Chat - Room'

module.exports.getIndex = (req, res) => {
  res.render('room', {
    titleSite: 'OH Chat'
  });
};

module.exports.getJoin = (req, res) => {
  let name = '';
  let memberId = '';
  let roomId = '';
  let password = '';
  const { room, pass } = req.query;
  if (room) {
    roomId = room
  }
  if (pass) {
    password = pass
  }

  // check user logged in
  if (req.isAuthenticated()) {
    name = req.user.name;
    memberId = req.user._id;
  }

  res.render('room/join-room', {
    titleSite: siteRoom,
    name,
    memberId,
    roomId,
    password
  });
};

module.exports.getChat = (req, res) => {
  res.render('room/chat-room', {
    titleSite: siteRoom,
  });
};

module.exports.getHostChat = (req, res) => {
  const { token } = req.query
  res.render('room/chat-room-host', {
    titleSite: siteRoom,
    token
  });
};

module.exports.getCreate = (req, res) => {
  let name = '';
  let memberId = '';
  // check user logged in
  if (req.isAuthenticated()) {
    name = req.user.name;
    memberId = req.user._id;
  }

  // create id room random
  const idRandom = Math.round(Math.random() * 1e9)
    .toString()
    .padStart(9, '0');
  // create password room random
  const passwordRandom = Math.round(Math.random() * 1e4)
    .toString()
    .padStart(4, '0');

  res.render('room/create-room', {
    titleSite: siteRoom,
    memberId,
    name,
    idRandom,
    passwordRandom,
  });
};

module.exports.redirectJoin = (req, res) => {
  const { room, pass } = req.query;
  res.redirect(`/join/?room=${room}&pass=${pass}`)
}

module.exports.exportUsers = async (req, res, next) => {
  const { token } = req.query
  if (token) {
    try {
      const { data: dataToken } = jwt.verify(token, process.env.JWT_SECRET);
      // find room join with users in this room
      const room = await Room.findOne({
        roomId: dataToken.roomId,
      }).populate({
        path: 'users',
      });

      if (room) {
        const users = room.getRoomUsersInfoExport()

        const newWb = xlsx.utils.book_new()
        const newWs = xlsx.utils.json_to_sheet(Object.values(users), {
          cellDates: true,
        });
        const colsWs = [
          { wch: 10 }, // STT
          { wch: 30 }, // Tên
          { wch: 20 }, // vào lúc
          { wch: 20 }, // ra lúc
        ];
        newWs['!cols'] = colsWs;

        const colNum = xlsx.utils.decode_col('C'); //decode_col converts Excel col name to an integer for col #
        const fmt = 'm/d/yy h:mm'; // or any Excel number format

        /* get worksheet range */
        const range = xlsx.utils.decode_range(newWs['!ref']);
        for(let i = range.s.r + 1; i <= range.e.r; ++i) {
          /* find the data cell (range.s.r + 1 skips the header row of the worksheet) */
          const ref = xlsx.utils.encode_cell({r:i, c:colNum});
          /* if the particular row did not contain data for the column, the cell will not be generated */
          if(!newWs[ref]) { continue; }
          /* `.t == "d"` for number cells */
          if(newWs[ref].t !== 'd') { continue; }
          /* assign the `.z` number format */
          newWs[ref].z = fmt;
        }

        console.log(newWs);
        xlsx.utils.book_append_sheet(newWb, newWs, 'Export');

        const filename = `order.dasdf.xlsx`;
        const pathFile = path.join(__dirname, '..', filename);
        xlsx.writeFile(newWb, pathFile);

        res.download(pathFile, filename, (err) => {
          if (err) { throw err; }
          fs.unlink(pathFile, (err) => {
            if (err) { throw err; }
          });
        });
      }
    } catch (error) {
      next(error)
    }
  }
}