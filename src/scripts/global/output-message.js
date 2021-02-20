import './notify'

// output error message
function outputErrorMessage(msg) {
  hideLoader()
  $.notify(msg, { className: 'error', position:'top left' });
}

// output success message
function outputSuccessMessage(msg) {
  hideLoader()
  $.notify(msg, { className: 'success', position:'top left' });
}

// output warning message
function outputWarnMessage(msg) {
  hideLoader()
  $.notify(msg, { className: 'warn', position:'top left' });
}

// output info message
function outputInfoMessage(msg) {
  hideLoader()
  $.notify(msg, { className: 'info', position:'top left' });
}

const OutputMessage = (() => {
  window.outputErrorMessage = outputErrorMessage;
  window.outputSuccessMessage = outputSuccessMessage;
  window.outputWarnMessage = outputWarnMessage;
  window.outputInfoMessage = outputInfoMessage;
})()

export default OutputMessage

