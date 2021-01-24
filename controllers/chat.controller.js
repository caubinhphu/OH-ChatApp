module.exports.getIndex = (req, res) => {
  res.render('user/index', {
    titleSite: 'OH Chat',
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

  res.render('user/join-room', {
    titleSite: 'OH Chat - Room',
    name,
    memberId,
    roomId,
    password
  });
};

module.exports.getChat = (req, res) => {
  res.render('user/chat-room', {
    titleSite: 'OH Chat - Room',
  });
};

module.exports.getHostChat = (req, res) => {
  res.render('user/chat-room-host', {
    titleSite: 'OH Chat - Room',
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
  let idRandom = Math.round(Math.random() * 1e9)
    .toString()
    .padStart(9, '0');
  // create password room random
  let passwordRandom = Math.round(Math.random() * 1e4)
    .toString()
    .padStart(4, '0');

  res.render('user/create-room', {
    titleSite: 'OH Chat - Room',
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