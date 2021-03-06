const Joi = require('@hapi/joi');

// validate change profile
module.exports.validateProfile = (data) => {
  const schema = Joi.object({
    name: Joi.string()
      .max(40)
      .pattern(/^[^<>/`~!@#$%^&*(){}[\]=;:'"|?+\\]+$/)
      .required()
      .messages({
        'string.base': 'Họ tên phải là chuỗi',
        'string.max': 'Họ tên không dài quá 40 ký tự',
        'string.pattern.base':
          'Họ tên không chứa các ký tự đặc biệt (trừ - và _)',
        'string.empty': 'Chưa nhập họ tên',
      }),
    gender: Joi.string()
      .pattern(/(0|1)/)
      .messages({
        'string.base': 'Giới tính không hợp lệ',
        'string.pattern.base': 'Giới tinh không hợp lệ',
      }),
    birthday: Joi.date()
      .min('1-1-1900')
      .max('now')
      .allow('')
      .messages({
        'date.base': 'Ngày sinh không hợp lệ',
        'date.min': 'Ngày sinh không hợp lệ',
        'date.max': 'Ngày sinh không hợp lệ',
      }),
    phone: Joi.string()
      .pattern(/^\d+$/)
      .pattern(/^(086|09[6|7|8]|03[2|3|4|5|6|7|8|9]|089|09[0|3]|07[0|6|7|8|9]|088|09[1|4]|08[1|2|3|4|5]|092|056|058|099|059)/)
      .length(10)
      .allow('')
      .messages({
        'string.base': 'Số điện thoại không hợp lệ',
        'string.length': 'Số điện thoại không hợp lệ',
        'string.pattern.base':'Số điện thoại không hợp lệ',
      }),
    address: Joi.string()
      .pattern(/^[^<>/`~!@#$%^&*(){}[\]=;:"|?+\\]+$/)
      .allow('')
      .messages({
        'string.base': 'Địa chỉ không hợp lệ',
        'string.pattern.base':'Địa chỉ không chứa các ký tự đặc biệt (trừ - và _)'
      })

  });

  return schema.validate(data);
};

// validate change password
module.exports.validateSettingPassword = (data) => {
  const schema = Joi.object({
    password: Joi.string().min(6).required().messages({
      'string.base': 'Mật khẩu phải là chuỗi',
      'string.min': 'Mật khẩu dài ít nhất 6 ký tự',
      'string.empty': 'Chưa nhập mật khẩu',
    }),
    password2: Joi.valid(Joi.ref('password')).messages({
      'any.only': 'Xác nhận mật khẩu không đúng',
    }),
  });

  return schema.validate(data);
};

// validate change url
module.exports.validateSettingUrl = (data) => {
  const schema = Joi.object({
    url: Joi.string()
    .max(15)
    .pattern(/^[^<>/`~!@#$%^&*(){}[\]=;:'"|?+\\]+$/)
    .required()
    .messages({
      'string.base': 'Url phải là chuỗi',
      'string.max': 'Url không dài quá 15 ký tự',
      'string.pattern.base':
        'Url không chứa các ký tự đặc biệt (trừ - và _)',
      'string.empty': 'Chưa nhập url',
    }),
  });

  return schema.validate(data);
};

// validate change password static room
module.exports.validateSettingRoom = (data) => {
  const schema = Joi.object({
    password: Joi.string()
    .required()
    .pattern(/\d{4}/)
    .length(4)
    .messages({
      'string.base': 'Mật khẩu phòng phải là chuỗi',
      'string.length': 'Mật khẩu phòng phải là 4 chữ số',
      'string.pattern.base':
        'Mật khẩu phòng phải là 4 chữ số',
      'string.empty': 'Chưa nhập mật khẩu phòng',
    })
  });

  return schema.validate(data);
};