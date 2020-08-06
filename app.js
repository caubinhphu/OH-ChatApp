require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');

// init server
const app = express();
const server = http.createServer(app);

// io
const io = require('socket.io')(server);

// port of server
const PORT = process.env.PORT || 3000;

// use body-parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use cookie parser
app.use(cookieParser(process.env.COOKIE_SECRET));

// router
const chatRoute = require('./routers/chat.route');
const loginRoute = require('./routers/login.route');
const messengerRoute = require('./routers/messenger.route');

// middleware
const loginMiddleware = require('./middlewares/login.middleware');
const { use } = require('./routers/chat.route');

// set public folder
app.use(express.static(path.join(__dirname, 'public')));

// set view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
// flash
app.use(flash());

// handle socket
require('./socket/socket')(io);

// message middleware
app.use((req, res, next) => {
  res.locals.successText = req.flash('success_msg');
  res.locals.errorText = req.flash('error_msg');
  next();
});

// use router
app.use('/', chatRoute);
app.use('/login', loginRoute);
app.use('/messenger', loginMiddleware, messengerRoute);

// handle error middleware
app.use((err, req, res, next) => {
  if (err) {
    console.log(err);
  }
  res.send(err.message);
});

server.listen(PORT, () => console.log(`Server is running at port ${PORT}`));
