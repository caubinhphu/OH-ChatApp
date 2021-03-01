const Emoji = (() => {
  const wrapInputChat = document.querySelector('.wrap-chat-input')
  if (wrapInputChat) {
    const emojiData =
    '[{"emoji":"👍","dec":128077},{"emoji":"👎","dec":128078},{"emoji":"🤚","dec":129306},{"emoji":"💖","dec":128150},{"emoji":"😀","dec":128512},{"emoji":"😁","dec":128513},{"emoji":"😂","dec":128514},{"emoji":"😃","dec":128515},{"emoji":"😄","dec":128516},{"emoji":"😅","dec":128517},{"emoji":"😆","dec":128518},{"emoji":"😇","dec":128519},{"emoji":"😈","dec":128520},{"emoji":"😉","dec":128521},{"emoji":"😊","dec":128522},{"emoji":"😋","dec":128523},{"emoji":"😌","dec":128524},{"emoji":"😍","dec":128525},{"emoji":"😎","dec":128526},{"emoji":"😏","dec":128527},{"emoji":"😐","dec":128528},{"emoji":"😑","dec":128529},{"emoji":"😒","dec":128530},{"emoji":"😓","dec":128531},{"emoji":"😔","dec":128532},{"emoji":"😕","dec":128533},{"emoji":"😖","dec":128534},{"emoji":"😗","dec":128535},{"emoji":"😘","dec":128536},{"emoji":"😙","dec":128537},{"emoji":"😚","dec":128538},{"emoji":"😛","dec":128539},{"emoji":"😜","dec":128540},{"emoji":"😝","dec":128541},{"emoji":"😞","dec":128542},{"emoji":"😟","dec":128543},{"emoji":"😠","dec":128544},{"emoji":"😡","dec":128545},{"emoji":"😢","dec":128546},{"emoji":"😣","dec":128547},{"emoji":"😤","dec":128548},{"emoji":"😥","dec":128549},{"emoji":"😦","dec":128550},{"emoji":"😧","dec":128551},{"emoji":"😨","dec":128552},{"emoji":"😩","dec":128553},{"emoji":"😪","dec":128554},{"emoji":"😫","dec":128555},{"emoji":"😬","dec":128556},{"emoji":"😭","dec":128557},{"emoji":"😮","dec":128558},{"emoji":"😯","dec":128559},{"emoji":"😰","dec":128560},{"emoji":"😱","dec":128561},{"emoji":"😲","dec":128562},{"emoji":"😳","dec":128563},{"emoji":"😴","dec":128564},{"emoji":"😵","dec":128565},{"emoji":"😶","dec":128566},{"emoji":"😷","dec":128567},{"emoji":"🙁","dec":128577},{"emoji":"🙂","dec":128578},{"emoji":"🙃","dec":128579},{"emoji":"🙄","dec":128580},{"emoji":"🤐","dec":129296},{"emoji":"🤑","dec":129297},{"emoji":"🤒","dec":129298},{"emoji":"🤓","dec":129299},{"emoji":"🤔","dec":129300},{"emoji":"🤕","dec":129301},{"emoji":"🤠","dec":129312},{"emoji":"🤡","dec":129313},{"emoji":"🤢","dec":129314},{"emoji":"🤣","dec":129315},{"emoji":"🤤","dec":129316},{"emoji":"🤥","dec":129317},{"emoji":"🤧","dec":129319},{"emoji":"🤨","dec":129320},{"emoji":"🤩","dec":129321},{"emoji":"🤪","dec":129322},{"emoji":"🤫","dec":129323},{"emoji":"🤬","dec":129324},{"emoji":"🤭","dec":129325},{"emoji":"🤮","dec":129326},{"emoji":"🤯","dec":129327},{"emoji":"🧐","dec":129488}]';

    const wrapEmoji = document.createElement('div');

    $(wrapEmoji).addClass('wrap-emojis');

    wrapEmoji.innerHTML = JSON.parse(emojiData)
      .map(
        (emoji) =>
        `<button class="emoji-btn">&#${emoji.dec};</button>`
      )
      .join('');

    wrapInputChat.appendChild(wrapEmoji);

    document.querySelectorAll('.emoji-btn').forEach((btn) => {
      btn.addEventListener('click', function () {
        document.getElementById('msg').value += this.innerHTML;
        document.getElementById('msg').focus();
        // $('.wrap-emojis').removeClass('is-active');
      });
    });
    $(document).on('click', '.open-emojis', () => {
      if ($('.wrap-emojis').hasClass('is-active')) {
        $('.wrap-emojis').removeClass('is-active');
      } else {
        $('.wrap-emojis').addClass('is-active');
      }
    })
    $(document).on('click', e => {
      const $target = $(e.target)
      if(!$target.closest('.wrap-emojis').length &&
        !$target.closest('.open-emojis').length &&
        $('.wrap-emojis').hasClass('is-active'))
      {
        $('.wrap-emojis').removeClass('is-active')
      }
    });
  }
})()

export default Emoji
