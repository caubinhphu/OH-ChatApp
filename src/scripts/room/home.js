const Home = (() => {
  if (document.formLogin) {
    document.formLogin.addEventListener('submit', () => {
      $('.wrap-loader').removeClass('d-none')
    })
  }
  if (document.formRegister) {
    document.formRegister.addEventListener('submit', () => {
      $('.wrap-loader').removeClass('d-none')
    })
  }
})()

export default Home