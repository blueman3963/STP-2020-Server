const port = process.env.PORT || 8000
console.log('listening on port ', port);
const io = require('socket.io')(port, {
  transports: ['websocket'],
  pingTimeout: 60000
});

var users = {}
var light = {spot: .5, env: .5}

io.on('connection', (client) => {
  client.on('onboard', (userData) => {
    users[client.id] = {id: client.id, name: userData.name, realname: userData.realname, gender: userData, data: {}}
    client.emit('existuser', users)
    io.emit('newuser', users[client.id])
    client.emit('light', light)
  })

  client.on('move', data => {
    if(users[client.id]){
      users[client.id].data = data
    }
  })

  client.on('light', data => {
    light = data
    io.emit('light', light)
  })
  // disconnect
  client.on('disconnect', (data) => {
    io.emit('kill', client.id)
    delete users[client.id]
  });
});

setInterval(() => {
  io.emit('render',users)
},20)
