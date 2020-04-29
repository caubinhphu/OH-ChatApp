const moment = require('moment');

const charReplaces = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
};

const replaceChar = function (char) {
  return charReplaces[char] || char;
};

const escapeHtml = function (html) {
  return html.replace(/[<>&]/g, replaceChar);
};

// format message => return {username, message, time}
const formatMessage = function (username, message) {
  return {
    username,
    message: escapeHtml(message),
    time: moment().format('h:mm A'),
  };
};

module.exports = formatMessage;
