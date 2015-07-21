_ = require('underscore');



// the chatserver listens to the chatclient
var Server = function(options) {

  // Server
  var self = this;
  // io from server.js
  self.io = options.io;

  // server's online user list
  self.users = [];

  // server's room list
  self.rooms = [{name: 'Gen Pop', chatlog: []}, {name: 'waterber', chatlog: []}, {name: 'dtunnelsnek', chatlog: []}, {name: 'magikarp', chatlog: []}];


  self.init = function() {
    // Fired upon a connection
    self.io.on('connection', function(socket){
     console.log('a mothafucka is connected');
     socket.chat = {};
     // ManageConnection handles username validations.
     // If validations pass, sets response listeners that 
     // listen to the chatclient.
     self.manageConnection(socket);
   });
};

  self.manageConnection = function(socket) {

    socket.on('login', function(username) {

      // username length validation
      var nameBad = !username || username.length < 3 || username.length > 10;
      if (nameBad) {
        socket.emit('loginNameBad', username);
        return;
      }

      // username exists validation
      var nameExists = _.some(self.users, function(user) {
        return user.username == username;
      });
      if (nameExists) {
        socket.emit("loginNameExists", username);
      } else {
        // if username does not exist, create user, passes in user name and the socket
        // keep in mind this model is not a backbone UserModel, it's a server User model
        // defined at the bottom of this page
        var newUser = new User({ username: username, socket: socket });

        //pushes User model to online user array
        self.users.push(newUser);

        // calls method below
        self.setResponseListeners(newUser);

        // joins default room
        self.addToRoom(newUser, socket, 'default');

        // emits 'welcome' and 'userJoined' to the chatclient
        socket.emit("welcome");
        // self.io.sockets.emit("userJoined", newUser.username);
      }
    });
  };
    

  self.setResponseListeners = function(user) {

    // listens for a user socket to disconnect, removes that user
    // from the online user array
    user.socket.on('disconnect', function() {
console.log('USER: ', user);
      self.users.splice(self.users.indexOf(user), 1);
      self.io.sockets.emit("userLeft", user.username);
      self.leaveRoom(user, user.socket);
      console.log('he gone.');
    });

    // listens to the 'onlineUsers' event, updates the online users array on
    // a change from the client.
    user.socket.on("onlineUsers", function() {
      // creates new array of online usernames
console.log("chatserver - self.users: ", self.users);
      var users = _.map(self.users, function(user) {
        return user.username;
      });
      // emits updated online usernames array to chatclient
      user.socket.emit("onlineUsers", users);
    });




    user.socket.on("rooms", function() {
      var rooms = _.map(self.rooms, function(room) {
        return room;
      });
      user.socket.emit("rooms", rooms);
    });





    // listening for a 'chat' event from client, 
    // if there is a chat event, emit an object containing the username
    // and chat message to the collection of sockets connected to the server.
    // Basically, this does the job of 'broadcast'.
    user.socket.on("chat", function(chat) {
      console.log('----------------------------------------');
console.log("USER: ", user.username);
console.log('CHAT: ', chat);
console.log('USER.SOCKET.CHAT.ROOM ', user.socket.chat.room);
console.log('self.io.sockets.adapter.rooms: ', self.io.sockets.adapter.rooms);
      if (chat) {
        self.io.sockets.to(user.socket.chat.room).emit("chat", { room: user.socket.chat.room, sender: user.username, message: chat });
      }
    });


    // these are listening for their respective chatclient events,
    // then the user socket broadcasts an event to all the other connected sockets.
    user.socket.on("typing", function() {
      user.socket.broadcast.emit("typing", { username: user.username });
    });
    user.socket.on("stop typing", function() {
      user.socket.broadcast.emit("stop typing");
    });

    // joins user to a room
    user.socket.on('joinRoom', function(roomName) {
console.log('-------->-----------joinRoom-------------<---------');
      user.socket.leave(user.socket.chat.room);
      self.leaveRoom(user, user.socket);
      self.addToRoom(user, user.socket, roomName);
    });

    // set room

  };

  self.leaveRoom = function(user, socket) {
    var currentRoom = user.socket.chat.room;
console.log("CURRENTROOM: ", currentRoom);
console.log("USER: ", user.username);
    var rooms = _.map(self.rooms, function(roo) {
console.log("roo: ", roo);
      return roo;
    });
console.log("rooms: ", rooms);
      // emits updated online usernames array to chatclient
      socket.emit("rooms", rooms);
      socket.broadcast.to(currentRoom).emit('userLeft', user.username);
  };

  self.addToRoom = function(user, socket, roomName) {
console.log("addToRoom: ", roomName);
    socket.join(roomName);
    socket.chat.room = roomName;
    socket.emit('setRoom', roomName);
console.log("io.sockets.adapter.rooms:  ", self.io.sockets.adapter.rooms);
     socket.broadcast.to(roomName).emit('userJoined', user.username);
  };
};


// User Model
var User = function(args) {
  var self = this;
  self.socket = args.socket;
  // self.socket.chat.room = 'default';
  self.username = args.username;
};

// allows export to server.js
module.exports = Server;

