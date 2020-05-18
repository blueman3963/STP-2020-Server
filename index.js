const port = process.env.PORT || 8000
console.log('listening on port ', port);
const io = require('socket.io')(port, {
  transports: ['websocket'],
  pingTimeout: 60000
});

var users = {}
var waiting = []
var order = 0

io.on('connection', (client) => {

  client.on('ready', () => {
    if(Object.keys(users).length < 2) {
      client.emit('ready')
    } else {
      waiting.push(client.id)
      client.emit('queue',waiting.length)
    }
  })

  client.on('onboard', (userData) => {
    users[client.id] = {id: client.id, role: userData.role, realname: userData.realname, data: {}}
    client.emit('exist', users)
    io.emit('newuser', users[client.id])
  })

  client.on('move', data => {
    if(users[client.id]){
      users[client.id].data = data
    }
  })

  // disconnect
  client.on('disconnect', (data) => {


    waiting.forEach((id,index) => {
      io.to(id).emit('queue',index+1)
      if(id == client.id) {
        waiting.splice(index,1)
      }
    })

    if(users[client.id]) {
      io.emit('kill', client.id)
      delete users[client.id]

      let next = waiting.shift()
      io.to(next).emit('ready')
    }


  });

});

setInterval(() => {
  io.emit('render',users)
},20)
