const Text = require('../models/Text');
const Member = require('../models/Member');

module.exports.getText = async (req, res, next) => {
  const { textId } = req.params

  try {
    if (textId && textId.match(/^[0-9a-fA-F]{24}$/)) {
      const text = await Text.findById(textId)
      if (text) {
        res.render('utilities/text', {
          titleSite: 'OH - Text',
          textId: text.id
        })
      } else {
        next(new Error('Text not found'))
      }
    } else {
      next(new Error('Text not found'))
    }
  } catch (error) {
    next(error)
  }
}

module.exports.createText = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id)
    if (member) {
      const text = await Text.create({
        data: null,
        authorId: member._id
      })
      console.log(text._id);
      res.status(200).json({ textId: text._id })
    }
  } catch (error) {
    res.status(500).json({ message: 'Không tạo được Text mới' })
  }
}

module.exports.checkIsAuthorText = async (req, res) => {
  try {
    if (req.user) {
      const { textId } = req.query
      if (textId && textId.match(/^[0-9a-fA-F]{24}$/)) {
        const text = await Text.findById(textId)
        if (text && text.authorId.toString() === req.user.id) {
          res.status(200).json({ isAuthor: true })
        } else {
          res.status(200).json({ isAuthor: false })
        }
      } else {
        res.status(403).json({ message: 'Bad request' })
      }
    } else {
      res.status(200).json({ isAuthor: false })
    }
  } catch (error) {
    res.status(500).json({ message: 'Có lỗi xảy ra' })
  }
}
