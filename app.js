require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');

// init server
const app = express();
const server = http.createServer(app);

// io
const io = require('socket.io')(server);

// port of server
const PORT = process.env.PORT || 3000;

// router
const chatRoute = require('./routers/chat.route');

// set public folder
app.use(express.static(path.join(__dirname, 'public')));

// set view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// handle socket
require('./socket/socket')(io);

// use router
app.use('/', chatRoute);

server.listen(PORT, () => console.log(`Server is running at port ${PORT}`));
