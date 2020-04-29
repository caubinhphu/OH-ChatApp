const moment = require('moment');

// format message => return {username, message, time}
const formatMessage = function (username, message) {
  return {
    username,
    message,
    time: moment().format('h:mm A'),
  };
};

module.exports = formatMessage;
