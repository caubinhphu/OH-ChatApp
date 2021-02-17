// option format message client side
const charReplaces = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
};

// replace char to format message client side
const replaceChar = function (char) {
  return charReplaces[char] || char;
};

// format message client side
const escapeHtml = function (html) {
  return html.replace(/[<>&]/g, replaceChar);
};

const CommonChat = (() => {
  window.escapeHtml = escapeHtml
})()

export default CommonChat