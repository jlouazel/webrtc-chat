/**
* Socket.io configuration
*/

'use strict';

var config = require('./environment'),
os = require('os'),
_ = require('lodash'),
numClients = 0;

// When the user disconnects.. perform this
function onDisconnect(socket) {
}

// When the user connects.. perform this
function onConnect(socket) {

  // When the client emits 'info', this listens and executes
  socket.on('info', function (data) {
    console.info('[%s] %s', socket.address, JSON.stringify(data, null, 2));
  });

  // Insert sockets below
  require('../api/message/message.socket').register(socket);
}

module.exports = function (socketio) {
  require('../api/user/user.socket').register(socketio);

  socketio.use(require('socketio-jwt').authorize({
    secret: config.secrets.session,
    handshake: true
  }));

  socketio.on('connection', function (socket) {


    socket.address = socket.handshake.address !== null ?
    socket.handshake.address.address + ':' + socket.handshake.address.port :
    process.env.DOMAIN;

    socket.connectedAt = new Date();

    socket.on('init', function(userId) {
      socket.broadcast.emit('init', userId);
    });

    socket.on('signal', function(userId, message) {
      var sockets = socketio.sockets.sockets;

      for (var i = 0, len = sockets.length; i < len; i++) {
        if (sockets[i].decoded_token._id === userId) {
          sockets[i].emit('signal', message);
        }
      }
    });

    // Call onDisconnect.
    socket.on('disconnect', function () {
      socketio.emit('dead', socket.id, socket.decoded_token._id);
      onDisconnect(socket);
    });

    onConnect(socket);
  });
};
