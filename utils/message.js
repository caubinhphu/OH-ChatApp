const moment = require('moment');

const formatMessage = function (username, message) {
  return {
    username,
    message,
    time: moment().format('h:mm A'),
  };
};

module.exports = formatMessage;
