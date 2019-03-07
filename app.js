var io = require('socket.io')(process.env.PORT||5000);
var shortid = require('shortid');

var express = require('express');
var app = express();
var router = express.Router();
var mongoose = require('mongoose');

var db = require('./config/database');

//gets ride of warning for Mongoose
mongoose.Promise = global.Promise;

//connect to mongodb using mongoose
mongoose.connect(db.mongoURI, {
    useMongoClient:true
}).then(function(){console.log("MongoDB Connected")}).catch(function(err){console.log(err)});

//Load in Models
require('./models/Users');
var Users = mongoose.model('Users');

var players = [];
//var playerCount = 0;

console.log("Server Running");

io.on('connection', function(socket){
    console.log("Connected to Unity");
    socket.emit('connected');

    var thisPlayerId = shortid.generate();

    var player = {
        id:thisPlayerId,
        position:{
            v:0
        }
    }

    players[thisPlayerId] = player;
    socket.emit('register', {id:thisPlayerId});
    socket.broadcast.emit('spawn', {id:thisPlayerId});
    socket.broadcast.emit('requestPosition');


    for(var playerId in players){
        if(playerId == thisPlayerId)
            continue;

        socket.emit('spawn', players[playerId]);
        console.log("Sending Spawn to New With ID", thisPlayerId);
    }

    socket.on('senddata', function(data){
        console.log(JSON.stringify(data));

        var newUser = {
            name:data.name
        }
        new Users(newUser).save().then(function(users){
            console.log("Sending data to database");
            Users.find({}).then(function(users){
                console.log(users);
                socket.emit('hideform', {users});
            });            
        });
    });

    socket.on('sayhello', function(data){
        console.log("Unity Game Says Hello");
        socket.emit('talkback');
    });

    socket.on('disconnect', function(){
        console.log("Player Disconnected");
        delete players[thisPlayerId];
        socket.broadcast.emit('disconnected', {id:thisPlayerId});
    });

    socket.on('move', function(data){
        data.id = thisPlayerId;
        //console.log("Player Moved", JSON.stringify(data));
        socket.broadcast.emit('move', data);
    });

    socket.on('updatePosition', function(data){
        data.id = thisPlayerId;
        console.log(JSON.stringify(data));
        socket.broadcast.emit('updatePosition', data);
    });
})