const port = process.env.PORT || 8000
console.log('listening on port ', port);
const io = require('socket.io')(port, {
  transports: ['websocket'],
  pingTimeout: 60000
});

//
const firebase = require('firebase')

// Initialize Firebase
const config = {
  apiKey: "AIzaSyDVL8oNN6oMXZT1HFGuzR-XxdRiP2PU9K0",
  authDomain: "stp-data-30060.firebaseapp.com",
  databaseURL: "https://stp-data-30060.firebaseio.com",
  projectId: "stp-data-30060",
  storageBucket: "stp-data-30060.appspot.com",
  messagingSenderId: "908372679886"
};

//initialize firebase
const firebaseApp = firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(config);
const db = firebaseApp.firestore();

var users = {}
var waiting = []
var order = 0
var chat = []
var clap = 0

let length = 1298
let start = 0
setInterval(() => {
  start++
  if(start >= length) {
    start = 0
  }
},6000)

var threshold = 30

io.on('connection', (client) => {

  client.on('ready', () => {
    if(Object.keys(users).length < threshold) {
      client.emit('ready')
    } else {
      waiting.push(client.id)
      client.emit('queue',waiting.length)
    }
  })

  client.on('onboard', (userData) => {
    users[client.id] = {id: client.id, role: userData.role, realname: userData.first+' '+userData.last, data: {}}
    client.emit('exist', users)

    io.emit('newuser', users[client.id])
    client.emit('chathistory', chat)
    client.emit('artstart', start)
    //get data
    let logtime = Date.now()
    db.collection('login').doc(logtime+'_'+client.id).set({
      first: userData.first,
      last: userData.last,
      email: userData.email,
      logtime: logtime
    })
    users[client.id].logtime = logtime
  })

  client.on('move', data => {
    if(users[client.id]){
      users[client.id].data = data
    }
  })

  client.on('threshold', data => {
    threshold = data
  })

  client.on('clap', () => {
    clap++
    if(clap > 10) {
      clap = 0
      db.collection('clap').doc().set({
        clap:true
      })
    }
  })

  client.on('message', data => {
    chat.push({id:client.id, msg: data.data, name:data.name})
    io.emit('chathistory', chat)
    if(chat.length >= 20) {
      let newchat = chat.splice(10)
      let time = Date.now()
      db.collection('chat').doc('m'+time).set({
        chat: chat
      })
      chat = newchat
    }
    io.emit('message', {id:client.id, msg: data.data, name: data.name})
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
      //get data
      let leavetime = Date.now()
      db.collection('login').doc(users[client.id].logtime+'_'+client.id).update({
        leavetime: leavetime
      })
      delete users[client.id]


      if(Object.keys(users).length < threshold) {
        let next = waiting.shift()
        io.to(next).emit('ready')
      }
    }

  });

});

setInterval(() => {
  io.emit('render',users)
  io.emit('threshold', threshold)
},20)
