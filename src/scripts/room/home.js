// import axios from 'axios';

const Home = (async () => {
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
  // try {
  //   const response = await axios.get('/messenger', {
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'X-Requested-With': 'XMLHttpRequest'
  //   }
  // })

  // console.log(response);
  // } catch (error) {
  //   console.dir(error);
  // }
})()

export default Home