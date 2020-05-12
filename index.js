const port = process.env.PORT || 8000
console.log('listening on port ', port);
const io = require('socket.io')(port, {
  transports: ['websocket'],
  pingTimeout: 60000
});

var users = {}

io.on('connection', (client) => {
  client.on('onboard', (userData) => {
    users[client.id] = {id: client.id, name: userData, data: {}}
    client.emit('existuser', users)
    io.emit('newuser', users[client.id])
  })

  client.on('move', data => {
    if(users[client.id]){
      users[client.id].data = data
    }
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
