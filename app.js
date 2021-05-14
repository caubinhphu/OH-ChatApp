require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const methodOverride = require('method-override');
const compression = require('compression')

// init server
const app = express();
const server = http.createServer(app);

// config passport
require('./config/passport').local(passport);
require('./config/passport').facebook(passport);
require('./config/passport').google(passport);

// io
const io = require('socket.io')(server);

// port of server
const PORT = process.env.PORT || 3000;

// gzip compression
app.use(compression())

// set public folder
app.use(express.static(path.join(__dirname, 'public')));

// set view engine
app.set('view engine', 'pug');
// set views folder
app.set('views', path.join(__dirname, 'views'));

// body-parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// cookie parser middleware
app.use(cookieParser(process.env.COOKIE_SECRET));

// method http override using string query
// app.use(methodOverride('_method'));
// method http override using form
app.use(
  methodOverride((req) => {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      // look in urlencoded POST bodies and delete it
      const method = req.body._method;
      delete req.body._method;
      return method;
    }
  })
);

// session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// passport middleware
app.use(passport.initialize());
app.use(passport.session());

// flash middleware
app.use(flash());

// router
const chatRoute = require('./routers/chat.route');
const loginRoute = require('./routers/login.route');
const messengerRoute = require('./routers/messenger.route');
const utilitiesRoute = require('./routers/utilities.route');

// middleware
const { checkAuthenticated } = require('./middlewares/login.middleware');

// handle socket
require('./socket/socket')(io);

// message middleware
app.use((req, res, next) => {
  res.locals.successText = req.flash('success');
  res.locals.errorText = req.flash('error');
  res.locals.tab = req.flash('tab');
  res.locals.subTab = req.flash('sub-tab');
  next();
});

// use router
app.use('/', chatRoute);
app.use('/login', loginRoute);
app.use('/messenger', checkAuthenticated, messengerRoute);
app.use('/utility', utilitiesRoute);
app.use('/no-support', (req, res) => {
  res.render('no-support', {
    titleSite: 'OH - Chat'
  })
})

// handle error middleware
app.use((err, req, res, next) => {
  if (err) {
    // console.log(err);
  }
  res.status(500);
  // res.send(err.message);
  res.render('error', {
    titleSite: 'OH - Chat',
    messageError: err.message
  })
});

// 404
app.use(function(req, res) {
  res.status(404);

  // respond with json
  if (req.xhr) {
    res.json({ message: 'Not found' });
  } else {
    // respond with html page
    res.render('404', { url: req.url });
  }
});

server.listen(PORT, () => console.log(`Server is running at port ${PORT}`));
