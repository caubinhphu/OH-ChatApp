module.exports.getIndex = (req, res) => {
  res.render('user/index', {
    titleSite: 'Chat App',
    successText: req.flash('success_msg'),
  });
};

module.exports.getJoin = (req, res) => {
  res.render('user/join-room', {
    titleSite: 'Join room',
  });
};

module.exports.getChat = (req, res) => {
  res.render('user/chat-room', {
    titleSite: 'Chat',
  });
};

module.exports.getHostChat = (req, res) => {
  res.render('user/chat-room-host', {
    titleSite: 'Chat',
  });
};

module.exports.getCreate = (req, res) => {
  // create id room random
  let idRandom = Math.round(Math.random() * 1e9)
    .toString()
    .padStart(9, '0');
  // create password room random
  let passwordRandom = Math.round(Math.random() * 1e4)
    .toString()
    .padStart(4, '0');

  res.render('user/create-room', {
    titleSite: 'Create room',
    idRandom,
    passwordRandom,
  });
};
