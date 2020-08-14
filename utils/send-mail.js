const transporter = require('../config/nodemailer');

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
