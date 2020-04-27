module.exports.getIndex = (req, res, next) => {
  res.render('user/join-room', {
    titleSite: 'Chat App',
  });
};

module.exports.getChat = (req, res, next) => {
  res.render('user/chat-room', {
    titleSite: 'Chat',
  });
};
