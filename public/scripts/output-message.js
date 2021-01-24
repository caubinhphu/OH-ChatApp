// output error message
function outputErrorMessage(msg) {
  $.notify(msg, { className: 'error', position:'top left' });
}

// output success message
function outputSuccessMessage(msg) {
  $.notify(msg, { className: 'success', position:'top left' });
}

// output warning message
function outputWarnMessage(msg) {
  $.notify(msg, { className: 'warn', position:'top left' });
}

// output info message
function outputInfoMessage(msg) {
  $.notify(msg, { className: 'info', position:'top left' });
}
