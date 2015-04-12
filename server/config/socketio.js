/**
* Socket.io configuration
*/

'use strict';

var config = require('./environment'),
os = require('os'),
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
  // socket.io (v1.x.x) is powered by debug.
  // In order to see all the debug output, set DEBUG (in server/config/local.env.js) to including the desired scope.
  //
  // ex: DEBUG: "http*,socket.io:socket"

  // We can authenticate socket.io users and access their token through socket.handshake.decoded_token
  //
  // 1. You will need to send the token in `client/components/socket/socket.service.js`
  //
  // 2. Require authentication here:
  socketio.use(require('socketio-jwt').authorize({
    secret: config.secrets.session,
    handshake: true
  }));

  socketio.on('connection', function (socket) {
    socket.address = socket.handshake.address !== null ?
    socket.handshake.address.address + ':' + socket.handshake.address.port :
    process.env.DOMAIN;

    socket.connectedAt = new Date();

    socket.broadcast.emit('live', socket.id, socket.decoded_token._id);

    // Call onDisconnect.
    socket.on('disconnect', function () {
      // numClients--;

      // socket.emit('quit', room, socket.id);
      onDisconnect(socket);
      console.info('[%s] DISCONNECTED', socket.address);
    });

    // Call onConnect.
    onConnect(socket);
    console.info('[%s] CONNECTED', socket.address);


    function log(){
      var array = [">>> Message from server:"];
      array.push.apply(array, arguments);
      // socket.emit('log', array);
    }

    socket.on('message', function (message, room) {
      log('Client said:', message);
      console.log(message);
      // for a real app, would be room only (not broadcast)
      socketio.sockets.in(room).emit('message', message,  socket.id, socket.decoded_token._id);
    });

    socket.on('create or join', function (room) {
      log('Request to create or join room ' + room);
      var numClients = 0;

      var _room = socketio.of('/').adapter.rooms[room];
      if (_room) {
        for (var property in _room) {
          if(_room.hasOwnProperty(property))
            numClients++;
        }
      }

      console.log(_room);

      log('Room ' + room + ' has ' + numClients + ' client(s)');
      if (numClients === 0){
        console.log('>>>>> created');
        socket.join(room);
        socket.emit('created', room, socket.id);
      } else if (numClients <= 5) {
        console.log('>>>>> joined');
        socket.join(room);
        socket.emit('joined', room, socket.id);
        socketio.sockets.in(room).emit('ready');

      } else { // max two clients
        console.log('>>>>> full');
        socket.emit('full', room);
      }
      numClients++;
    });

    socket.on('ipaddr', function () {
      var ifaces = os.networkInterfaces();
      for (var dev in ifaces) {
        ifaces[dev].forEach(function (details) {
          if (details.family=='IPv4' && details.address != '127.0.0.1') {
            socket.emit('ipaddr', details.address);
          }
        });
      }
    });
  });
};
