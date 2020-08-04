module.exports.getIndex = (req, res) => {
  res.render('messenger', {
    titleSite: 'OH chat - Messenger',
  });
};
