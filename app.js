require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

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

// set public folder
app.use(express.static(path.join(__dirname, 'public')));

// set view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// handle socket
require('./socket/socket')(io);

// use router
app.use('/', chatRoute);
app.use('/login', loginRoute);
app.use('/messenger', messengerRoute);

server.listen(PORT, () => console.log(`Server is running at port ${PORT}`));
