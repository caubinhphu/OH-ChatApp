const Joi = require('@hapi/joi');

module.exports.validateRegister = (data) => {
  const schema = Joi.object({
    name: Joi.string().max(40).required().messages({
      'string.base': 'Họ tên phải là chuỗi',
      'string.max': 'Họ tên không dài quá 40 ký tự',
      'any.required': 'Chưa nhập họ tên',
    }),
    email: Joi.string().email().messages({
      'string.base': 'Email phải là chuỗi',
      'string.email': 'Email không hợp lệ',
    }),
    password: Joi.string().min(6).required().messages({
      'string.base': 'Mật khẩu phải là chuỗi',
      'string.min': 'Mật khẩu dài ít nhất 6 ký tự',
    }),
    password2: Joi.valid(Joi.ref('password')).messages({
      'any.only': 'Xác nhận mật khẩu không đúng',
    }),
  });

  return schema.validate(data);
};
