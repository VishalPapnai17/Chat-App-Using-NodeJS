const http = require("http")
const path = require("path")
const express = require("express")
const socketio = require("socket.io")
const Filter = require("bad-words")
const { generateMessage, generatelocation } = require('./utils/messages')
const { addUser , removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express();
const server = http.createServer(app);
const io = socketio(server)

const PORT = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname,'../public')

app.use(express.static(publicDirectoryPath));

io.on('connection',(socket)=>{
    console.log('new websocket connection');
    
    socket.on('join',(options, callback)=>{
        const {error,user} = addUser({id:socket.id, ...options})
        if(error){
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message',generateMessage('Admin!','Welcome!'))
        socket.broadcast.to(user.room).emit('message',generateMessage('Admin!',user.username + ' has joined!'))
        io.to(user.room).emit('roomData',{
            room: user.room,
            users: getUsersInRoom(user.room) 
        })

        callback()
        
        //socket.emit, io.emit, socket.broadcast.emit
        //io.to(roomname).emit, socket.broadcast.to(roomname).emit
    })

    socket.on('sendMessage',(message, callback)=>{
        const user = getUser(socket.id)
        const filter = new Filter()
        if(filter.isProfane(message)){
            return callback('Profanity is not allowed')
        }
        io.to(user.room).emit('message',generateMessage(user.username,message))
        callback()
    })
    
    socket.on('location',(location, callback) => {
        const user = getUser(socket.id)
        lat = location.latitude
        long = location.longitude
        io.to(user.room).emit('locationMessage',generatelocation(user.username,'https://google.com/maps?q=' + lat + "," + long))
        callback()
    })

    socket.on('disconnect',()=>{
        const user = removeUser(socket.id)

        if(user){
            io.to(user.room).emit('message',generateMessage('Admin!',user.username + ' has left!'))
            io.to(user.room).emit('roomData',{
                room: user.room,
                users: getUsersInRoom(user.room) 
            })
        }
    })
})

server.listen(PORT,()=>console.log('Server is running on port', PORT));

