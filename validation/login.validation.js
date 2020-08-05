const Joi = require('@hapi/joi');

module.exports.validateRegister = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email(),
    password: Joi.string().min(6).required(),
    password2: Joi.ref('password'),
  });

  return schema.validate(data);
};
