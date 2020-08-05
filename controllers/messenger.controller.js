module.exports.getIndex = (req, res) => {
  res.render('messenger', {
    titleSite: 'OH chat - Messenger',
    successText: req.flash('success_msg'),
  });
};
