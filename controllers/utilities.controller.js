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
          text
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
        authorId: member._id,
        createDate: new Date(),
        modifyDate: new Date(),
        name: Math.random().toString(36).substring(7)
      })
      res.status(200).json({ textId: text._id })
    }
  } catch (error) {
    res.status(500).json({ message: 'Không tạo được Text mới' })
  }
}

module.exports.putText = async (req, res) => {
  const { name, id } = req.body
  try {
    const member = await Member.findById(req.user.id)
    const text = await Text.findById(id)
    if (member && text && text.authorId.toString() === req.user.id) {
      text.name = name
      await text.save()

      res.status(200).json({ message: 'Cập nhật tên Text thành công', name })
    }
  } catch (error) {
    res.status(500).json({ message: 'Cập nhật tên Text lỗi' })
  }
}

module.exports.deleteText = async (req, res) => {
  const { id } = req.body
  try {
    const member = await Member.findById(req.user.id)
    const text = await Text.findById(id)
    if (member && text && text.authorId.toString() === req.user.id) {
      await text.deleteOne()

      res.status(200).json({ message: 'Xóa Text thành công' })
    }
  } catch (error) {
    res.status(500).json({ message: 'Xóa Text lỗi' })
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
