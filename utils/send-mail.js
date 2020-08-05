const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER, // generated ethereal user
    pass: process.env.MAIL_PASSWORD, // generated ethereal password
  },
});

module.exports = (to, subject, html) => {
  return new Promise((resolve, reject) => {
    transporter.sendMail(
      {
        from: `"Admin" <${process.env.MAIL_USER}>`,
        to,
        subject,
        html,
      },
      (err, info) => {
        if (err) {
          reject(err);
        } else {
          resolve(info);
        }
      }
    );
  });
};
