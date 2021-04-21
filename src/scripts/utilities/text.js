import Quill from 'quill';

const Text = (() => {
  const Size = Quill.import('attributors/style/size');
  Size.whitelist = [ '12px', '18px', '24px', '28px', '32px', '40px', '50px'];
  Quill.register(Size, true);
  const toolbarOptions = [
    [{ 'font': [] }],
    [{ 'size': [ false, '12px', '18px', '24px', '28px', '32px', '40px', '50px'] }],
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'align': [] }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [ 'link', 'image', 'video' ],
    ['clean']
  ];
  const quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
      toolbar: toolbarOptions
    }
  });

})()

export default Text
