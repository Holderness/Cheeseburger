
var app = app || {};

(function () {

  app.ChatModel = Backbone.Model.extend({});

})();

var app = app || {};

(function () {

  app.ChatroomHeaderModel = Backbone.Model.extend({});

})();

var app = app || {};

(function () {

  app.ContainerModel = Backbone.Model.extend({});

})();

var app = app || {};

(function () {

  app.LoginModel = Backbone.Model.extend({
    defaults: {
      error: ""
    }
  });


})();

var app = app || {};

(function () {

  app.UserModel = Backbone.Model.extend({});
  
})();

var app = app || {};

(function () {

  app.ChatCollection = Backbone.Collection.extend({
    model: app.ChatModel
  });

})();

var app = app || {};

(function () {

  app.UserCollection = Backbone.Collection.extend({model: app.UserModel});

})();

var app = app || {};

(function () {

app.ChatroomModel = Backbone.Model.extend({
  urlRoot: '/api/chatrooms',
  defaults: {
    chatroom: new app.ChatroomHeaderModel({ name: 'DOO'}),
    onlineUsers: new app.UserCollection(),
    offlineUsers: new app.UserCollection(),
    chatlog: new app.ChatCollection([
      // message and sender upon entering chatroom
      new app.ChatModel({ sender: 'Butters', message: 'awwwwww hamburgers. ||):||', timestamp: _.now() })
      ]),
    chatrooms: null,
    privateRooms: null,
    owner: null,
    modelsLoadedSum: 0,
  },
  loadModel: function() {
    console.log('crm.f.loadModel');
  },
  addUser: function(user) {
    console.log('crm.f.addUser');
    this.get('onlineUsers').add(new app.UserModel({ username: user.username, userImage: user.userImage }));
    console.log("--adding-user---");
  },
  removeUser: function(user) {
    console.log('crm.f.removeUser');
    var onlineUsers = this.get('onlineUsers');
    var foundUser = onlineUsers.find(function(userModel) { return userModel.get('username') == user.username; });
    if (foundUser) {
      onlineUsers.remove(foundUser);
    }
  },
  addChat: function(chat) {
    console.log('crm.f.addChat');
    var now = _.now();
    this.get('chatlog').add(new app.ChatModel({ sender: chat.sender, message: chat.message, timestamp: now, url: chat.url}));
    // this.trigger('gorp', chat);
  },
});

})();

var app = app || {};

(function () {

  app.InvitationModel = Backbone.Model.extend({

  });
  
})();

var app = app || {};

(function () {

  app.ChatroomList = Backbone.Collection.extend({
    model: app.ChatroomModel,
    url: '/api/chatrooms',
  });

})();
var app = app || {};

(function () {

  app.PrivateRoomCollection = Backbone.Collection.extend({
    model: app.ChatroomModel,
  });

})();

var app = app || {};

(function () {

  app.InvitationCollection = Backbone.Collection.extend({
    model: app.InvitationModel
  });

})();
var app = app || {};


(function($) {

  app.ChatImageUploadView = Backbone.View.extend({

    el: $('#chatImageUploadContainer'),
  
    events: {
      'change #chatImageUpload': 'renderThumb',
      'attachImage #chatImageUploadForm': 'upload',
      'click #addChatImageBtn': 'submit',
    },

    // initialize: function() {
    //   this.listenTo(this, "file-chosen", this.renderThumb, this);
    //   this.listenTo(this, "file-chosen", this.renderThumb, this);
    // },

    render: function() {
      this.renderThumb();
    },

    renderThumb: function() {
      var input = this.$('#chatImageUpload');
      var img = this.$('#uploadedChatImage')[0];
      if(input.val() !== '') {
        var selected_file = input[0].files[0];
        var reader = new FileReader();
        reader.onload = (function(aImg) {
          return function(e) {
            aImg.src = e.target.result;
          };
        })(img);
        reader.readAsDataURL( selected_file );
      }

    },

    submit: function(e) {
      e.preventDefault();
      this.$form = this.$('#chatImageUploadForm');
      this.$form.trigger('attachImage');
    },

    upload: function() {
      var _this = this;
        var formData = new FormData(this.$form[0]);
      if (this.$('#chatImageUpload')[0].files.length > 0) {
        $.ajax({
          type: 'POST',
          url: '/api/uploadChatImage',
          data: formData,
          cache: false,
          dataType: 'json',
          processData: false,
          contentType: false,
          error: function( xhr ) {
            _this.renderStatus('Error: ' + xhr.status);
            alert('Your image is either too large or it is not a .jpeg, .png, or .gif.');
          },
          success: function( response ) {
            console.log('imgUpload response: ', response);
            _this.$el.data('chat-type') === 'chat' ?
              _this.trigger('chat-image-uploaded', response) :
              _this.trigger('message-image-uploaded', response);
            console.log('imgUpload path ', response.path);
            $('#chatImageUploadModal').modal('hide');
            _this.clearField();
          }
        });
      } else {
       this.trigger('image-uploaded');
      }
      return false;
    },

    renderStatus: function( status ) {
      $('#status').text(status);
    },

    clearField: function() {
      this.$('#uploadedChatImage')[0].src = '';
      this.$('#chatImageUpload').val('');
    }

  });

})(jQuery);
var app = app || {};

(function ($) {

app.ChatroomView = Backbone.View.extend({
  template: _.template($('#chatroom-template').html()),
  chatTemplate: _.template($('#chatbox-message-template').html()),
  roomTemplate: _.template($("#room-list-template").html()),
  headerTemplate: _.template($('#chatroom-header-template').html()),
  directMessageHeaderTemplate: _.template($('#direct-message-header-template').html()),
  onlineUserTemplate: _.template($('#online-users-list-template').html()),
  offlineUserTemplate: _.template($('#offline-users-list-template').html()),
  dateTemplate: _.template('<div class="followWrap"><div class="followMeBar"><span>-----</span><span> <%= moment(timestamp).format("MMMM Do") %> </span><span>-----</span></div></div>'),
  events: {
    'keypress .message-input': 'messageInputPressed',
    'keypress .direct-message-input': 'directMessageInputPressed',
    'click .chat-directory .room': 'setRoom',
    'keypress #chat-search-input': 'search',
    'click .remove-chatroom': 'removeRoom',
    'click #destroy-chatroom': 'destroyRoom',
    'keyup #chatroom-name-input': 'doesChatroomExist',
    'click .user': 'initDirectMessage',
  },

  doesChatroomExist: function(e) {
    e.preventDefault();
    var this_ = this;
    var check = function() {
      if ($.trim($('#chatroom-name-input').val()).length > 0) {
        var chatroomName = $('#chatroom-name-input').val();
         this_.vent.trigger('doesChatroomExist', chatroomName);
      } else {
         this_.$('#chatroom-name-validation-container').children().remove();
         this_.$('#chatroom-name-input').removeClass('input-valid input-invalid');
      }
    };
    _.debounce(check(), 150);
  },

  renderChatroomAvailability: function(availability) {
    this.$('#chatroom-name-input').removeClass('input-valid input-invalid');
    $('#chatroom-name-validation-container').children().remove();
    if (availability === true) {
      this.$('#chatroom-name-input').addClass('input-valid');
      this.$('#chatroom-name-validation-container').append('<div id="#chatroom-name-validation" class="fa fa-check">Name Available</div>');
    } else {
      this.$('#chatroom-name-input').addClass('input-invalid fa fa-times');
      this.$('#chatroom-name-validation-container').append('<div id="#chatroom-name-validation" class="fa fa-times">Name Unavailable</div>');
    }
  },



  initialize: function(options) {
    console.log('chatroomView.f.initialize: ', options);
    // passed the viewEventBus
    var self = this;
    this.vent = options.vent;
  },
  render: function(model) {
    console.log('crv.f.render');
    this.model = model || this.model;
    this.$el.html(this.template(this.model.toJSON()));
    this.afterRender();
    return this;
  },
  afterRender: function() {
    this.setSubViews();
    this.setChatListeners();
    this.chatroomSearchTypeahead();
  },
  setSubViews: function() {
    this.chatImageUploadView = new app.ChatImageUploadView();
    this.chatImageUploadView.setElement(this.$('#chatImageUploadContainer'));
    this.chatroomImageUploadView = new app.ChatroomImageUploadView();
    this.chatroomImageUploadView.setElement(this.$('#createChatroomContainer'));
  },
  setChatListeners: function() {

    var onlineUsers = this.model.get('onlineUsers');
    this.listenTo(onlineUsers, "add", this.renderUser, this);
    this.listenTo(onlineUsers, "remove", this.renderUsers, this);
    this.listenTo(onlineUsers, "reset", this.renderUsers, this);

    var offlineUsers = this.model.get('offlineUsers');
    this.listenTo(offlineUsers, "add", this.renderOfflineUser, this);
    this.listenTo(offlineUsers, "remove", this.renderOfflineUsers, this);
    this.listenTo(offlineUsers, "reset", this.renderOfflineUsers, this);

    var chatlog = this.model.get('chatlog');
    this.listenTo(chatlog, "add", this.renderChat, this);
    this.listenTo(chatlog, "remove", this.renderChats, this);
    this.listenTo(chatlog, "reset", this.renderChats, this);

    var chatrooms = this.model.get('chatrooms');
    this.listenTo(chatrooms, "add", this.renderRoom, this);
    this.listenTo(chatrooms, "remove", this.renderRooms, this);
    this.listenTo(chatrooms, "reset", this.renderRooms, this);

    var privateRooms = this.model.get('privateRooms');
    this.listenTo(privateRooms, "add", this.renderPrivateRoom, this);
    this.listenTo(privateRooms, "remove", this.renderPrivateRooms, this);
    this.listenTo(privateRooms, "reset", this.renderPrivateRooms, this);

    this.listenTo(this.model, "change:chatroom", this.renderHeader, this);

    this.listenTo(this.chatImageUploadView, 'chat-image-uploaded', this.chatUploadImage);
    this.listenTo(this.chatImageUploadView, 'message-image-uploaded', this.messageUploadImage);
    this.listenTo(this.chatroomImageUploadView, 'createRoom', this.createRoom);

    this.listenTo(this.model, "moreChats", this.renderMoreChats, this);

    this.listenTo(this.model, "chatroomAvailability", this.renderChatroomAvailability, this);

    var this_ = this;
    this.$('#chatbox-content').scroll(function(){
        // checks if there's enough chats to warrant a getMoreChats call
      if ($('#chatbox-content').scrollTop() === 0 && this_.model.get('chatlog').length >= 25) {
        if (this_.model.get('chatroom').get('chatType') === 'message') {
          _.debounce(this_.getMoreDirectMessages(), 3000);
        } else {
          _.debounce(this_.getMoreChats(), 3000);
        }
      }
    });

       $(window).resize(function() {
        var windowHeight = $(window).height();
        if (windowHeight > 500) {
          var newHeight = windowHeight - 285;
          $('#chatbox-content').height(newHeight);
        }

       });
  },


  chatroomSearchTypeahead: function() {
    // interesting - the 'this' makes a difference, can't find #chat-search-input otherwise
    this.$('#chat-search-input').typeahead({
      onSelect: function(item) {
        console.log(item);
      },
      ajax: {
        url: '/api/searchChatrooms',
        triggerLength: 1,
        limit: 5,
        minLength: 5,
        preDispatch: function (query) {
          return {
            name: query
          };
        },
        preProcess: function (data) {
          console.log(data);
          if (data.success === false) {
            // Hide the list, there was some error
            return false;
          }
          return data;
        }
      },
    });
  },



// headers

  renderHeader: function() {
    this.$('#chatbox-header').html(this.headerTemplate(this.model.get('chatroom').toJSON()));
    this.chatroomSettingsView = new app.ChatroomSettingsView({vent: this.vent, model: this.model.get('chatroom')});
    // debugger;
    this.chatroomSettingsView.setElement(this.$('#preferences-container'));
    // debugger;
    this.listenTo(this.chatroomSettingsView, 'updateRoom', this.updateRoom);
  },

  renderDirectMessageHeader: function() {
    this.$('#chatbox-header').html(this.directMessageHeaderTemplate(this.model.get('chatroom').toJSON()));
  },




// users

  renderUsers: function() {
    console.log('crv.f.renderUsers');
    onlineUsers = this.model.get("onlineUsers");
    console.log('USERS: ', onlineUsers);
    this.$('.online-users').empty();
    this.model.get("onlineUsers").each(function (user) {
      this.renderUser(user);
    }, this);
  },
  renderUser: function(model) {
    this.$('.online-users').append(this.onlineUserTemplate(model.toJSON()));
  },
  renderOfflineUsers: function() {
    console.log('crv.f.renderOfflineUsers');
    console.log('Offline USERS: ', this.model.get("offlineUsers"));
    this.$('.offline-users').empty();
    this.model.get("offlineUsers").each(function (user) {
      this.renderOfflineUser(user);
    }, this);
  },
  renderOfflineUser: function(model) {
    this.$('.offline-users').append(this.offlineUserTemplate(model.toJSON()));
  },





// chatlog

  renderChats: function() {
    console.log('crv.f.renderChats');
    console.log('CHATLOG: ', this.model.get("chatlog"));
    this.$('#chatbox-content').empty();
    this.model.get('chatlog').each(function(chat) {
      this.renderChat(chat);
    }, this);

    this.afterChatsRender();
  },

  renderChat: function(model) {
    this.renderDateDividers(model);
    var chatTemplate = $(this.chatTemplate(model.toJSON()));
    chatTemplate.appendTo(this.$('#chatbox-content')).hide().fadeIn().slideDown();
    $('#chatbox-content')[0].scrollTop = $('#chatbox-content')[0].scrollHeight;
  },

  renderDateDividers: function(model) {
    this.currentDate = moment(model.get('timestamp')).format('dddd, MMMM Do YYYY');
    if ( this.currentDate !== this.previousDate ) {
      var currentDate = $(this.dateTemplate(model.toJSON()));
      currentDate.appendTo(this.$('#chatbox-content')).hide().fadeIn().slideDown();
      this.previousDate = this.currentDate;
    }
  },

  getMoreChats: function() {
    console.log('crv.f.getMoreChats');
    var chatroom = this.model.get('chatroom'),
    name = chatroom.get('name'),
    modelsLoadedSum = chatroom.get('modelsLoadedSum');
    var chatlogLength = chatroom.get('chatlogLength');
    this.vent.trigger('getMoreChats', { name: name, modelsLoadedSum: modelsLoadedSum, chatlogLength: chatlogLength});
    chatroom.set('modelsLoadedSum', (modelsLoadedSum - 1));
  },

  getMoreDirectMessages: function() {
    console.log('crv.f.getMoreDriectMessages');
    var chatroom = this.model.get('chatroom'),
    id = chatroom.get('id'),
    modelsLoadedSum = chatroom.get('modelsLoadedSum');
    var chatlogLength = chatroom.get('chatlogLength');
    this.vent.trigger('getMoreDirectMessages', { id: id, modelsLoadedSum: modelsLoadedSum, chatlogLength: chatlogLength});
    chatroom.set('modelsLoadedSum', (modelsLoadedSum - 1));
  },

  renderMoreChats: function(chats) {
    console.log('crv.f.renderMoreChats');
    // this.$('#chatbox-content');
    var this_ = this;
    var originalHeight = $('#chatbox-content')[0].scrollHeight;
    this.moreChatCollection = [];
    _.each(chats, function(model) {
      this_.renderMoreDateDividers(model);
      var chatTemplate = $(this.chatTemplate(model.toJSON()));
      this_.moreChatCollection.push(chatTemplate);
      // chatTemplate.prependTo(this.$('#chatbox-content')).hide().fadeIn().slideDown();
    }, this);
    _.each(this.moreChatCollection.reverse(), function(template) {
      template.prependTo(this.$('#chatbox-content'));
    });

     this.dateDivider.load($(".followMeBar"));
     $('#chatbox-content')[0].scrollTop = $('#chatbox-content')[0].scrollHeight - originalHeight;
     
  },

  renderMoreDateDividers: function(model) {
    this.currentDate = moment(model.attributes.timestamp).format('dddd, MMMM Do YYYY');
    if ( this.currentDate !== this.previousDate ) {
      var currentDate = $(this.dateTemplate(model.toJSON()));
      // currentDate.appendTo(this.$('#chatbox-content')).hide().fadeIn().slideDown();
      this.moreChatCollection.push(currentDate);
      this.previousDate = this.currentDate;
    }
  },

  autosizer: function() {
    autosize($('#message-input'));
  },
  
  scrollBottomInsurance: function(){
    var this_ = this;
    var interval = setInterval(function(){
      this.$('#chatbox-content')[0].scrollTop = this.$('#chatbox-content')[0].scrollHeight;
    }, 50);
    return setTimeout(function(){
      clearInterval(interval);
    }, 800);
  },

  afterChatsRender: function() {
    this.autosizer();
    this.dateDivider.load($(".followMeBar"));
    this.scrollBottomInsurance();
  },








// rooms


  search: function(e) {
    if (e.keyCode === 13 && $.trim($('#chat-search-input').val()).length > 0) {
      e.preventDefault();
      var name = $('#chat-search-input').val();
      this.addChatroom(name);
      this.$('#chat-search-input').val('');
    } else {
      console.log('search typing');
    }
    return this;
  },
  createRoom: function(form) {
    this.vent.trigger('createRoom', form);
  },
  updateRoom: function(form) {
    var id = this.model.get('chatroom').get('id');
    form.id = id;
    this.vent.trigger('updateRoom', form);
  },
  destroyRoom: function(e) {
    e.preventDefault();
    var this_ = this;
    var confirmation = swal({
      title: "Do you wish to destroy the room?",
      text: "This kills the room.",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DEB0B0",
      confirmButtonText: "Muahaha!",
      closeOnConfirm: false,
      html: false
    }, function(){
      swal({
        title: "Eviscerated!",
        text: "Your chatroom has been purged.",
        type: "success",
        confirmButtonColor: "#749CA8",
      });
      this_.vent.trigger('destroyRoom', this_.model.get('chatroom').get('name'));
    });
  },
  addChatroom: function(name) {
    console.log('crv.f.addChatroom');
    this.vent.trigger('addRoom', name);
  },
  removeRoom: function(e) {
    var this_ = this;
    var confirmation = swal({
      title: "Remove This Room?",
      text: "Are you sure? Are you sure you're sure? How sure can you be?",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DEB0B0",
      confirmButtonText: "Muahaha!",
      closeOnConfirm: false,
      html: false
    }, function(){
      swal({
        title: "Removed!",
        text: "You are free of this chatroom. Go on, you're free now.",
        type: "success",
        confirmButtonColor: "#749CA8"
      });
      var name = $(e.target).data("room-name");
      this_.vent.trigger('removeRoom', name);
    });
  },
  renderRooms: function() {
    console.log('crv.f.renderRooms');
    console.log('CHATROOMS: ', this.model.get("chatrooms"));
    this.$('.public-rooms').empty();
    this.model.get('chatrooms').each(function (room) {
      this.renderRoom(room);
    }, this);
  },
  renderRoom: function(model) {
    var name1 = model.get('name'),
    name2 = this.model.get('chatroom').get('name');
    this.$('.public-rooms').append(this.roomTemplate(model.toJSON()));
    if (name1 === name2) {
      this.$('.room').last().find('.room-name').css('color', '#DEB0B0').fadeIn();
    }
  },
  renderPrivateRooms: function() {
    console.log('crv.f.renderPrivateRooms');
    console.log('PRIVATEROOMS: ', this.model.get("privateRooms"));
    this.$('#private-rooms').empty();
    this.model.get('privateRooms').each(function (room) {
      this.renderPrivateRoom(room);
    }, this);
  },
  renderPrivateRoom: function(model) {
    // var name1 = model.get('name'),
    // name2 = this.model.get('chatroom').get('name');
    this.$('#private-rooms').append(this.roomTemplate(model.toJSON()));
    // if (name1 === name2) {
    //   this.$('.room').last().find('.room-name').css('color', '#DEB0B0').fadeIn();
    // }
  },
  joinRoom: function(name) {
    console.log('crv.f.joinRoom');
     $('#chatImageUploadContainer').data('chat-type', 'chat');
    this.currentDate = '';
    this.previousDate = '';
    this.vent.trigger('joinRoom', name);
  },
// change to 'joinDirectMessage'
  initDirectMessage: function(e) {
    var recipient = {},
        $tar = $(e.currentTarget);
    recipient.username = $tar.text().trim();
    recipient.userImage = $tar.find('img').attr('src');
    this.currentDate = '';
    this.previousDate = '';
    if (this.model.get('chatroom').get('currentUser') !== recipient.username) {
      this.vent.trigger('initDirectMessage', recipient);
    }
  },





// image upload

 chatUploadImage: function(response) {
    console.log('img url: ', response);
    this.vent.trigger("chat", response);
    this.scrollBottomInsurance();
  },

  messageUploadImage: function(response) {
   console.log('img url: ', response);
   this.vent.trigger("directMessage", response);
   this.scrollBottomInsurance();
 },





  //events


  messageInputPressed: function(e) {
    if (e.keyCode === 13 && $.trim($('.message-input').val()).length > 0) {
      // fun fact: separate events with a space in trigger's first arg and you
      // can trigger multiple events.
      this.vent.trigger("chat", { message: this.$('.message-input').val()});
      this.$('.message-input').val('');
      return false;
    } else {
      this.vent.trigger("typing");
      console.log('wut');
    }
    return this;
  },
  directMessageInputPressed: function(e) {
    if (e.keyCode === 13 && $.trim($('.direct-message-input').val()).length > 0) {
      // fun fact: separate events with a space in trigger's first arg and you
      // can trigger multiple events.
      this.vent.trigger("directMessage", { message: this.$('.direct-message-input').val()});
      this.$('.direct-message-input').val('');
      return false;
    } else {
      this.vent.trigger("typing");
      console.log('huh');
    }
    return this;
  },
  setRoom: function(e) {
    console.log('crv.f.setRoom');
    var $tar = $(e.target);
    if ($tar.is('.room-name')) {
      this.joinRoom($tar.data('room'));
    }
  },


  dateDivider: (function() {

    var $window = $(window),
    $stickies;

    load = function(stickies) {
      $stickies = stickies;
      $('#chatbox-content').scroll(scrollStickiesInit);
    };

    scrollStickiesInit = function() {
      $(this).off("scroll.stickies");
      $(this).on("scroll.stickies", _.debounce(_whenScrolling, 150));
    };

    _whenScrolling = function() {
      $stickies.removeClass('fixed');
      $stickies.each(function(i, sticky) {
        var $thisSticky = $(sticky),
        $thisStickyTop = $thisSticky.offset().top;
        if ($thisStickyTop <= 162) {
          $thisSticky.addClass("fixed");
        }
      });
    };

    return {
      load: load
    };
  })()




});

})(jQuery);
var app = app || {};


(function($) {

  app.ChatroomImageUploadView = Backbone.View.extend({

    el: $('#createChatroomContainer'),
    events: {
      'change #chatroomImageUpload': 'renderThumb',
      'attachImage #createChatroomForm': 'upload',
      'click #createChatroomBtn': 'submit',
    },

    render: function() {
      this.renderThumb();
    },

    renderThumb: function() {
      var input = this.$('#chatroomImageUpload');
      var img = this.$('#uploadedChatroomImage')[0];
      if(input.val() !== '') {
        var selected_file = input[0].files[0];
        var reader = new FileReader();
        reader.onload = (function(aImg) {
          return function(e) {
            aImg.src = e.target.result;
          };
        })(img);
        reader.readAsDataURL( selected_file );
      }

    },

    submit: function(e) {
      e.preventDefault();
      this.$form = this.$('#createChatroomForm');
      this.$form.trigger('attachImage');
    },

    upload: function() {
      var _this = this;
        var formData = new FormData(this.$form[0]);
      if (this.$('#chatroomImageUpload')[0].files.length > 0) {
        $.ajax({
          type: 'POST',
          url: '/api/uploadChatroomImage',
          data: formData,
          cache: false,
          dataType: 'json',
          processData: false,
          contentType: false,
          error: function( xhr ) {
            _this.renderStatus('Error: ' + xhr.status);
            alert('Your image is either too large or it is not a .jpeg, .png, or .gif.');
          },
          success: function( response ) {
            console.log('imgUpload response: ', response);
            var form = _this.createRoomFormData();
            response.name = form.name;
              _this.trigger('createRoom', response);
            $('#createChatroomModal').modal('hide');
            _this.clearField();
          }
        });
      } else {
        var form = _this.createRoomFormData();
        debugger;
       this.trigger('createRoom', form);
      }
      return false;
    },


    createRoomFormData: function() {
      var formData = {};
      formData.roomImage = '/img/chjat-icon1.png';
      this.$('#createChatroomForm').children( 'input' ).each(function(i, el) {
        if ($(el).data('create') === 'privacy') {
          var val = $(el).prop('checked');
          formData['privacy'] = val;
          debugger;
        } else if ($(el).val() !== '') {
          formData[$(el).data('create')] = $(el).val();
          $(el).val('');
        }
      });
      return formData;

    },

    renderStatus: function( status ) {
      $('#status').text(status);
    },

    clearField: function() {
      this.$('#uploadedChatroomImage')[0].src = '';
      this.$('#chatroomImageUpload').val('');
    }

  });

})(jQuery);
var app = app || {};


(function($) {

  app.ChatroomSettingsView = Backbone.View.extend({

    el: $('#chatroom-settings'),
    events: {
      'change #preferences-image-upload': 'renderThumb',
      'attachImage #preferences-form': 'upload',
      'click #preferences-btn': 'submit',
      'keypress #invite-user-input': 'inviteUser',
    },

    initialize: function(options) {
      this.vent = options.vent;
      this.userSearchTypeahead();
      var this_ = this;
      $("form").submit(function(e) {
        e.preventDefault();
        this_.inviteUser();
      });
    },

    render: function() {
      this.renderThumb();
    },

    renderThumb: function() {
      var input = this.$('#preferences-image-upload');
      var img = this.$('#uploaded-preferences-image')[0];
      if(input.val() !== '') {
        var selected_file = input[0].files[0];
        var reader = new FileReader();
        reader.onload = (function(aImg) {
          return function(e) {
            aImg.src = e.target.result;
          };
        })(img);
        reader.readAsDataURL( selected_file );
      }

    },

    submit: function(e) {
      e.preventDefault();

      this.$form = this.$('#preferences-form');
      this.$form.trigger('attachImage');
    },

    upload: function() {
      var _this = this;
        var formData = new FormData(this.$form[0]);
      if (this.$('#preferences-image-upload')[0].files.length > 0) {
        $.ajax({
          type: 'POST',
          url: '/api/uploadChatroomImage',
          data: formData,
          cache: false,
          dataType: 'json',
          processData: false,
          contentType: false,
          error: function( xhr ) {
            _this.renderStatus('Error: ' + xhr.status);
            alert('Your image is either too large or it is not a .jpeg, .png, or .gif.');
          },
          success: function( response ) {
            console.log('imgUpload response: ', response);
            var form = _this.createRoomFormData();
            form.roomImage = response.roomImage;
            _this.trigger('updateRoom', form);
            $('#preferences-modal').modal('hide');
            _this.clearField();
          }
        });
      } else {
        var form = this.createRoomFormData();
        this.trigger('updateRoom', form);
      }
      return false;
    },


    createRoomFormData: function() {
      var formData = {};
      this.$('#preferences-form').find( 'input' ).each(function(i, el) {
        if ($(el).data('create') === 'privacy') {
          var val = $(el).prop('checked');
          formData['privacy'] = val;
        } else if ($(el).val() !== '' && $(el).val() !== 'on') {
          formData[$(el).data('create')] = $(el).val();
          $(el).val('');
        }
      });
      delete formData.undefined;
      return formData;
    },

    renderStatus: function( status ) {
      $('#status').text(status);
    },

    clearField: function() {
      this.$('#uploaded-preferences-image')[0].src = '';
      this.$('#preferences-image-upload').val('');
    },

    inviteUser: function(e) {
      // e.preventDefault();
      var recipient = $.trim($('#invite-user-input').val());
        debugger;
      if (recipient.length > 0) {
        // e.preventDefault();
        var sender = this.model.get('currentUser'),
            roomId = this.model.get('id'),
            roomName = this.model.get('name'),
            invitationObj = {sender: sender, roomId: roomId, roomName: roomName, recipient: recipient};
        this.vent.trigger('inviteUser', invitationObj);
        $('#invite-user-input').val('');
      } else {
        // console.log('search typing');
      }
      return this;
    },

    userSearchTypeahead: function() {
      $('#invite-user-input').typeahead({
        limit: 5,
        minLength: 5,
        onSelect: function(item) {
          console.log(item);
        },
        ajax: {
          url: '/searchUsers',
          triggerLength: 5,
          preDispatch: function (query) {
            return {
              username: query
            };
          },
          preProcess: function (data) {
            console.log(data);
            if (data.success === false) {
            // Hide the list, there was some error
              return false;
            }
            return data;
          }
        },
      });
    },

  });

})(jQuery);
var app = app || {};

(function ($) {

  app.ContainerView = Backbone.View.extend({
    el: '#view-container',
    initialize: function(options) {
      this.model.on("change:viewState", this.render, this);
    },
    render: function() {
      var view = this.model.get('viewState');
      this.$el.html(view.render().el);
    }
  });

})(jQuery);
var app = app || {};

(function ($) {

  app.LoginView = Backbone.View.extend({
    template: _.template($('#login').html()),
    errorTemplate: _.template('<div class="login-error"><%= message %></div>'),
    events: {
      'submit': 'onLogin',
      'keypress': 'onHitEnter'
    },
    initialize: function(options) {
    // LoginView gets passed the viewEventBus when the MainController is initialized
      this.vent = options.vent;

    // This tells the view to listen to an event on its model,
    // if there's an error, the callback (this.render) is called with the  
    // view as context
      this.listenTo(this.model, "change:error", this.render, this);
    },
    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },
    onLogin: function(e) {
      // triggers the login event and passing the username data to js/main.js
      var this_ = this;
      e.preventDefault();
      var sendData = {username: this.$('#username').val(), password: this.$('#password').val()};
    $.ajax({
        url: "/login",
        method: 'POST',
        data: sendData,
        success: function(data) {
           console.log('success data: ', data);
           if (data.message) {
             this_.renderValidation(this_.errorTemplate(data));
           }
           else if (data === 200) {
            app.ChatroomRouter.navigate('authenticated', { trigger: true });

           }
           else {
            console.log('oops, the else: ', data);
          }
        }
      }).done(function() {
        console.log('doneeeeeeee');
                    this_.vent.trigger("login", sendData);
      });
    },
    renderValidation: function(what) {
      $('.login-error-container').empty();
      $(what).appendTo($('.login-error-container')).hide().fadeIn();
      setTimeout(function() {
        $('.login-error-container').children().first().fadeOut();
      }, 2000);

    }
    // onHitEnter: function(e) {
    //   if(e.keyCode == 13) {
    //     this.onLogin();
    //     return false;
    //   }
    // }
  });
  
})(jQuery);
var app = app || {};

(function ($) {

  app.NavbarView = Backbone.View.extend({
    el: '.login-menu',
    template: _.template($('#navbar-template').html()),
    invitationTemplate: _.template($('#invitation-template').html()),
    events: {
      'click .delete-invitation': 'deleteInvitation',
      'click .accept-invitation': 'acceptInvitation',
    },
    initialize: function(options) {
      this.vent = options.vent;
      this.model = new app.UserModel({ username: '', invitations: new app.InvitationCollection() });
      this.listenTo(this.model, "change", this.render, this);

      var invitations = this.model.get('invitations');

      this.listenTo(invitations, "reset", this.renderInvitations, this);
    },
    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      this.renderInvitations();
      return this;
    },
    renderInvitations: function() {
      this.$('#invitations').empty();
      var invitations = this.model.get('invitations');
      var this_ = this;
      invitations.each(function(invite) {
        this_.renderInvitation(invite);
      }, this);
    },
    renderInvitation: function(model) {
      this.$('#invitations').append(this.invitationTemplate(model.toJSON()));
    },
    deleteInvitation: function(e) {
      var roomId = $(e.target).data('roomid');
      this.vent.trigger('deleteInvitation', roomId);
    },
    acceptInvitation: function(e) {
      var roomId = $(e.target).data('roomid');
      this.vent.trigger('acceptInvitation', roomId);
    },

  });

})(jQuery);
var app = app || {};

(function ($) {

  app.RegisterView = Backbone.View.extend({
    template: _.template($('#register').html()),
    usernameAvailableTemplate: _.template('<div class="username-available fa fa-check">username available</div>'),
    usernameTakenTemplate: _.template('<div class="username-taken fa fa-times">username taken</div>'),
    events: {
      "click #signUpBtn": "signUp",
      "keyup #username": "validateUsername",
    },
    initialize: function(options) {
      this.render();
    },
    render: function() {
      this.$el.html(this.template());
      return this;
    },
    signUp: function() {
    },
    validateUsername: function() {
      if ($('#username').val().length < 5) { return; }
      var this_ = this;
      _.debounce($.post('/registerValidation', { username: $('#username').val() },function(data) {
         data.usernameAvailable ?
           this_.renderValidation(this_.usernameAvailableTemplate())
         :
           this_.renderValidation(this_.usernameTakenTemplate());
      }), 150);
    },
    renderValidation: function(what) {
      $('.register-error-container').empty();
      $(what).appendTo($('.register-error-container')).hide().fadeIn();
      setTimeout(function() {
        $('.register-error-container').children().first().fadeOut();
      }, 2000);

    }
  });

})(jQuery);

// The ChatClient is implemented on main.js.
// The chatclient is a constructor function on the MainController.
// It both listens to and emits events on the socket, eg:
// It has its own methods that, when called, emit to the socket w/ data.
// It also sets response listeners on connection, these response listeners
// listen to the socket and trigger events on the appEventBus on the 
// MainController
var ChatClient = function(options) {

	var self = this;

	// is-typing helper variables
	var TYPING_TIMER_LENGTH = 400; // ms
  var typing = false;
  var lastTypingTime;
  
  // this vent holds the appEventBus
	self.vent = options.vent;

	self.hostname = 'http://' + window.location.host;

  // connects to socket, sets response listeners
	self.connect = function() {
    console.log('sc.f.connect');
		// this io might be a little confusing... where is it coming from?
		// it's coming from the static middleware on server.js bc everything
		// in the /public folder has been attached to the server, and visa
		// versa.
		self.socket = io.connect(self.hostname);
    self.setResponseListeners(self.socket);
  };




///// ViewEventBus methods ////
    // methods that emit to the chatserver

// LOGIN
  self.login = function(user) {
    console.log('sc.f.login: ', user);
    self.socket.emit("login", user);
  };


// ROOM
  self.connectToRoom = function(name) {
    console.log('sc.f.connectToRoom: ', name);
    self.socket.emit("connectToRoom", name);
  };
  self.joinRoom = function(name) {
    self.socket.emit('joinRoom', name);
  };
  self.addRoom = function(name) {
    console.log('sc.f.addRoom: ', name);
    self.socket.emit("addRoom", name);
  };
  self.removeRoom = function(name) {
    console.log('sc.f.removeRoom: ', name);
    self.socket.emit("removeRoom", name);
  };
  self.createRoom = function(formData) {
    console.log('sc.f.createRoom: ', formData);
    self.socket.emit("createRoom", formData);
  };
  self.updateRoom = function(formData) {
    console.log('sc.f.updateRoom: ', formData);
    self.socket.emit("updateRoom", formData);
  };
  self.destroyRoom = function(name) {
    console.log('sc.f.destroyRoom: ', name);
    self.socket.emit("destroyRoom", name);
  };



// CHAT
  self.chat = function(chat) {
    console.log('sc.f.chat: ', chat);
		self.socket.emit("chat", chat);
	};
  self.getMoreChats = function(chatReq) {
    self.socket.emit('getMoreChats', chatReq);
  };


// DIRECT MESSAGE
  self.initDirectMessage = function(recipient) {
    self.socket.emit('initDirectMessage', recipient);
  };
  self.directMessage = function(directMessage) {
    self.socket.emit('directMessage', directMessage);
  };
  self.getMoreDirectMessages = function(directMessageReq) {
    self.socket.emit('getMoreDirectMessages', directMessageReq);
  };
  

// TYPING
	self.addChatTyping = function(data) {
    var message = data.username + ' is typing';
    $('.typetypetype').text(message);
	};
	self.removeChatTyping = function() {
    $('.typetypetype').empty();
	};
  self.updateTyping = function() {
    if (self.socket) {
      if (!typing) {
        typing = true;
        self.socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();
      setTimeout(function() {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
           self.socket.emit('stop typing');
           typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  };


// INVITATIONS
  self.inviteUser = function(invitationObj) {
    self.socket.emit("inviteUser", invitationObj);
  };
  self.deleteInvitation = function(roomId) {
    self.socket.emit("deleteInvitation", roomId);
  };
  self.acceptInvitation = function(roomId) {
    self.socket.emit("acceptInvitation", roomId);
  };


// ERROR HANDLING
  self.doesChatroomExist = function(chatroomQuery) {
    self.socket.emit('doesChatroomExist', chatroomQuery);
  };


  




  ////////////// chatserver listeners/////////////

  // these guys listen to the chatserver/socket and emit data to main.js,
  // specifically to the appEventBus.
	self.setResponseListeners = function(socket) {


// LOGIN
    socket.on('login', function(user) {
      console.log('sc.e.login');
      self.vent.trigger('loginUser', user);
      self.connectToRoom("Parlor");
    });


// CHAT
		socket.on('userJoined', function(user) {
			console.log('sc.e.userJoined: ', user);
      // socket.emit("onlineUsers");
			self.vent.trigger("userJoined", user);
		});
		socket.on('userLeft', function(user) {
			console.log('sc.e.userLeft: ', user);
      // socket.emit("onlineUsers");
			self.vent.trigger("userLeft", user);
		});
		socket.on('chat', function(chat) {
			console.log('sc.e.chat: ', chat);
			self.vent.trigger("chatReceived", chat);
		});
    socket.on('moreChats', function(chats) {
      self.vent.trigger("moreChats", chats);
    });
    socket.on('noMoreChats', function() {
      self.vent.trigger("noMoreChats");
    });


// DIRECT MESSAGE
    socket.on('setDirectMessageChatlog', function(chatlog) {
      self.vent.trigger("setDMchatlog", chatlog);
    });
    socket.on('setDirectMessageHeader', function(header) {
      self.vent.trigger("setDMheader", header);
    });
    socket.on('directMessage', function(message) {
      // self.vent.trigger("renderDirectMessage", DM);
      self.vent.trigger("directMessageReceived", message);
    });



// TYPING
    socket.on('typing', function(data) {
      self.addChatTyping(data);
    });
    socket.on('stop typing', function() {
      self.removeChatTyping();
    });


// SET ROOM
    socket.on('chatlog', function(chatlog) {
      console.log('sc.e.chatlog: ', chatlog);
      self.vent.trigger("setChatlog", chatlog);
    });
    socket.on('chatrooms', function(chatrooms) {
      console.log('sc.e.chatrooms:  ', chatrooms);
      self.vent.trigger("setChatrooms", chatrooms);
    });
    socket.on('privateRooms', function(rooms) {
      console.log('sc.e.privateRooms:  ', rooms);
      self.vent.trigger("setPrivateRooms", rooms);
    });
    socket.on('onlineUsers', function(onlineUsers) {
      console.log('sc.e.onlineUsers: ', onlineUsers);
      self.vent.trigger("setOnlineUsers", onlineUsers);
    });
    socket.on('offlineUsers', function(offlineUsers) {
      console.log('sc.e.offlineUsers: ', offlineUsers);
      self.vent.trigger("setOfflineUsers", offlineUsers);
    });
    socket.on('chatroomHeader', function(headerObj) {
      console.log('sc.e.chatroomHeader: ', headerObj);
      self.vent.trigger("setChatroomHeader", headerObj);
    });


// MODIFY ROOM
    socket.on('roomDestroyed', function(name) {
      console.log('sc.e.roomDestroyed: ', name);
      self.vent.trigger("roomDestroyed", name);
    });

// CREATE ROOM
    socket.on('chatroomAvailability', function(availabilty) {
      self.vent.trigger('chatroomAvailability', availabilty);
    });

// ERROR HANDLING
    socket.on('chatroomAlreadyExists', function() {
      self.vent.trigger("chatroomAlreadyExists");
    });

// INVITATIONS
    socket.on('refreshInvitations', function(invitations) {
      self.vent.trigger("refreshInvitations", invitations);
    });


	};
};


app.MainController = function() {

	var self = this;


  //These allows us to bind and trigger on the object from anywhere in the app.
	self.appEventBus = _.extend({}, Backbone.Events);
	self.viewEventBus = _.extend({}, Backbone.Events);

	self.init = function() {

    // loginModel
    self.loginModel = new app.LoginModel();
    self.loginView = new app.LoginView({vent: self.viewEventBus, model: self.loginModel});
    self.registerView = new app.RegisterView({vent: self.viewEventBus });
    self.navbarView = new app.NavbarView({vent: self.viewEventBus});


    // The ContainerModel gets passed a viewState, LoginView, which
    // is the login page. That LoginView gets passed the viewEventBus
    // and the LoginModel.
    self.containerModel = new app.ContainerModel({ viewState: self.loginView});

    // next, a new ContainerView is intialized with the newly created containerModel
    // the login page is then rendered.
    self.containerView = new app.ContainerView({ model: self.containerModel });
    self.containerView.render();

 
    $('form').keypress(function(e) {
      return e.keyCode != 13;
    });


  };


  self.authenticated = function() {

    console.log('f.main.authenticated');
       
    $("body").css("overflow", "hidden");
    $('form').keypress(function(e) {
      return e.keyCode != 13;
    });
    self.chatClient = new ChatClient({ vent: self.appEventBus });
          console.log('huh');
    self.chatClient.connect();

    // new model and view created for chatroom
    self.chatroomModel = new app.ChatroomModel({ name: 'Parlor' });
    self.chatroomList = new app.ChatroomList();
    self.privateRoomCollection = new app.PrivateRoomCollection();
    self.chatroomList.fetch().done(function() {
      self.chatroomModel.set('chatrooms', self.chatroomList);
      self.chatroomModel.set('privateRooms', self.privateRoomCollection);
      self.chatroomView  = new app.ChatroomView({vent: self.viewEventBus, model: self.chatroomModel });
      self.containerModel.set('viewState', self.chatroomView);
      

      // self.connectToRoom();
      // self.initRoom();
           // ;
    });

  };

  // self.connectToRoom = function(callback) {
  //   console.log('f.main.connectToRoom');
  //   self.chatClient.connectToRoom("Parlor");
  // };

  // self.initRoom = function(callback) {
  //   self.chatroomView.initRoom();
  // };





  ////////////  Busses ////////////
    // These Busses listen to the socketclient
   //    ---------------------------------


  //// viewEventBus Listeners /////
  
	self.viewEventBus.on("login", function(user) {
    self.chatClient.login(user);
  });
	self.viewEventBus.on("chat", function(chat) {
    self.chatClient.chat(chat);
  });
  self.viewEventBus.on("typing", function() {
    self.chatClient.updateTyping();
  });
  self.viewEventBus.on("joinRoom", function(room) {
    self.chatClient.joinRoom(room);
  });
  self.viewEventBus.on("addRoom", function(room) {
    self.chatClient.addRoom(room);
  });
  self.viewEventBus.on("removeRoom", function(room) {
    self.chatClient.removeRoom(room);
  });
  self.viewEventBus.on("createRoom", function(formData) {
    self.chatClient.createRoom(formData);
  });
  self.viewEventBus.on("updateRoom", function(formData) {
    self.chatClient.updateRoom(formData);
  });
  self.viewEventBus.on("destroyRoom", function(room) {
    self.chatClient.destroyRoom(room);
  });
  self.viewEventBus.on("getMoreChats", function(chatReq) {
    self.chatClient.getMoreChats(chatReq);
  });
  self.viewEventBus.on("doesChatroomExist", function(chatroomQuery) {
    self.chatClient.doesChatroomExist(chatroomQuery);
  });
  self.viewEventBus.on("initDirectMessage", function(recipient) {
    self.chatClient.initDirectMessage(recipient);
  });
  self.viewEventBus.on("directMessage", function(directMessage) {
    self.chatClient.directMessage(directMessage);
  });
  self.viewEventBus.on("getMoreDirectMessages", function(directMessageReq) {
    self.chatClient.getMoreDirectMessages(directMessageReq);
  });
  self.viewEventBus.on("inviteUser", function(invitationObj) {
    self.chatClient.inviteUser(invitationObj);
  });
  self.viewEventBus.on("deleteInvitation", function(roomId) {
    self.chatClient.deleteInvitation(roomId);
  });
  self.viewEventBus.on("acceptInvitation", function(roomId) {
    self.chatClient.acceptInvitation(roomId);
  });






  //// appEventBus Listeners ////

	// self.appEventBus.on("usersInfo", function(data) {
 //    console.log('main.e.usersInfo: ', data);
 //    //data is an array of usernames, including the new user
	// 	// This method gets the online users collection from chatroomModel.
	// 	// onlineUsers is the collection
	// 	var onlineUsers = self.chatroomModel.get("onlineUsers");
 //    console.log("...onlineUsers: ", onlineUsers);
	// 	var users = _.map(data, function(item) {
	// 		return new app.UserModel({username: item});
	// 	});
 //    console.log("users: ", users);
	// 	onlineUsers.reset(users);
	// });

 //  self.appEventBus.on("roomInfo", function(data) {
 //    debugger;
 //    console.log('main.e.roomInfo: ', data);
 //    var rooms = self.chatroomModel.get("chatrooms");
 //     console.log("...rooms: ", rooms);
 //    var updatedRooms = _.map(data, function(room) {
 //      var newChatroomModel = new app.ChatroomModel({name: room});
 //      return newChatroomModel;
 //    });
 //    console.log("...updatedrooms: ", updatedRooms);
 //    rooms.reset(updatedRooms);
 //  });



  self.appEventBus.on("loginUser", function(user) {
    console.log('main.e.loginUser: ', user);
    invitations = self.navbarView.model.get('invitations');
    newInvitations = _.map(user.invitations, function(invite) {
       var newInvitation = new app.InvitationModel(invite);
       return newInvitation;
    });
    invitations.reset(newInvitations);
    self.navbarView.model.set('username', user.username);
  });

  self.appEventBus.on("refreshInvitations", function(invitations) {
    console.log('main.e.refreshInvitations: ', invitations);
    oldInvitations = self.navbarView.model.get('invitations');
    newInvitations = _.map(invitations, function(invite) {
       var newInvitation = new app.InvitationModel(invite);
       return newInvitation;
    });
    oldInvitations.reset(newInvitations);
  });

  // self.appEventBus.on("setRoom", function(model) {
  //   console.log('main.e.setRoom: ', model);

  //   var chatlog = new app.ChatCollection(model.chatlog);
  //   self.chatroomModel.set('chatlog', chatlog);

  //   var rooms = new app.ChatroomList(model.chatrooms);
  //   self.chatroomModel.set('chatrooms', rooms);

  //   var users = new app.UserCollection(model.onlineUsers);
  //   self.chatroomModel.set('onlineUsers', users);

  // });



  self.appEventBus.on("ChatroomModel", function(model) {
    console.log('main.e.ChatroomModel: ', model);
    self.chatroomModel = new app.ChatroomModel();
    self.chatroomList = new app.ChatroomList();
    self.chatroomView  = new app.ChatroomView({vent: self.viewEventBus, model: self.chatroomModel, collection: self.chatroomList});
    self.containerModel.set('viewState', self.chatroomView);
    self.chatroomModel.loadModel(model);
  });



  // adds new user to users collection, sends default joining message
	self.appEventBus.on("userJoined", function(user) {
        console.log('main.e.userJoined: ', user);
		self.chatroomModel.addUser(user);
		self.chatroomModel.addChat({sender: "Butters", message: user.username + " joined room." });
	});

	// removes user from users collection, sends default leaving message
	self.appEventBus.on("userLeft", function(user) {
        console.log('main.e.userLeft: ', user);
		self.chatroomModel.removeUser(user);
		self.chatroomModel.addChat({sender: "Butters", message: user.username + " left room." });
	});

	// chat passed from socketclient, adds a new chat message using chatroomModel method
	self.appEventBus.on("chatReceived", function(chat) {
    self.chatroomModel.addChat(chat);
		$('#chatbox-content')[0].scrollTop = $('#chatbox-content')[0].scrollHeight;
	});




  self.appEventBus.on("roomDestroyed", function(name) {
    self.connectToRoom();
    // self.initRoom();
    // alert('Chatroom ' + name + ' destroyed');
  });

  self.appEventBus.on("setChatroomHeader", function(headerObj) {
    var newHeader = new app.ChatroomHeaderModel(headerObj);
    self.chatroomModel.set('chatroom', newHeader);
  });

  self.appEventBus.on("setChatlog", function(chatlog) {
    var oldChatlog = self.chatroomModel.get('chatlog');
    var updatedChatlog = _.map(chatlog, function(chat) {
      var newChatModel = new app.ChatModel({ room: chat.room, message: chat.message, sender: chat.sender, timestamp: chat.timestamp, url: chat.url });
      return newChatModel;
    });
    oldChatlog.reset(updatedChatlog);
   $('#message-input').removeClass('direct-message-input').addClass('message-input');
    $('#chatbox-content')[0].scrollTop = $('#chatbox-content')[0].scrollHeight;
  });

  self.appEventBus.on("moreChats", function(chatlog) {
    var oldChatlog = self.chatroomModel.get('chatlog');
    var moreChatlog = _.map(chatlog, function(chat) {
      var newChatModel = new app.ChatModel({ room: chat.room, message: chat.message, sender: chat.sender, timestamp: chat.timestamp, url: chat.url });
      return newChatModel;
    });
    self.chatroomModel.trigger('moreChats', moreChatlog);
  });

  self.appEventBus.on("noMoreChats", function(chatlog) {
    self.chatroomModel.stopListening('moreChats');
  });
  
  self.appEventBus.on("setChatrooms", function(chatrooms) {
    var oldChatrooms = self.chatroomModel.get('chatrooms');
    var updatedChatrooms = _.map(chatrooms, function(chatroom) {
      var newChatroomModel = new app.ChatroomModel({ name: chatroom.name, owner: chatroom.owner, roomImage: chatroom.roomImage});
      return newChatroomModel;
    });
    oldChatrooms.reset(updatedChatrooms);
  });

  self.appEventBus.on("setPrivateRooms", function(rooms) {
    var oldRooms = self.chatroomModel.get('privateRooms');
    var newRooms = _.map(rooms, function(room) {
      var newChatroomModel = new app.ChatroomModel({ name: room.name, owner: room.owner, roomImage: room.roomImage});
      return newChatroomModel;
    });
    oldRooms.reset(newRooms);
  });

  self.appEventBus.on("setOnlineUsers", function(onlineUsers) {
    var oldOnlineUsers = self.chatroomModel.get('onlineUsers');
    var updatedOnlineUsers = _.map(onlineUsers, function(user) {
      var newUserModel = new app.UserModel({username: user.username, userImage: user.userImage});
      return newUserModel;
    });
    oldOnlineUsers.reset(updatedOnlineUsers);
  });

  self.appEventBus.on("setOfflineUsers", function(offlineUsers) {
    var oldOfflineUsers = self.chatroomModel.get('offlineUsers');
    var updatedOfflineUsers = _.map(offlineUsers, function(user) {
      var newUserModel = new app.UserModel({username: user.username, userImage: user.userImage});
      return newUserModel;
    });
    oldOfflineUsers.reset(updatedOfflineUsers);
  });


// chatroom availability

  self.appEventBus.on("chatroomAvailability", function(availability) {
    self.chatroomModel.trigger('chatroomAvailability', availability);
  });


// errors


  self.appEventBus.on("chatroomAlreadyExists", function() {
    swal({
      title: "OH NO OH NO OH NO",
      text: "Chatroom Already, It Already Exists! And. Don't Go In There. Don't. You. You Should Have. I Threw Up On The Server. Those Poor . . . They Were Just! OH NO WHY. WHY OH NO. OH NO.",
      type: "error",
      confirmButtonColor: "#749CA8"
    });
  });



  // DirectMessage

  self.appEventBus.on("setDMchatlog", function(chatlog) {
    var oldChatlog = self.chatroomModel.get('chatlog');
    var updatedChatlog = _.map(chatlog, function(chat) {
      var newChatModel = new app.ChatModel({ room: chat.room, message: chat.message, sender: chat.sender, timestamp: chat.timestamp, url: chat.url });
      return newChatModel;
    });
    oldChatlog.reset(updatedChatlog);

    $('#message-input').removeClass('message-input').addClass('direct-message-input');
    $('#chatImageUploadContainer').data('chat-type', 'message');
    $('#chatbox-content')[0].scrollTop = $('#chatbox-content')[0].scrollHeight;
  });

  self.appEventBus.on("setDMheader", function(header) {
    var newHeader = new app.ChatroomHeaderModel(header);
    self.chatroomModel.set('chatroom', newHeader);
  });


  self.appEventBus.on("directMessageReceived", function(message) {
    self.chatroomModel.addChat(message);
    $('#chatbox-content')[0].scrollTop = $('#chatbox-content')[0].scrollHeight;
  });
};


var app = app || {};

(function () {

  // $(window).bind('beforeunload', function(eventObject) {
  //   $.ajax({
  //      url: "/logout",
  //   });
  // });

  var ChatroomRouter = Backbone.Router.extend({
    
    routes: {
      '': 'start',
      'log': 'login',
      'reg': 'register',
      'out': 'out',
      'authenticated': 'authenticated',
      'facebook': 'facebook',
      'twitter': 'twitter'
    },

    start: function(callback) {
      window.location.href = '/#';
      app.mainController = new app.MainController();
      app.mainController.init();
      if (callback) {
        callback();
      } 
      else {
        $.ajax({
          url: "/logout",
        });
      }
    },


    login: function() {
      var loginModel = new app.LoginModel();
      var loginView = new app.LoginView({vent: app.mainController.viewEventBus, model: loginModel});
      app.mainController.containerModel.set("viewState", loginView);
    },

    register: function() {
      var registerView = new app.RegisterView({vent: app.mainController.viewEventBus });
      app.mainController.containerModel.set("viewState", registerView);
    },

    // out: function() {
    //     var this_ = this;
    //     $.ajax({
    //       url: "/logout",
    //     })
    // },

    authenticated: function() {
      if (!app.mainController) {
        this.start();
      }
        app.mainController.authenticated();
    },
    facebook: function() {
      this.start(this.authenticated);
    },
    twitter: function() {
      this.start(this.authenticated);
    },

  });

  app.ChatroomRouter = new ChatroomRouter();
  Backbone.history.start();

})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNoYXQuanMiLCJjaGF0cm9vbS1oZWFkZXIuanMiLCJjb250YWluZXIuanMiLCJsb2dpbi5qcyIsInVzZXIuanMiLCJjaGF0cm9vbS5qcyIsImludml0YXRpb24uanMiLCJyb29tLmpzIiwicHJpdmF0ZVJvb20uanMiLCJjaGF0SW1hZ2VVcGxvYWQuanMiLCJjaGF0cm9vbUltYWdlVXBsb2FkLmpzIiwiY2hhdHJvb21TZXR0aW5ncy5qcyIsIm5hdmJhci5qcyIsInJlZ2lzdGVyLmpzIiwic29ja2V0Y2xpZW50LmpzIiwibWFpbi5qcyIsInJvdXRlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUpQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBSVRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FGUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUdUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUp6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUs1aEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FUNUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBU25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbnZhciBhcHAgPSBhcHAgfHwge307XG5cbihmdW5jdGlvbiAoKSB7XG5cbiAgYXBwLkNoYXRDb2xsZWN0aW9uID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIG1vZGVsOiBhcHAuQ2hhdE1vZGVsXG4gIH0pO1xuXG59KSgpOyIsIlxudmFyIGFwcCA9IGFwcCB8fCB7fTtcblxuKGZ1bmN0aW9uICgpIHtcblxuICBhcHAuQ2hhdHJvb21IZWFkZXJNb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7fSk7XG5cbn0pKCk7IiwidmFyIGFwcCA9IGFwcCB8fCB7fTtcblxuKGZ1bmN0aW9uICgkKSB7XG5cbiAgYXBwLkNvbnRhaW5lclZpZXcgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG4gICAgZWw6ICcjdmlldy1jb250YWluZXInLFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIHRoaXMubW9kZWwub24oXCJjaGFuZ2U6dmlld1N0YXRlXCIsIHRoaXMucmVuZGVyLCB0aGlzKTtcbiAgICB9LFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdmlldyA9IHRoaXMubW9kZWwuZ2V0KCd2aWV3U3RhdGUnKTtcbiAgICAgIHRoaXMuJGVsLmh0bWwodmlldy5yZW5kZXIoKS5lbCk7XG4gICAgfVxuICB9KTtcblxufSkoalF1ZXJ5KTsiLCJ2YXIgYXBwID0gYXBwIHx8IHt9O1xuXG4oZnVuY3Rpb24gKCQpIHtcblxuICBhcHAuTG9naW5WaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKCQoJyNsb2dpbicpLmh0bWwoKSksXG4gICAgZXJyb3JUZW1wbGF0ZTogXy50ZW1wbGF0ZSgnPGRpdiBjbGFzcz1cImxvZ2luLWVycm9yXCI+PCU9IG1lc3NhZ2UgJT48L2Rpdj4nKSxcbiAgICBldmVudHM6IHtcbiAgICAgICdzdWJtaXQnOiAnb25Mb2dpbicsXG4gICAgICAna2V5cHJlc3MnOiAnb25IaXRFbnRlcidcbiAgICB9LFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAvLyBMb2dpblZpZXcgZ2V0cyBwYXNzZWQgdGhlIHZpZXdFdmVudEJ1cyB3aGVuIHRoZSBNYWluQ29udHJvbGxlciBpcyBpbml0aWFsaXplZFxuICAgICAgdGhpcy52ZW50ID0gb3B0aW9ucy52ZW50O1xuXG4gICAgLy8gVGhpcyB0ZWxscyB0aGUgdmlldyB0byBsaXN0ZW4gdG8gYW4gZXZlbnQgb24gaXRzIG1vZGVsLFxuICAgIC8vIGlmIHRoZXJlJ3MgYW4gZXJyb3IsIHRoZSBjYWxsYmFjayAodGhpcy5yZW5kZXIpIGlzIGNhbGxlZCB3aXRoIHRoZSAgXG4gICAgLy8gdmlldyBhcyBjb250ZXh0XG4gICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlOmVycm9yXCIsIHRoaXMucmVuZGVyLCB0aGlzKTtcbiAgICB9LFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUodGhpcy5tb2RlbC50b0pTT04oKSkpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBvbkxvZ2luOiBmdW5jdGlvbihlKSB7XG4gICAgICAvLyB0cmlnZ2VycyB0aGUgbG9naW4gZXZlbnQgYW5kIHBhc3NpbmcgdGhlIHVzZXJuYW1lIGRhdGEgdG8ganMvbWFpbi5qc1xuICAgICAgdmFyIHRoaXNfID0gdGhpcztcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHZhciBzZW5kRGF0YSA9IHt1c2VybmFtZTogdGhpcy4kKCcjdXNlcm5hbWUnKS52YWwoKSwgcGFzc3dvcmQ6IHRoaXMuJCgnI3Bhc3N3b3JkJykudmFsKCl9O1xuICAgICQuYWpheCh7XG4gICAgICAgIHVybDogXCIvbG9naW5cIixcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGRhdGE6IHNlbmREYXRhLFxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzIGRhdGE6ICcsIGRhdGEpO1xuICAgICAgICAgICBpZiAoZGF0YS5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgdGhpc18ucmVuZGVyVmFsaWRhdGlvbih0aGlzXy5lcnJvclRlbXBsYXRlKGRhdGEpKTtcbiAgICAgICAgICAgfVxuICAgICAgICAgICBlbHNlIGlmIChkYXRhID09PSAyMDApIHtcbiAgICAgICAgICAgIGFwcC5DaGF0cm9vbVJvdXRlci5uYXZpZ2F0ZSgnYXV0aGVudGljYXRlZCcsIHsgdHJpZ2dlcjogdHJ1ZSB9KTtcblxuICAgICAgICAgICB9XG4gICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ29vcHMsIHRoZSBlbHNlOiAnLCBkYXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pLmRvbmUoZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdkb25lZWVlZWVlZScpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzXy52ZW50LnRyaWdnZXIoXCJsb2dpblwiLCBzZW5kRGF0YSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHJlbmRlclZhbGlkYXRpb246IGZ1bmN0aW9uKHdoYXQpIHtcbiAgICAgICQoJy5sb2dpbi1lcnJvci1jb250YWluZXInKS5lbXB0eSgpO1xuICAgICAgJCh3aGF0KS5hcHBlbmRUbygkKCcubG9naW4tZXJyb3ItY29udGFpbmVyJykpLmhpZGUoKS5mYWRlSW4oKTtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICQoJy5sb2dpbi1lcnJvci1jb250YWluZXInKS5jaGlsZHJlbigpLmZpcnN0KCkuZmFkZU91dCgpO1xuICAgICAgfSwgMjAwMCk7XG5cbiAgICB9XG4gICAgLy8gb25IaXRFbnRlcjogZnVuY3Rpb24oZSkge1xuICAgIC8vICAgaWYoZS5rZXlDb2RlID09IDEzKSB7XG4gICAgLy8gICAgIHRoaXMub25Mb2dpbigpO1xuICAgIC8vICAgICByZXR1cm4gZmFsc2U7XG4gICAgLy8gICB9XG4gICAgLy8gfVxuICB9KTtcbiAgXG59KShqUXVlcnkpOyIsIlxudmFyIGFwcCA9IGFwcCB8fCB7fTtcblxuKGZ1bmN0aW9uICgpIHtcblxuICBhcHAuVXNlckNvbGxlY3Rpb24gPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7bW9kZWw6IGFwcC5Vc2VyTW9kZWx9KTtcblxufSkoKTsiLCJ2YXIgYXBwID0gYXBwIHx8IHt9O1xuXG4oZnVuY3Rpb24gKCQpIHtcblxuYXBwLkNoYXRyb29tVmlldyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IF8udGVtcGxhdGUoJCgnI2NoYXRyb29tLXRlbXBsYXRlJykuaHRtbCgpKSxcbiAgY2hhdFRlbXBsYXRlOiBfLnRlbXBsYXRlKCQoJyNjaGF0Ym94LW1lc3NhZ2UtdGVtcGxhdGUnKS5odG1sKCkpLFxuICByb29tVGVtcGxhdGU6IF8udGVtcGxhdGUoJChcIiNyb29tLWxpc3QtdGVtcGxhdGVcIikuaHRtbCgpKSxcbiAgaGVhZGVyVGVtcGxhdGU6IF8udGVtcGxhdGUoJCgnI2NoYXRyb29tLWhlYWRlci10ZW1wbGF0ZScpLmh0bWwoKSksXG4gIGRpcmVjdE1lc3NhZ2VIZWFkZXJUZW1wbGF0ZTogXy50ZW1wbGF0ZSgkKCcjZGlyZWN0LW1lc3NhZ2UtaGVhZGVyLXRlbXBsYXRlJykuaHRtbCgpKSxcbiAgb25saW5lVXNlclRlbXBsYXRlOiBfLnRlbXBsYXRlKCQoJyNvbmxpbmUtdXNlcnMtbGlzdC10ZW1wbGF0ZScpLmh0bWwoKSksXG4gIG9mZmxpbmVVc2VyVGVtcGxhdGU6IF8udGVtcGxhdGUoJCgnI29mZmxpbmUtdXNlcnMtbGlzdC10ZW1wbGF0ZScpLmh0bWwoKSksXG4gIGRhdGVUZW1wbGF0ZTogXy50ZW1wbGF0ZSgnPGRpdiBjbGFzcz1cImZvbGxvd1dyYXBcIj48ZGl2IGNsYXNzPVwiZm9sbG93TWVCYXJcIj48c3Bhbj4tLS0tLTwvc3Bhbj48c3Bhbj4gPCU9IG1vbWVudCh0aW1lc3RhbXApLmZvcm1hdChcIk1NTU0gRG9cIikgJT4gPC9zcGFuPjxzcGFuPi0tLS0tPC9zcGFuPjwvZGl2PjwvZGl2PicpLFxuICBldmVudHM6IHtcbiAgICAna2V5cHJlc3MgLm1lc3NhZ2UtaW5wdXQnOiAnbWVzc2FnZUlucHV0UHJlc3NlZCcsXG4gICAgJ2tleXByZXNzIC5kaXJlY3QtbWVzc2FnZS1pbnB1dCc6ICdkaXJlY3RNZXNzYWdlSW5wdXRQcmVzc2VkJyxcbiAgICAnY2xpY2sgLmNoYXQtZGlyZWN0b3J5IC5yb29tJzogJ3NldFJvb20nLFxuICAgICdrZXlwcmVzcyAjY2hhdC1zZWFyY2gtaW5wdXQnOiAnc2VhcmNoJyxcbiAgICAnY2xpY2sgLnJlbW92ZS1jaGF0cm9vbSc6ICdyZW1vdmVSb29tJyxcbiAgICAnY2xpY2sgI2Rlc3Ryb3ktY2hhdHJvb20nOiAnZGVzdHJveVJvb20nLFxuICAgICdrZXl1cCAjY2hhdHJvb20tbmFtZS1pbnB1dCc6ICdkb2VzQ2hhdHJvb21FeGlzdCcsXG4gICAgJ2NsaWNrIC51c2VyJzogJ2luaXREaXJlY3RNZXNzYWdlJyxcbiAgfSxcblxuICBkb2VzQ2hhdHJvb21FeGlzdDogZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB2YXIgdGhpc18gPSB0aGlzO1xuICAgIHZhciBjaGVjayA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCQudHJpbSgkKCcjY2hhdHJvb20tbmFtZS1pbnB1dCcpLnZhbCgpKS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBjaGF0cm9vbU5hbWUgPSAkKCcjY2hhdHJvb20tbmFtZS1pbnB1dCcpLnZhbCgpO1xuICAgICAgICAgdGhpc18udmVudC50cmlnZ2VyKCdkb2VzQ2hhdHJvb21FeGlzdCcsIGNoYXRyb29tTmFtZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgdGhpc18uJCgnI2NoYXRyb29tLW5hbWUtdmFsaWRhdGlvbi1jb250YWluZXInKS5jaGlsZHJlbigpLnJlbW92ZSgpO1xuICAgICAgICAgdGhpc18uJCgnI2NoYXRyb29tLW5hbWUtaW5wdXQnKS5yZW1vdmVDbGFzcygnaW5wdXQtdmFsaWQgaW5wdXQtaW52YWxpZCcpO1xuICAgICAgfVxuICAgIH07XG4gICAgXy5kZWJvdW5jZShjaGVjaygpLCAxNTApO1xuICB9LFxuXG4gIHJlbmRlckNoYXRyb29tQXZhaWxhYmlsaXR5OiBmdW5jdGlvbihhdmFpbGFiaWxpdHkpIHtcbiAgICB0aGlzLiQoJyNjaGF0cm9vbS1uYW1lLWlucHV0JykucmVtb3ZlQ2xhc3MoJ2lucHV0LXZhbGlkIGlucHV0LWludmFsaWQnKTtcbiAgICAkKCcjY2hhdHJvb20tbmFtZS12YWxpZGF0aW9uLWNvbnRhaW5lcicpLmNoaWxkcmVuKCkucmVtb3ZlKCk7XG4gICAgaWYgKGF2YWlsYWJpbGl0eSA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy4kKCcjY2hhdHJvb20tbmFtZS1pbnB1dCcpLmFkZENsYXNzKCdpbnB1dC12YWxpZCcpO1xuICAgICAgdGhpcy4kKCcjY2hhdHJvb20tbmFtZS12YWxpZGF0aW9uLWNvbnRhaW5lcicpLmFwcGVuZCgnPGRpdiBpZD1cIiNjaGF0cm9vbS1uYW1lLXZhbGlkYXRpb25cIiBjbGFzcz1cImZhIGZhLWNoZWNrXCI+TmFtZSBBdmFpbGFibGU8L2Rpdj4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kKCcjY2hhdHJvb20tbmFtZS1pbnB1dCcpLmFkZENsYXNzKCdpbnB1dC1pbnZhbGlkIGZhIGZhLXRpbWVzJyk7XG4gICAgICB0aGlzLiQoJyNjaGF0cm9vbS1uYW1lLXZhbGlkYXRpb24tY29udGFpbmVyJykuYXBwZW5kKCc8ZGl2IGlkPVwiI2NoYXRyb29tLW5hbWUtdmFsaWRhdGlvblwiIGNsYXNzPVwiZmEgZmEtdGltZXNcIj5OYW1lIFVuYXZhaWxhYmxlPC9kaXY+Jyk7XG4gICAgfVxuICB9LFxuXG5cblxuICBpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgY29uc29sZS5sb2coJ2NoYXRyb29tVmlldy5mLmluaXRpYWxpemU6ICcsIG9wdGlvbnMpO1xuICAgIC8vIHBhc3NlZCB0aGUgdmlld0V2ZW50QnVzXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMudmVudCA9IG9wdGlvbnMudmVudDtcbiAgfSxcbiAgcmVuZGVyOiBmdW5jdGlvbihtb2RlbCkge1xuICAgIGNvbnNvbGUubG9nKCdjcnYuZi5yZW5kZXInKTtcbiAgICB0aGlzLm1vZGVsID0gbW9kZWwgfHwgdGhpcy5tb2RlbDtcbiAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUodGhpcy5tb2RlbC50b0pTT04oKSkpO1xuICAgIHRoaXMuYWZ0ZXJSZW5kZXIoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgYWZ0ZXJSZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2V0U3ViVmlld3MoKTtcbiAgICB0aGlzLnNldENoYXRMaXN0ZW5lcnMoKTtcbiAgICB0aGlzLmNoYXRyb29tU2VhcmNoVHlwZWFoZWFkKCk7XG4gIH0sXG4gIHNldFN1YlZpZXdzOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNoYXRJbWFnZVVwbG9hZFZpZXcgPSBuZXcgYXBwLkNoYXRJbWFnZVVwbG9hZFZpZXcoKTtcbiAgICB0aGlzLmNoYXRJbWFnZVVwbG9hZFZpZXcuc2V0RWxlbWVudCh0aGlzLiQoJyNjaGF0SW1hZ2VVcGxvYWRDb250YWluZXInKSk7XG4gICAgdGhpcy5jaGF0cm9vbUltYWdlVXBsb2FkVmlldyA9IG5ldyBhcHAuQ2hhdHJvb21JbWFnZVVwbG9hZFZpZXcoKTtcbiAgICB0aGlzLmNoYXRyb29tSW1hZ2VVcGxvYWRWaWV3LnNldEVsZW1lbnQodGhpcy4kKCcjY3JlYXRlQ2hhdHJvb21Db250YWluZXInKSk7XG4gIH0sXG4gIHNldENoYXRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIG9ubGluZVVzZXJzID0gdGhpcy5tb2RlbC5nZXQoJ29ubGluZVVzZXJzJyk7XG4gICAgdGhpcy5saXN0ZW5UbyhvbmxpbmVVc2VycywgXCJhZGRcIiwgdGhpcy5yZW5kZXJVc2VyLCB0aGlzKTtcbiAgICB0aGlzLmxpc3RlblRvKG9ubGluZVVzZXJzLCBcInJlbW92ZVwiLCB0aGlzLnJlbmRlclVzZXJzLCB0aGlzKTtcbiAgICB0aGlzLmxpc3RlblRvKG9ubGluZVVzZXJzLCBcInJlc2V0XCIsIHRoaXMucmVuZGVyVXNlcnMsIHRoaXMpO1xuXG4gICAgdmFyIG9mZmxpbmVVc2VycyA9IHRoaXMubW9kZWwuZ2V0KCdvZmZsaW5lVXNlcnMnKTtcbiAgICB0aGlzLmxpc3RlblRvKG9mZmxpbmVVc2VycywgXCJhZGRcIiwgdGhpcy5yZW5kZXJPZmZsaW5lVXNlciwgdGhpcyk7XG4gICAgdGhpcy5saXN0ZW5UbyhvZmZsaW5lVXNlcnMsIFwicmVtb3ZlXCIsIHRoaXMucmVuZGVyT2ZmbGluZVVzZXJzLCB0aGlzKTtcbiAgICB0aGlzLmxpc3RlblRvKG9mZmxpbmVVc2VycywgXCJyZXNldFwiLCB0aGlzLnJlbmRlck9mZmxpbmVVc2VycywgdGhpcyk7XG5cbiAgICB2YXIgY2hhdGxvZyA9IHRoaXMubW9kZWwuZ2V0KCdjaGF0bG9nJyk7XG4gICAgdGhpcy5saXN0ZW5UbyhjaGF0bG9nLCBcImFkZFwiLCB0aGlzLnJlbmRlckNoYXQsIHRoaXMpO1xuICAgIHRoaXMubGlzdGVuVG8oY2hhdGxvZywgXCJyZW1vdmVcIiwgdGhpcy5yZW5kZXJDaGF0cywgdGhpcyk7XG4gICAgdGhpcy5saXN0ZW5UbyhjaGF0bG9nLCBcInJlc2V0XCIsIHRoaXMucmVuZGVyQ2hhdHMsIHRoaXMpO1xuXG4gICAgdmFyIGNoYXRyb29tcyA9IHRoaXMubW9kZWwuZ2V0KCdjaGF0cm9vbXMnKTtcbiAgICB0aGlzLmxpc3RlblRvKGNoYXRyb29tcywgXCJhZGRcIiwgdGhpcy5yZW5kZXJSb29tLCB0aGlzKTtcbiAgICB0aGlzLmxpc3RlblRvKGNoYXRyb29tcywgXCJyZW1vdmVcIiwgdGhpcy5yZW5kZXJSb29tcywgdGhpcyk7XG4gICAgdGhpcy5saXN0ZW5UbyhjaGF0cm9vbXMsIFwicmVzZXRcIiwgdGhpcy5yZW5kZXJSb29tcywgdGhpcyk7XG5cbiAgICB2YXIgcHJpdmF0ZVJvb21zID0gdGhpcy5tb2RlbC5nZXQoJ3ByaXZhdGVSb29tcycpO1xuICAgIHRoaXMubGlzdGVuVG8ocHJpdmF0ZVJvb21zLCBcImFkZFwiLCB0aGlzLnJlbmRlclByaXZhdGVSb29tLCB0aGlzKTtcbiAgICB0aGlzLmxpc3RlblRvKHByaXZhdGVSb29tcywgXCJyZW1vdmVcIiwgdGhpcy5yZW5kZXJQcml2YXRlUm9vbXMsIHRoaXMpO1xuICAgIHRoaXMubGlzdGVuVG8ocHJpdmF0ZVJvb21zLCBcInJlc2V0XCIsIHRoaXMucmVuZGVyUHJpdmF0ZVJvb21zLCB0aGlzKTtcblxuICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2U6Y2hhdHJvb21cIiwgdGhpcy5yZW5kZXJIZWFkZXIsIHRoaXMpO1xuXG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNoYXRJbWFnZVVwbG9hZFZpZXcsICdjaGF0LWltYWdlLXVwbG9hZGVkJywgdGhpcy5jaGF0VXBsb2FkSW1hZ2UpO1xuICAgIHRoaXMubGlzdGVuVG8odGhpcy5jaGF0SW1hZ2VVcGxvYWRWaWV3LCAnbWVzc2FnZS1pbWFnZS11cGxvYWRlZCcsIHRoaXMubWVzc2FnZVVwbG9hZEltYWdlKTtcbiAgICB0aGlzLmxpc3RlblRvKHRoaXMuY2hhdHJvb21JbWFnZVVwbG9hZFZpZXcsICdjcmVhdGVSb29tJywgdGhpcy5jcmVhdGVSb29tKTtcblxuICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJtb3JlQ2hhdHNcIiwgdGhpcy5yZW5kZXJNb3JlQ2hhdHMsIHRoaXMpO1xuXG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYXRyb29tQXZhaWxhYmlsaXR5XCIsIHRoaXMucmVuZGVyQ2hhdHJvb21BdmFpbGFiaWxpdHksIHRoaXMpO1xuXG4gICAgdmFyIHRoaXNfID0gdGhpcztcbiAgICB0aGlzLiQoJyNjaGF0Ym94LWNvbnRlbnQnKS5zY3JvbGwoZnVuY3Rpb24oKXtcbiAgICAgICAgLy8gY2hlY2tzIGlmIHRoZXJlJ3MgZW5vdWdoIGNoYXRzIHRvIHdhcnJhbnQgYSBnZXRNb3JlQ2hhdHMgY2FsbFxuICAgICAgaWYgKCQoJyNjaGF0Ym94LWNvbnRlbnQnKS5zY3JvbGxUb3AoKSA9PT0gMCAmJiB0aGlzXy5tb2RlbC5nZXQoJ2NoYXRsb2cnKS5sZW5ndGggPj0gMjUpIHtcbiAgICAgICAgaWYgKHRoaXNfLm1vZGVsLmdldCgnY2hhdHJvb20nKS5nZXQoJ2NoYXRUeXBlJykgPT09ICdtZXNzYWdlJykge1xuICAgICAgICAgIF8uZGVib3VuY2UodGhpc18uZ2V0TW9yZURpcmVjdE1lc3NhZ2VzKCksIDMwMDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIF8uZGVib3VuY2UodGhpc18uZ2V0TW9yZUNoYXRzKCksIDMwMDApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAgICAkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgd2luZG93SGVpZ2h0ID0gJCh3aW5kb3cpLmhlaWdodCgpO1xuICAgICAgICBpZiAod2luZG93SGVpZ2h0ID4gNTAwKSB7XG4gICAgICAgICAgdmFyIG5ld0hlaWdodCA9IHdpbmRvd0hlaWdodCAtIDI4NTtcbiAgICAgICAgICAkKCcjY2hhdGJveC1jb250ZW50JykuaGVpZ2h0KG5ld0hlaWdodCk7XG4gICAgICAgIH1cblxuICAgICAgIH0pO1xuICB9LFxuXG5cbiAgY2hhdHJvb21TZWFyY2hUeXBlYWhlYWQ6IGZ1bmN0aW9uKCkge1xuICAgIC8vIGludGVyZXN0aW5nIC0gdGhlICd0aGlzJyBtYWtlcyBhIGRpZmZlcmVuY2UsIGNhbid0IGZpbmQgI2NoYXQtc2VhcmNoLWlucHV0IG90aGVyd2lzZVxuICAgIHRoaXMuJCgnI2NoYXQtc2VhcmNoLWlucHV0JykudHlwZWFoZWFkKHtcbiAgICAgIG9uU2VsZWN0OiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGl0ZW0pO1xuICAgICAgfSxcbiAgICAgIGFqYXg6IHtcbiAgICAgICAgdXJsOiAnL2FwaS9zZWFyY2hDaGF0cm9vbXMnLFxuICAgICAgICB0cmlnZ2VyTGVuZ3RoOiAxLFxuICAgICAgICBsaW1pdDogNSxcbiAgICAgICAgbWluTGVuZ3RoOiA1LFxuICAgICAgICBwcmVEaXNwYXRjaDogZnVuY3Rpb24gKHF1ZXJ5KSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IHF1ZXJ5XG4gICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgICAgcHJlUHJvY2VzczogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICBpZiAoZGF0YS5zdWNjZXNzID09PSBmYWxzZSkge1xuICAgICAgICAgICAgLy8gSGlkZSB0aGUgbGlzdCwgdGhlcmUgd2FzIHNvbWUgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfSk7XG4gIH0sXG5cblxuXG4vLyBoZWFkZXJzXG5cbiAgcmVuZGVySGVhZGVyOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLiQoJyNjaGF0Ym94LWhlYWRlcicpLmh0bWwodGhpcy5oZWFkZXJUZW1wbGF0ZSh0aGlzLm1vZGVsLmdldCgnY2hhdHJvb20nKS50b0pTT04oKSkpO1xuICAgIHRoaXMuY2hhdHJvb21TZXR0aW5nc1ZpZXcgPSBuZXcgYXBwLkNoYXRyb29tU2V0dGluZ3NWaWV3KHt2ZW50OiB0aGlzLnZlbnQsIG1vZGVsOiB0aGlzLm1vZGVsLmdldCgnY2hhdHJvb20nKX0pO1xuICAgIC8vIGRlYnVnZ2VyO1xuICAgIHRoaXMuY2hhdHJvb21TZXR0aW5nc1ZpZXcuc2V0RWxlbWVudCh0aGlzLiQoJyNwcmVmZXJlbmNlcy1jb250YWluZXInKSk7XG4gICAgLy8gZGVidWdnZXI7XG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNoYXRyb29tU2V0dGluZ3NWaWV3LCAndXBkYXRlUm9vbScsIHRoaXMudXBkYXRlUm9vbSk7XG4gIH0sXG5cbiAgcmVuZGVyRGlyZWN0TWVzc2FnZUhlYWRlcjogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy4kKCcjY2hhdGJveC1oZWFkZXInKS5odG1sKHRoaXMuZGlyZWN0TWVzc2FnZUhlYWRlclRlbXBsYXRlKHRoaXMubW9kZWwuZ2V0KCdjaGF0cm9vbScpLnRvSlNPTigpKSk7XG4gIH0sXG5cblxuXG5cbi8vIHVzZXJzXG5cbiAgcmVuZGVyVXNlcnM6IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKCdjcnYuZi5yZW5kZXJVc2VycycpO1xuICAgIG9ubGluZVVzZXJzID0gdGhpcy5tb2RlbC5nZXQoXCJvbmxpbmVVc2Vyc1wiKTtcbiAgICBjb25zb2xlLmxvZygnVVNFUlM6ICcsIG9ubGluZVVzZXJzKTtcbiAgICB0aGlzLiQoJy5vbmxpbmUtdXNlcnMnKS5lbXB0eSgpO1xuICAgIHRoaXMubW9kZWwuZ2V0KFwib25saW5lVXNlcnNcIikuZWFjaChmdW5jdGlvbiAodXNlcikge1xuICAgICAgdGhpcy5yZW5kZXJVc2VyKHVzZXIpO1xuICAgIH0sIHRoaXMpO1xuICB9LFxuICByZW5kZXJVc2VyOiBmdW5jdGlvbihtb2RlbCkge1xuICAgIHRoaXMuJCgnLm9ubGluZS11c2VycycpLmFwcGVuZCh0aGlzLm9ubGluZVVzZXJUZW1wbGF0ZShtb2RlbC50b0pTT04oKSkpO1xuICB9LFxuICByZW5kZXJPZmZsaW5lVXNlcnM6IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKCdjcnYuZi5yZW5kZXJPZmZsaW5lVXNlcnMnKTtcbiAgICBjb25zb2xlLmxvZygnT2ZmbGluZSBVU0VSUzogJywgdGhpcy5tb2RlbC5nZXQoXCJvZmZsaW5lVXNlcnNcIikpO1xuICAgIHRoaXMuJCgnLm9mZmxpbmUtdXNlcnMnKS5lbXB0eSgpO1xuICAgIHRoaXMubW9kZWwuZ2V0KFwib2ZmbGluZVVzZXJzXCIpLmVhY2goZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgIHRoaXMucmVuZGVyT2ZmbGluZVVzZXIodXNlcik7XG4gICAgfSwgdGhpcyk7XG4gIH0sXG4gIHJlbmRlck9mZmxpbmVVc2VyOiBmdW5jdGlvbihtb2RlbCkge1xuICAgIHRoaXMuJCgnLm9mZmxpbmUtdXNlcnMnKS5hcHBlbmQodGhpcy5vZmZsaW5lVXNlclRlbXBsYXRlKG1vZGVsLnRvSlNPTigpKSk7XG4gIH0sXG5cblxuXG5cblxuLy8gY2hhdGxvZ1xuXG4gIHJlbmRlckNoYXRzOiBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLmxvZygnY3J2LmYucmVuZGVyQ2hhdHMnKTtcbiAgICBjb25zb2xlLmxvZygnQ0hBVExPRzogJywgdGhpcy5tb2RlbC5nZXQoXCJjaGF0bG9nXCIpKTtcbiAgICB0aGlzLiQoJyNjaGF0Ym94LWNvbnRlbnQnKS5lbXB0eSgpO1xuICAgIHRoaXMubW9kZWwuZ2V0KCdjaGF0bG9nJykuZWFjaChmdW5jdGlvbihjaGF0KSB7XG4gICAgICB0aGlzLnJlbmRlckNoYXQoY2hhdCk7XG4gICAgfSwgdGhpcyk7XG5cbiAgICB0aGlzLmFmdGVyQ2hhdHNSZW5kZXIoKTtcbiAgfSxcblxuICByZW5kZXJDaGF0OiBmdW5jdGlvbihtb2RlbCkge1xuICAgIHRoaXMucmVuZGVyRGF0ZURpdmlkZXJzKG1vZGVsKTtcbiAgICB2YXIgY2hhdFRlbXBsYXRlID0gJCh0aGlzLmNoYXRUZW1wbGF0ZShtb2RlbC50b0pTT04oKSkpO1xuICAgIGNoYXRUZW1wbGF0ZS5hcHBlbmRUbyh0aGlzLiQoJyNjaGF0Ym94LWNvbnRlbnQnKSkuaGlkZSgpLmZhZGVJbigpLnNsaWRlRG93bigpO1xuICAgICQoJyNjaGF0Ym94LWNvbnRlbnQnKVswXS5zY3JvbGxUb3AgPSAkKCcjY2hhdGJveC1jb250ZW50JylbMF0uc2Nyb2xsSGVpZ2h0O1xuICB9LFxuXG4gIHJlbmRlckRhdGVEaXZpZGVyczogZnVuY3Rpb24obW9kZWwpIHtcbiAgICB0aGlzLmN1cnJlbnREYXRlID0gbW9tZW50KG1vZGVsLmdldCgndGltZXN0YW1wJykpLmZvcm1hdCgnZGRkZCwgTU1NTSBEbyBZWVlZJyk7XG4gICAgaWYgKCB0aGlzLmN1cnJlbnREYXRlICE9PSB0aGlzLnByZXZpb3VzRGF0ZSApIHtcbiAgICAgIHZhciBjdXJyZW50RGF0ZSA9ICQodGhpcy5kYXRlVGVtcGxhdGUobW9kZWwudG9KU09OKCkpKTtcbiAgICAgIGN1cnJlbnREYXRlLmFwcGVuZFRvKHRoaXMuJCgnI2NoYXRib3gtY29udGVudCcpKS5oaWRlKCkuZmFkZUluKCkuc2xpZGVEb3duKCk7XG4gICAgICB0aGlzLnByZXZpb3VzRGF0ZSA9IHRoaXMuY3VycmVudERhdGU7XG4gICAgfVxuICB9LFxuXG4gIGdldE1vcmVDaGF0czogZnVuY3Rpb24oKSB7XG4gICAgY29uc29sZS5sb2coJ2Nydi5mLmdldE1vcmVDaGF0cycpO1xuICAgIHZhciBjaGF0cm9vbSA9IHRoaXMubW9kZWwuZ2V0KCdjaGF0cm9vbScpLFxuICAgIG5hbWUgPSBjaGF0cm9vbS5nZXQoJ25hbWUnKSxcbiAgICBtb2RlbHNMb2FkZWRTdW0gPSBjaGF0cm9vbS5nZXQoJ21vZGVsc0xvYWRlZFN1bScpO1xuICAgIHZhciBjaGF0bG9nTGVuZ3RoID0gY2hhdHJvb20uZ2V0KCdjaGF0bG9nTGVuZ3RoJyk7XG4gICAgdGhpcy52ZW50LnRyaWdnZXIoJ2dldE1vcmVDaGF0cycsIHsgbmFtZTogbmFtZSwgbW9kZWxzTG9hZGVkU3VtOiBtb2RlbHNMb2FkZWRTdW0sIGNoYXRsb2dMZW5ndGg6IGNoYXRsb2dMZW5ndGh9KTtcbiAgICBjaGF0cm9vbS5zZXQoJ21vZGVsc0xvYWRlZFN1bScsIChtb2RlbHNMb2FkZWRTdW0gLSAxKSk7XG4gIH0sXG5cbiAgZ2V0TW9yZURpcmVjdE1lc3NhZ2VzOiBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLmxvZygnY3J2LmYuZ2V0TW9yZURyaWVjdE1lc3NhZ2VzJyk7XG4gICAgdmFyIGNoYXRyb29tID0gdGhpcy5tb2RlbC5nZXQoJ2NoYXRyb29tJyksXG4gICAgaWQgPSBjaGF0cm9vbS5nZXQoJ2lkJyksXG4gICAgbW9kZWxzTG9hZGVkU3VtID0gY2hhdHJvb20uZ2V0KCdtb2RlbHNMb2FkZWRTdW0nKTtcbiAgICB2YXIgY2hhdGxvZ0xlbmd0aCA9IGNoYXRyb29tLmdldCgnY2hhdGxvZ0xlbmd0aCcpO1xuICAgIHRoaXMudmVudC50cmlnZ2VyKCdnZXRNb3JlRGlyZWN0TWVzc2FnZXMnLCB7IGlkOiBpZCwgbW9kZWxzTG9hZGVkU3VtOiBtb2RlbHNMb2FkZWRTdW0sIGNoYXRsb2dMZW5ndGg6IGNoYXRsb2dMZW5ndGh9KTtcbiAgICBjaGF0cm9vbS5zZXQoJ21vZGVsc0xvYWRlZFN1bScsIChtb2RlbHNMb2FkZWRTdW0gLSAxKSk7XG4gIH0sXG5cbiAgcmVuZGVyTW9yZUNoYXRzOiBmdW5jdGlvbihjaGF0cykge1xuICAgIGNvbnNvbGUubG9nKCdjcnYuZi5yZW5kZXJNb3JlQ2hhdHMnKTtcbiAgICAvLyB0aGlzLiQoJyNjaGF0Ym94LWNvbnRlbnQnKTtcbiAgICB2YXIgdGhpc18gPSB0aGlzO1xuICAgIHZhciBvcmlnaW5hbEhlaWdodCA9ICQoJyNjaGF0Ym94LWNvbnRlbnQnKVswXS5zY3JvbGxIZWlnaHQ7XG4gICAgdGhpcy5tb3JlQ2hhdENvbGxlY3Rpb24gPSBbXTtcbiAgICBfLmVhY2goY2hhdHMsIGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgICB0aGlzXy5yZW5kZXJNb3JlRGF0ZURpdmlkZXJzKG1vZGVsKTtcbiAgICAgIHZhciBjaGF0VGVtcGxhdGUgPSAkKHRoaXMuY2hhdFRlbXBsYXRlKG1vZGVsLnRvSlNPTigpKSk7XG4gICAgICB0aGlzXy5tb3JlQ2hhdENvbGxlY3Rpb24ucHVzaChjaGF0VGVtcGxhdGUpO1xuICAgICAgLy8gY2hhdFRlbXBsYXRlLnByZXBlbmRUbyh0aGlzLiQoJyNjaGF0Ym94LWNvbnRlbnQnKSkuaGlkZSgpLmZhZGVJbigpLnNsaWRlRG93bigpO1xuICAgIH0sIHRoaXMpO1xuICAgIF8uZWFjaCh0aGlzLm1vcmVDaGF0Q29sbGVjdGlvbi5yZXZlcnNlKCksIGZ1bmN0aW9uKHRlbXBsYXRlKSB7XG4gICAgICB0ZW1wbGF0ZS5wcmVwZW5kVG8odGhpcy4kKCcjY2hhdGJveC1jb250ZW50JykpO1xuICAgIH0pO1xuXG4gICAgIHRoaXMuZGF0ZURpdmlkZXIubG9hZCgkKFwiLmZvbGxvd01lQmFyXCIpKTtcbiAgICAgJCgnI2NoYXRib3gtY29udGVudCcpWzBdLnNjcm9sbFRvcCA9ICQoJyNjaGF0Ym94LWNvbnRlbnQnKVswXS5zY3JvbGxIZWlnaHQgLSBvcmlnaW5hbEhlaWdodDtcbiAgICAgXG4gIH0sXG5cbiAgcmVuZGVyTW9yZURhdGVEaXZpZGVyczogZnVuY3Rpb24obW9kZWwpIHtcbiAgICB0aGlzLmN1cnJlbnREYXRlID0gbW9tZW50KG1vZGVsLmF0dHJpYnV0ZXMudGltZXN0YW1wKS5mb3JtYXQoJ2RkZGQsIE1NTU0gRG8gWVlZWScpO1xuICAgIGlmICggdGhpcy5jdXJyZW50RGF0ZSAhPT0gdGhpcy5wcmV2aW91c0RhdGUgKSB7XG4gICAgICB2YXIgY3VycmVudERhdGUgPSAkKHRoaXMuZGF0ZVRlbXBsYXRlKG1vZGVsLnRvSlNPTigpKSk7XG4gICAgICAvLyBjdXJyZW50RGF0ZS5hcHBlbmRUbyh0aGlzLiQoJyNjaGF0Ym94LWNvbnRlbnQnKSkuaGlkZSgpLmZhZGVJbigpLnNsaWRlRG93bigpO1xuICAgICAgdGhpcy5tb3JlQ2hhdENvbGxlY3Rpb24ucHVzaChjdXJyZW50RGF0ZSk7XG4gICAgICB0aGlzLnByZXZpb3VzRGF0ZSA9IHRoaXMuY3VycmVudERhdGU7XG4gICAgfVxuICB9LFxuXG4gIGF1dG9zaXplcjogZnVuY3Rpb24oKSB7XG4gICAgYXV0b3NpemUoJCgnI21lc3NhZ2UtaW5wdXQnKSk7XG4gIH0sXG4gIFxuICBzY3JvbGxCb3R0b21JbnN1cmFuY2U6IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHRoaXNfID0gdGhpcztcbiAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgICAgdGhpcy4kKCcjY2hhdGJveC1jb250ZW50JylbMF0uc2Nyb2xsVG9wID0gdGhpcy4kKCcjY2hhdGJveC1jb250ZW50JylbMF0uc2Nyb2xsSGVpZ2h0O1xuICAgIH0sIDUwKTtcbiAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgfSwgODAwKTtcbiAgfSxcblxuICBhZnRlckNoYXRzUmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmF1dG9zaXplcigpO1xuICAgIHRoaXMuZGF0ZURpdmlkZXIubG9hZCgkKFwiLmZvbGxvd01lQmFyXCIpKTtcbiAgICB0aGlzLnNjcm9sbEJvdHRvbUluc3VyYW5jZSgpO1xuICB9LFxuXG5cblxuXG5cblxuXG5cbi8vIHJvb21zXG5cblxuICBzZWFyY2g6IGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS5rZXlDb2RlID09PSAxMyAmJiAkLnRyaW0oJCgnI2NoYXQtc2VhcmNoLWlucHV0JykudmFsKCkpLmxlbmd0aCA+IDApIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHZhciBuYW1lID0gJCgnI2NoYXQtc2VhcmNoLWlucHV0JykudmFsKCk7XG4gICAgICB0aGlzLmFkZENoYXRyb29tKG5hbWUpO1xuICAgICAgdGhpcy4kKCcjY2hhdC1zZWFyY2gtaW5wdXQnKS52YWwoJycpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZygnc2VhcmNoIHR5cGluZycpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgY3JlYXRlUm9vbTogZnVuY3Rpb24oZm9ybSkge1xuICAgIHRoaXMudmVudC50cmlnZ2VyKCdjcmVhdGVSb29tJywgZm9ybSk7XG4gIH0sXG4gIHVwZGF0ZVJvb206IGZ1bmN0aW9uKGZvcm0pIHtcbiAgICB2YXIgaWQgPSB0aGlzLm1vZGVsLmdldCgnY2hhdHJvb20nKS5nZXQoJ2lkJyk7XG4gICAgZm9ybS5pZCA9IGlkO1xuICAgIHRoaXMudmVudC50cmlnZ2VyKCd1cGRhdGVSb29tJywgZm9ybSk7XG4gIH0sXG4gIGRlc3Ryb3lSb29tOiBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHZhciB0aGlzXyA9IHRoaXM7XG4gICAgdmFyIGNvbmZpcm1hdGlvbiA9IHN3YWwoe1xuICAgICAgdGl0bGU6IFwiRG8geW91IHdpc2ggdG8gZGVzdHJveSB0aGUgcm9vbT9cIixcbiAgICAgIHRleHQ6IFwiVGhpcyBraWxscyB0aGUgcm9vbS5cIixcbiAgICAgIHR5cGU6IFwid2FybmluZ1wiLFxuICAgICAgc2hvd0NhbmNlbEJ1dHRvbjogdHJ1ZSxcbiAgICAgIGNvbmZpcm1CdXR0b25Db2xvcjogXCIjREVCMEIwXCIsXG4gICAgICBjb25maXJtQnV0dG9uVGV4dDogXCJNdWFoYWhhIVwiLFxuICAgICAgY2xvc2VPbkNvbmZpcm06IGZhbHNlLFxuICAgICAgaHRtbDogZmFsc2VcbiAgICB9LCBmdW5jdGlvbigpe1xuICAgICAgc3dhbCh7XG4gICAgICAgIHRpdGxlOiBcIkV2aXNjZXJhdGVkIVwiLFxuICAgICAgICB0ZXh0OiBcIllvdXIgY2hhdHJvb20gaGFzIGJlZW4gcHVyZ2VkLlwiLFxuICAgICAgICB0eXBlOiBcInN1Y2Nlc3NcIixcbiAgICAgICAgY29uZmlybUJ1dHRvbkNvbG9yOiBcIiM3NDlDQThcIixcbiAgICAgIH0pO1xuICAgICAgdGhpc18udmVudC50cmlnZ2VyKCdkZXN0cm95Um9vbScsIHRoaXNfLm1vZGVsLmdldCgnY2hhdHJvb20nKS5nZXQoJ25hbWUnKSk7XG4gICAgfSk7XG4gIH0sXG4gIGFkZENoYXRyb29tOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgY29uc29sZS5sb2coJ2Nydi5mLmFkZENoYXRyb29tJyk7XG4gICAgdGhpcy52ZW50LnRyaWdnZXIoJ2FkZFJvb20nLCBuYW1lKTtcbiAgfSxcbiAgcmVtb3ZlUm9vbTogZnVuY3Rpb24oZSkge1xuICAgIHZhciB0aGlzXyA9IHRoaXM7XG4gICAgdmFyIGNvbmZpcm1hdGlvbiA9IHN3YWwoe1xuICAgICAgdGl0bGU6IFwiUmVtb3ZlIFRoaXMgUm9vbT9cIixcbiAgICAgIHRleHQ6IFwiQXJlIHlvdSBzdXJlPyBBcmUgeW91IHN1cmUgeW91J3JlIHN1cmU/IEhvdyBzdXJlIGNhbiB5b3UgYmU/XCIsXG4gICAgICB0eXBlOiBcIndhcm5pbmdcIixcbiAgICAgIHNob3dDYW5jZWxCdXR0b246IHRydWUsXG4gICAgICBjb25maXJtQnV0dG9uQ29sb3I6IFwiI0RFQjBCMFwiLFxuICAgICAgY29uZmlybUJ1dHRvblRleHQ6IFwiTXVhaGFoYSFcIixcbiAgICAgIGNsb3NlT25Db25maXJtOiBmYWxzZSxcbiAgICAgIGh0bWw6IGZhbHNlXG4gICAgfSwgZnVuY3Rpb24oKXtcbiAgICAgIHN3YWwoe1xuICAgICAgICB0aXRsZTogXCJSZW1vdmVkIVwiLFxuICAgICAgICB0ZXh0OiBcIllvdSBhcmUgZnJlZSBvZiB0aGlzIGNoYXRyb29tLiBHbyBvbiwgeW91J3JlIGZyZWUgbm93LlwiLFxuICAgICAgICB0eXBlOiBcInN1Y2Nlc3NcIixcbiAgICAgICAgY29uZmlybUJ1dHRvbkNvbG9yOiBcIiM3NDlDQThcIlxuICAgICAgfSk7XG4gICAgICB2YXIgbmFtZSA9ICQoZS50YXJnZXQpLmRhdGEoXCJyb29tLW5hbWVcIik7XG4gICAgICB0aGlzXy52ZW50LnRyaWdnZXIoJ3JlbW92ZVJvb20nLCBuYW1lKTtcbiAgICB9KTtcbiAgfSxcbiAgcmVuZGVyUm9vbXM6IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKCdjcnYuZi5yZW5kZXJSb29tcycpO1xuICAgIGNvbnNvbGUubG9nKCdDSEFUUk9PTVM6ICcsIHRoaXMubW9kZWwuZ2V0KFwiY2hhdHJvb21zXCIpKTtcbiAgICB0aGlzLiQoJy5wdWJsaWMtcm9vbXMnKS5lbXB0eSgpO1xuICAgIHRoaXMubW9kZWwuZ2V0KCdjaGF0cm9vbXMnKS5lYWNoKGZ1bmN0aW9uIChyb29tKSB7XG4gICAgICB0aGlzLnJlbmRlclJvb20ocm9vbSk7XG4gICAgfSwgdGhpcyk7XG4gIH0sXG4gIHJlbmRlclJvb206IGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgdmFyIG5hbWUxID0gbW9kZWwuZ2V0KCduYW1lJyksXG4gICAgbmFtZTIgPSB0aGlzLm1vZGVsLmdldCgnY2hhdHJvb20nKS5nZXQoJ25hbWUnKTtcbiAgICB0aGlzLiQoJy5wdWJsaWMtcm9vbXMnKS5hcHBlbmQodGhpcy5yb29tVGVtcGxhdGUobW9kZWwudG9KU09OKCkpKTtcbiAgICBpZiAobmFtZTEgPT09IG5hbWUyKSB7XG4gICAgICB0aGlzLiQoJy5yb29tJykubGFzdCgpLmZpbmQoJy5yb29tLW5hbWUnKS5jc3MoJ2NvbG9yJywgJyNERUIwQjAnKS5mYWRlSW4oKTtcbiAgICB9XG4gIH0sXG4gIHJlbmRlclByaXZhdGVSb29tczogZnVuY3Rpb24oKSB7XG4gICAgY29uc29sZS5sb2coJ2Nydi5mLnJlbmRlclByaXZhdGVSb29tcycpO1xuICAgIGNvbnNvbGUubG9nKCdQUklWQVRFUk9PTVM6ICcsIHRoaXMubW9kZWwuZ2V0KFwicHJpdmF0ZVJvb21zXCIpKTtcbiAgICB0aGlzLiQoJyNwcml2YXRlLXJvb21zJykuZW1wdHkoKTtcbiAgICB0aGlzLm1vZGVsLmdldCgncHJpdmF0ZVJvb21zJykuZWFjaChmdW5jdGlvbiAocm9vbSkge1xuICAgICAgdGhpcy5yZW5kZXJQcml2YXRlUm9vbShyb29tKTtcbiAgICB9LCB0aGlzKTtcbiAgfSxcbiAgcmVuZGVyUHJpdmF0ZVJvb206IGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgLy8gdmFyIG5hbWUxID0gbW9kZWwuZ2V0KCduYW1lJyksXG4gICAgLy8gbmFtZTIgPSB0aGlzLm1vZGVsLmdldCgnY2hhdHJvb20nKS5nZXQoJ25hbWUnKTtcbiAgICB0aGlzLiQoJyNwcml2YXRlLXJvb21zJykuYXBwZW5kKHRoaXMucm9vbVRlbXBsYXRlKG1vZGVsLnRvSlNPTigpKSk7XG4gICAgLy8gaWYgKG5hbWUxID09PSBuYW1lMikge1xuICAgIC8vICAgdGhpcy4kKCcucm9vbScpLmxhc3QoKS5maW5kKCcucm9vbS1uYW1lJykuY3NzKCdjb2xvcicsICcjREVCMEIwJykuZmFkZUluKCk7XG4gICAgLy8gfVxuICB9LFxuICBqb2luUm9vbTogZnVuY3Rpb24obmFtZSkge1xuICAgIGNvbnNvbGUubG9nKCdjcnYuZi5qb2luUm9vbScpO1xuICAgICAkKCcjY2hhdEltYWdlVXBsb2FkQ29udGFpbmVyJykuZGF0YSgnY2hhdC10eXBlJywgJ2NoYXQnKTtcbiAgICB0aGlzLmN1cnJlbnREYXRlID0gJyc7XG4gICAgdGhpcy5wcmV2aW91c0RhdGUgPSAnJztcbiAgICB0aGlzLnZlbnQudHJpZ2dlcignam9pblJvb20nLCBuYW1lKTtcbiAgfSxcbi8vIGNoYW5nZSB0byAnam9pbkRpcmVjdE1lc3NhZ2UnXG4gIGluaXREaXJlY3RNZXNzYWdlOiBmdW5jdGlvbihlKSB7XG4gICAgdmFyIHJlY2lwaWVudCA9IHt9LFxuICAgICAgICAkdGFyID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgIHJlY2lwaWVudC51c2VybmFtZSA9ICR0YXIudGV4dCgpLnRyaW0oKTtcbiAgICByZWNpcGllbnQudXNlckltYWdlID0gJHRhci5maW5kKCdpbWcnKS5hdHRyKCdzcmMnKTtcbiAgICB0aGlzLmN1cnJlbnREYXRlID0gJyc7XG4gICAgdGhpcy5wcmV2aW91c0RhdGUgPSAnJztcbiAgICBpZiAodGhpcy5tb2RlbC5nZXQoJ2NoYXRyb29tJykuZ2V0KCdjdXJyZW50VXNlcicpICE9PSByZWNpcGllbnQudXNlcm5hbWUpIHtcbiAgICAgIHRoaXMudmVudC50cmlnZ2VyKCdpbml0RGlyZWN0TWVzc2FnZScsIHJlY2lwaWVudCk7XG4gICAgfVxuICB9LFxuXG5cblxuXG5cbi8vIGltYWdlIHVwbG9hZFxuXG4gY2hhdFVwbG9hZEltYWdlOiBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIGNvbnNvbGUubG9nKCdpbWcgdXJsOiAnLCByZXNwb25zZSk7XG4gICAgdGhpcy52ZW50LnRyaWdnZXIoXCJjaGF0XCIsIHJlc3BvbnNlKTtcbiAgICB0aGlzLnNjcm9sbEJvdHRvbUluc3VyYW5jZSgpO1xuICB9LFxuXG4gIG1lc3NhZ2VVcGxvYWRJbWFnZTogZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgIGNvbnNvbGUubG9nKCdpbWcgdXJsOiAnLCByZXNwb25zZSk7XG4gICB0aGlzLnZlbnQudHJpZ2dlcihcImRpcmVjdE1lc3NhZ2VcIiwgcmVzcG9uc2UpO1xuICAgdGhpcy5zY3JvbGxCb3R0b21JbnN1cmFuY2UoKTtcbiB9LFxuXG5cblxuXG5cbiAgLy9ldmVudHNcblxuXG4gIG1lc3NhZ2VJbnB1dFByZXNzZWQ6IGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS5rZXlDb2RlID09PSAxMyAmJiAkLnRyaW0oJCgnLm1lc3NhZ2UtaW5wdXQnKS52YWwoKSkubGVuZ3RoID4gMCkge1xuICAgICAgLy8gZnVuIGZhY3Q6IHNlcGFyYXRlIGV2ZW50cyB3aXRoIGEgc3BhY2UgaW4gdHJpZ2dlcidzIGZpcnN0IGFyZyBhbmQgeW91XG4gICAgICAvLyBjYW4gdHJpZ2dlciBtdWx0aXBsZSBldmVudHMuXG4gICAgICB0aGlzLnZlbnQudHJpZ2dlcihcImNoYXRcIiwgeyBtZXNzYWdlOiB0aGlzLiQoJy5tZXNzYWdlLWlucHV0JykudmFsKCl9KTtcbiAgICAgIHRoaXMuJCgnLm1lc3NhZ2UtaW5wdXQnKS52YWwoJycpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnZlbnQudHJpZ2dlcihcInR5cGluZ1wiKTtcbiAgICAgIGNvbnNvbGUubG9nKCd3dXQnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGRpcmVjdE1lc3NhZ2VJbnB1dFByZXNzZWQ6IGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS5rZXlDb2RlID09PSAxMyAmJiAkLnRyaW0oJCgnLmRpcmVjdC1tZXNzYWdlLWlucHV0JykudmFsKCkpLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIGZ1biBmYWN0OiBzZXBhcmF0ZSBldmVudHMgd2l0aCBhIHNwYWNlIGluIHRyaWdnZXIncyBmaXJzdCBhcmcgYW5kIHlvdVxuICAgICAgLy8gY2FuIHRyaWdnZXIgbXVsdGlwbGUgZXZlbnRzLlxuICAgICAgdGhpcy52ZW50LnRyaWdnZXIoXCJkaXJlY3RNZXNzYWdlXCIsIHsgbWVzc2FnZTogdGhpcy4kKCcuZGlyZWN0LW1lc3NhZ2UtaW5wdXQnKS52YWwoKX0pO1xuICAgICAgdGhpcy4kKCcuZGlyZWN0LW1lc3NhZ2UtaW5wdXQnKS52YWwoJycpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnZlbnQudHJpZ2dlcihcInR5cGluZ1wiKTtcbiAgICAgIGNvbnNvbGUubG9nKCdodWgnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHNldFJvb206IGZ1bmN0aW9uKGUpIHtcbiAgICBjb25zb2xlLmxvZygnY3J2LmYuc2V0Um9vbScpO1xuICAgIHZhciAkdGFyID0gJChlLnRhcmdldCk7XG4gICAgaWYgKCR0YXIuaXMoJy5yb29tLW5hbWUnKSkge1xuICAgICAgdGhpcy5qb2luUm9vbSgkdGFyLmRhdGEoJ3Jvb20nKSk7XG4gICAgfVxuICB9LFxuXG5cbiAgZGF0ZURpdmlkZXI6IChmdW5jdGlvbigpIHtcblxuICAgIHZhciAkd2luZG93ID0gJCh3aW5kb3cpLFxuICAgICRzdGlja2llcztcblxuICAgIGxvYWQgPSBmdW5jdGlvbihzdGlja2llcykge1xuICAgICAgJHN0aWNraWVzID0gc3RpY2tpZXM7XG4gICAgICAkKCcjY2hhdGJveC1jb250ZW50Jykuc2Nyb2xsKHNjcm9sbFN0aWNraWVzSW5pdCk7XG4gICAgfTtcblxuICAgIHNjcm9sbFN0aWNraWVzSW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgJCh0aGlzKS5vZmYoXCJzY3JvbGwuc3RpY2tpZXNcIik7XG4gICAgICAkKHRoaXMpLm9uKFwic2Nyb2xsLnN0aWNraWVzXCIsIF8uZGVib3VuY2UoX3doZW5TY3JvbGxpbmcsIDE1MCkpO1xuICAgIH07XG5cbiAgICBfd2hlblNjcm9sbGluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHN0aWNraWVzLnJlbW92ZUNsYXNzKCdmaXhlZCcpO1xuICAgICAgJHN0aWNraWVzLmVhY2goZnVuY3Rpb24oaSwgc3RpY2t5KSB7XG4gICAgICAgIHZhciAkdGhpc1N0aWNreSA9ICQoc3RpY2t5KSxcbiAgICAgICAgJHRoaXNTdGlja3lUb3AgPSAkdGhpc1N0aWNreS5vZmZzZXQoKS50b3A7XG4gICAgICAgIGlmICgkdGhpc1N0aWNreVRvcCA8PSAxNjIpIHtcbiAgICAgICAgICAkdGhpc1N0aWNreS5hZGRDbGFzcyhcImZpeGVkXCIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGxvYWQ6IGxvYWRcbiAgICB9O1xuICB9KSgpXG5cblxuXG5cbn0pO1xuXG59KShqUXVlcnkpOyIsIlxudmFyIGFwcCA9IGFwcCB8fCB7fTtcblxuKGZ1bmN0aW9uICgpIHtcblxuICBhcHAuSW52aXRhdGlvbkNvbGxlY3Rpb24gPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgbW9kZWw6IGFwcC5JbnZpdGF0aW9uTW9kZWxcbiAgfSk7XG5cbn0pKCk7IiwiXG52YXIgYXBwID0gYXBwIHx8IHt9O1xuXG4oZnVuY3Rpb24gKCkge1xuXG4gIGFwcC5DaGF0cm9vbUxpc3QgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgbW9kZWw6IGFwcC5DaGF0cm9vbU1vZGVsLFxuICAgIHVybDogJy9hcGkvY2hhdHJvb21zJyxcbiAgfSk7XG5cbn0pKCk7IiwidmFyIGFwcCA9IGFwcCB8fCB7fTtcblxuKGZ1bmN0aW9uICgpIHtcblxuICBhcHAuUHJpdmF0ZVJvb21Db2xsZWN0aW9uID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIG1vZGVsOiBhcHAuQ2hhdHJvb21Nb2RlbCxcbiAgfSk7XG5cbn0pKCk7IiwidmFyIGFwcCA9IGFwcCB8fCB7fTtcblxuXG4oZnVuY3Rpb24oJCkge1xuXG4gIGFwcC5DaGF0SW1hZ2VVcGxvYWRWaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXG4gICAgZWw6ICQoJyNjaGF0SW1hZ2VVcGxvYWRDb250YWluZXInKSxcbiAgXG4gICAgZXZlbnRzOiB7XG4gICAgICAnY2hhbmdlICNjaGF0SW1hZ2VVcGxvYWQnOiAncmVuZGVyVGh1bWInLFxuICAgICAgJ2F0dGFjaEltYWdlICNjaGF0SW1hZ2VVcGxvYWRGb3JtJzogJ3VwbG9hZCcsXG4gICAgICAnY2xpY2sgI2FkZENoYXRJbWFnZUJ0bic6ICdzdWJtaXQnLFxuICAgIH0sXG5cbiAgICAvLyBpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAvLyAgIHRoaXMubGlzdGVuVG8odGhpcywgXCJmaWxlLWNob3NlblwiLCB0aGlzLnJlbmRlclRodW1iLCB0aGlzKTtcbiAgICAvLyAgIHRoaXMubGlzdGVuVG8odGhpcywgXCJmaWxlLWNob3NlblwiLCB0aGlzLnJlbmRlclRodW1iLCB0aGlzKTtcbiAgICAvLyB9LFxuXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMucmVuZGVyVGh1bWIoKTtcbiAgICB9LFxuXG4gICAgcmVuZGVyVGh1bWI6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGlucHV0ID0gdGhpcy4kKCcjY2hhdEltYWdlVXBsb2FkJyk7XG4gICAgICB2YXIgaW1nID0gdGhpcy4kKCcjdXBsb2FkZWRDaGF0SW1hZ2UnKVswXTtcbiAgICAgIGlmKGlucHV0LnZhbCgpICE9PSAnJykge1xuICAgICAgICB2YXIgc2VsZWN0ZWRfZmlsZSA9IGlucHV0WzBdLmZpbGVzWzBdO1xuICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgcmVhZGVyLm9ubG9hZCA9IChmdW5jdGlvbihhSW1nKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGFJbWcuc3JjID0gZS50YXJnZXQucmVzdWx0O1xuICAgICAgICAgIH07XG4gICAgICAgIH0pKGltZyk7XG4gICAgICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKCBzZWxlY3RlZF9maWxlICk7XG4gICAgICB9XG5cbiAgICB9LFxuXG4gICAgc3VibWl0OiBmdW5jdGlvbihlKSB7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLiRmb3JtID0gdGhpcy4kKCcjY2hhdEltYWdlVXBsb2FkRm9ybScpO1xuICAgICAgdGhpcy4kZm9ybS50cmlnZ2VyKCdhdHRhY2hJbWFnZScpO1xuICAgIH0sXG5cbiAgICB1cGxvYWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgdmFyIGZvcm1EYXRhID0gbmV3IEZvcm1EYXRhKHRoaXMuJGZvcm1bMF0pO1xuICAgICAgaWYgKHRoaXMuJCgnI2NoYXRJbWFnZVVwbG9hZCcpWzBdLmZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICB0eXBlOiAnUE9TVCcsXG4gICAgICAgICAgdXJsOiAnL2FwaS91cGxvYWRDaGF0SW1hZ2UnLFxuICAgICAgICAgIGRhdGE6IGZvcm1EYXRhLFxuICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICAgIHByb2Nlc3NEYXRhOiBmYWxzZSxcbiAgICAgICAgICBjb250ZW50VHlwZTogZmFsc2UsXG4gICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKCB4aHIgKSB7XG4gICAgICAgICAgICBfdGhpcy5yZW5kZXJTdGF0dXMoJ0Vycm9yOiAnICsgeGhyLnN0YXR1cyk7XG4gICAgICAgICAgICBhbGVydCgnWW91ciBpbWFnZSBpcyBlaXRoZXIgdG9vIGxhcmdlIG9yIGl0IGlzIG5vdCBhIC5qcGVnLCAucG5nLCBvciAuZ2lmLicpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2ltZ1VwbG9hZCByZXNwb25zZTogJywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgX3RoaXMuJGVsLmRhdGEoJ2NoYXQtdHlwZScpID09PSAnY2hhdCcgP1xuICAgICAgICAgICAgICBfdGhpcy50cmlnZ2VyKCdjaGF0LWltYWdlLXVwbG9hZGVkJywgcmVzcG9uc2UpIDpcbiAgICAgICAgICAgICAgX3RoaXMudHJpZ2dlcignbWVzc2FnZS1pbWFnZS11cGxvYWRlZCcsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdpbWdVcGxvYWQgcGF0aCAnLCByZXNwb25zZS5wYXRoKTtcbiAgICAgICAgICAgICQoJyNjaGF0SW1hZ2VVcGxvYWRNb2RhbCcpLm1vZGFsKCdoaWRlJyk7XG4gICAgICAgICAgICBfdGhpcy5jbGVhckZpZWxkKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgdGhpcy50cmlnZ2VyKCdpbWFnZS11cGxvYWRlZCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG5cbiAgICByZW5kZXJTdGF0dXM6IGZ1bmN0aW9uKCBzdGF0dXMgKSB7XG4gICAgICAkKCcjc3RhdHVzJykudGV4dChzdGF0dXMpO1xuICAgIH0sXG5cbiAgICBjbGVhckZpZWxkOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuJCgnI3VwbG9hZGVkQ2hhdEltYWdlJylbMF0uc3JjID0gJyc7XG4gICAgICB0aGlzLiQoJyNjaGF0SW1hZ2VVcGxvYWQnKS52YWwoJycpO1xuICAgIH1cblxuICB9KTtcblxufSkoalF1ZXJ5KTsiLCJ2YXIgYXBwID0gYXBwIHx8IHt9O1xuXG5cbihmdW5jdGlvbigkKSB7XG5cbiAgYXBwLkNoYXRyb29tSW1hZ2VVcGxvYWRWaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXG4gICAgZWw6ICQoJyNjcmVhdGVDaGF0cm9vbUNvbnRhaW5lcicpLFxuICAgIGV2ZW50czoge1xuICAgICAgJ2NoYW5nZSAjY2hhdHJvb21JbWFnZVVwbG9hZCc6ICdyZW5kZXJUaHVtYicsXG4gICAgICAnYXR0YWNoSW1hZ2UgI2NyZWF0ZUNoYXRyb29tRm9ybSc6ICd1cGxvYWQnLFxuICAgICAgJ2NsaWNrICNjcmVhdGVDaGF0cm9vbUJ0bic6ICdzdWJtaXQnLFxuICAgIH0sXG5cbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5yZW5kZXJUaHVtYigpO1xuICAgIH0sXG5cbiAgICByZW5kZXJUaHVtYjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaW5wdXQgPSB0aGlzLiQoJyNjaGF0cm9vbUltYWdlVXBsb2FkJyk7XG4gICAgICB2YXIgaW1nID0gdGhpcy4kKCcjdXBsb2FkZWRDaGF0cm9vbUltYWdlJylbMF07XG4gICAgICBpZihpbnB1dC52YWwoKSAhPT0gJycpIHtcbiAgICAgICAgdmFyIHNlbGVjdGVkX2ZpbGUgPSBpbnB1dFswXS5maWxlc1swXTtcbiAgICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgIHJlYWRlci5vbmxvYWQgPSAoZnVuY3Rpb24oYUltZykge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBhSW1nLnNyYyA9IGUudGFyZ2V0LnJlc3VsdDtcbiAgICAgICAgICB9O1xuICAgICAgICB9KShpbWcpO1xuICAgICAgICByZWFkZXIucmVhZEFzRGF0YVVSTCggc2VsZWN0ZWRfZmlsZSApO1xuICAgICAgfVxuXG4gICAgfSxcblxuICAgIHN1Ym1pdDogZnVuY3Rpb24oZSkge1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy4kZm9ybSA9IHRoaXMuJCgnI2NyZWF0ZUNoYXRyb29tRm9ybScpO1xuICAgICAgdGhpcy4kZm9ybS50cmlnZ2VyKCdhdHRhY2hJbWFnZScpO1xuICAgIH0sXG5cbiAgICB1cGxvYWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgdmFyIGZvcm1EYXRhID0gbmV3IEZvcm1EYXRhKHRoaXMuJGZvcm1bMF0pO1xuICAgICAgaWYgKHRoaXMuJCgnI2NoYXRyb29tSW1hZ2VVcGxvYWQnKVswXS5maWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgdHlwZTogJ1BPU1QnLFxuICAgICAgICAgIHVybDogJy9hcGkvdXBsb2FkQ2hhdHJvb21JbWFnZScsXG4gICAgICAgICAgZGF0YTogZm9ybURhdGEsXG4gICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgICAgcHJvY2Vzc0RhdGE6IGZhbHNlLFxuICAgICAgICAgIGNvbnRlbnRUeXBlOiBmYWxzZSxcbiAgICAgICAgICBlcnJvcjogZnVuY3Rpb24oIHhociApIHtcbiAgICAgICAgICAgIF90aGlzLnJlbmRlclN0YXR1cygnRXJyb3I6ICcgKyB4aHIuc3RhdHVzKTtcbiAgICAgICAgICAgIGFsZXJ0KCdZb3VyIGltYWdlIGlzIGVpdGhlciB0b28gbGFyZ2Ugb3IgaXQgaXMgbm90IGEgLmpwZWcsIC5wbmcsIG9yIC5naWYuJyk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnaW1nVXBsb2FkIHJlc3BvbnNlOiAnLCByZXNwb25zZSk7XG4gICAgICAgICAgICB2YXIgZm9ybSA9IF90aGlzLmNyZWF0ZVJvb21Gb3JtRGF0YSgpO1xuICAgICAgICAgICAgcmVzcG9uc2UubmFtZSA9IGZvcm0ubmFtZTtcbiAgICAgICAgICAgICAgX3RoaXMudHJpZ2dlcignY3JlYXRlUm9vbScsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICQoJyNjcmVhdGVDaGF0cm9vbU1vZGFsJykubW9kYWwoJ2hpZGUnKTtcbiAgICAgICAgICAgIF90aGlzLmNsZWFyRmllbGQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGZvcm0gPSBfdGhpcy5jcmVhdGVSb29tRm9ybURhdGEoKTtcbiAgICAgICAgZGVidWdnZXI7XG4gICAgICAgdGhpcy50cmlnZ2VyKCdjcmVhdGVSb29tJywgZm9ybSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcblxuXG4gICAgY3JlYXRlUm9vbUZvcm1EYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBmb3JtRGF0YSA9IHt9O1xuICAgICAgZm9ybURhdGEucm9vbUltYWdlID0gJy9pbWcvY2hqYXQtaWNvbjEucG5nJztcbiAgICAgIHRoaXMuJCgnI2NyZWF0ZUNoYXRyb29tRm9ybScpLmNoaWxkcmVuKCAnaW5wdXQnICkuZWFjaChmdW5jdGlvbihpLCBlbCkge1xuICAgICAgICBpZiAoJChlbCkuZGF0YSgnY3JlYXRlJykgPT09ICdwcml2YWN5Jykge1xuICAgICAgICAgIHZhciB2YWwgPSAkKGVsKS5wcm9wKCdjaGVja2VkJyk7XG4gICAgICAgICAgZm9ybURhdGFbJ3ByaXZhY3knXSA9IHZhbDtcbiAgICAgICAgICBkZWJ1Z2dlcjtcbiAgICAgICAgfSBlbHNlIGlmICgkKGVsKS52YWwoKSAhPT0gJycpIHtcbiAgICAgICAgICBmb3JtRGF0YVskKGVsKS5kYXRhKCdjcmVhdGUnKV0gPSAkKGVsKS52YWwoKTtcbiAgICAgICAgICAkKGVsKS52YWwoJycpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBmb3JtRGF0YTtcblxuICAgIH0sXG5cbiAgICByZW5kZXJTdGF0dXM6IGZ1bmN0aW9uKCBzdGF0dXMgKSB7XG4gICAgICAkKCcjc3RhdHVzJykudGV4dChzdGF0dXMpO1xuICAgIH0sXG5cbiAgICBjbGVhckZpZWxkOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuJCgnI3VwbG9hZGVkQ2hhdHJvb21JbWFnZScpWzBdLnNyYyA9ICcnO1xuICAgICAgdGhpcy4kKCcjY2hhdHJvb21JbWFnZVVwbG9hZCcpLnZhbCgnJyk7XG4gICAgfVxuXG4gIH0pO1xuXG59KShqUXVlcnkpOyIsInZhciBhcHAgPSBhcHAgfHwge307XG5cblxuKGZ1bmN0aW9uKCQpIHtcblxuICBhcHAuQ2hhdHJvb21TZXR0aW5nc1ZpZXcgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cbiAgICBlbDogJCgnI2NoYXRyb29tLXNldHRpbmdzJyksXG4gICAgZXZlbnRzOiB7XG4gICAgICAnY2hhbmdlICNwcmVmZXJlbmNlcy1pbWFnZS11cGxvYWQnOiAncmVuZGVyVGh1bWInLFxuICAgICAgJ2F0dGFjaEltYWdlICNwcmVmZXJlbmNlcy1mb3JtJzogJ3VwbG9hZCcsXG4gICAgICAnY2xpY2sgI3ByZWZlcmVuY2VzLWJ0bic6ICdzdWJtaXQnLFxuICAgICAgJ2tleXByZXNzICNpbnZpdGUtdXNlci1pbnB1dCc6ICdpbnZpdGVVc2VyJyxcbiAgICB9LFxuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgdGhpcy52ZW50ID0gb3B0aW9ucy52ZW50O1xuICAgICAgdGhpcy51c2VyU2VhcmNoVHlwZWFoZWFkKCk7XG4gICAgICB2YXIgdGhpc18gPSB0aGlzO1xuICAgICAgJChcImZvcm1cIikuc3VibWl0KGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzXy5pbnZpdGVVc2VyKCk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMucmVuZGVyVGh1bWIoKTtcbiAgICB9LFxuXG4gICAgcmVuZGVyVGh1bWI6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGlucHV0ID0gdGhpcy4kKCcjcHJlZmVyZW5jZXMtaW1hZ2UtdXBsb2FkJyk7XG4gICAgICB2YXIgaW1nID0gdGhpcy4kKCcjdXBsb2FkZWQtcHJlZmVyZW5jZXMtaW1hZ2UnKVswXTtcbiAgICAgIGlmKGlucHV0LnZhbCgpICE9PSAnJykge1xuICAgICAgICB2YXIgc2VsZWN0ZWRfZmlsZSA9IGlucHV0WzBdLmZpbGVzWzBdO1xuICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgcmVhZGVyLm9ubG9hZCA9IChmdW5jdGlvbihhSW1nKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGFJbWcuc3JjID0gZS50YXJnZXQucmVzdWx0O1xuICAgICAgICAgIH07XG4gICAgICAgIH0pKGltZyk7XG4gICAgICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKCBzZWxlY3RlZF9maWxlICk7XG4gICAgICB9XG5cbiAgICB9LFxuXG4gICAgc3VibWl0OiBmdW5jdGlvbihlKSB7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgIHRoaXMuJGZvcm0gPSB0aGlzLiQoJyNwcmVmZXJlbmNlcy1mb3JtJyk7XG4gICAgICB0aGlzLiRmb3JtLnRyaWdnZXIoJ2F0dGFjaEltYWdlJyk7XG4gICAgfSxcblxuICAgIHVwbG9hZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB2YXIgZm9ybURhdGEgPSBuZXcgRm9ybURhdGEodGhpcy4kZm9ybVswXSk7XG4gICAgICBpZiAodGhpcy4kKCcjcHJlZmVyZW5jZXMtaW1hZ2UtdXBsb2FkJylbMF0uZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgICB1cmw6ICcvYXBpL3VwbG9hZENoYXRyb29tSW1hZ2UnLFxuICAgICAgICAgIGRhdGE6IGZvcm1EYXRhLFxuICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICAgIHByb2Nlc3NEYXRhOiBmYWxzZSxcbiAgICAgICAgICBjb250ZW50VHlwZTogZmFsc2UsXG4gICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKCB4aHIgKSB7XG4gICAgICAgICAgICBfdGhpcy5yZW5kZXJTdGF0dXMoJ0Vycm9yOiAnICsgeGhyLnN0YXR1cyk7XG4gICAgICAgICAgICBhbGVydCgnWW91ciBpbWFnZSBpcyBlaXRoZXIgdG9vIGxhcmdlIG9yIGl0IGlzIG5vdCBhIC5qcGVnLCAucG5nLCBvciAuZ2lmLicpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2ltZ1VwbG9hZCByZXNwb25zZTogJywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgdmFyIGZvcm0gPSBfdGhpcy5jcmVhdGVSb29tRm9ybURhdGEoKTtcbiAgICAgICAgICAgIGZvcm0ucm9vbUltYWdlID0gcmVzcG9uc2Uucm9vbUltYWdlO1xuICAgICAgICAgICAgX3RoaXMudHJpZ2dlcigndXBkYXRlUm9vbScsIGZvcm0pO1xuICAgICAgICAgICAgJCgnI3ByZWZlcmVuY2VzLW1vZGFsJykubW9kYWwoJ2hpZGUnKTtcbiAgICAgICAgICAgIF90aGlzLmNsZWFyRmllbGQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGZvcm0gPSB0aGlzLmNyZWF0ZVJvb21Gb3JtRGF0YSgpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3VwZGF0ZVJvb20nLCBmb3JtKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuXG5cbiAgICBjcmVhdGVSb29tRm9ybURhdGE6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGZvcm1EYXRhID0ge307XG4gICAgICB0aGlzLiQoJyNwcmVmZXJlbmNlcy1mb3JtJykuZmluZCggJ2lucHV0JyApLmVhY2goZnVuY3Rpb24oaSwgZWwpIHtcbiAgICAgICAgaWYgKCQoZWwpLmRhdGEoJ2NyZWF0ZScpID09PSAncHJpdmFjeScpIHtcbiAgICAgICAgICB2YXIgdmFsID0gJChlbCkucHJvcCgnY2hlY2tlZCcpO1xuICAgICAgICAgIGZvcm1EYXRhWydwcml2YWN5J10gPSB2YWw7XG4gICAgICAgIH0gZWxzZSBpZiAoJChlbCkudmFsKCkgIT09ICcnICYmICQoZWwpLnZhbCgpICE9PSAnb24nKSB7XG4gICAgICAgICAgZm9ybURhdGFbJChlbCkuZGF0YSgnY3JlYXRlJyldID0gJChlbCkudmFsKCk7XG4gICAgICAgICAgJChlbCkudmFsKCcnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBkZWxldGUgZm9ybURhdGEudW5kZWZpbmVkO1xuICAgICAgcmV0dXJuIGZvcm1EYXRhO1xuICAgIH0sXG5cbiAgICByZW5kZXJTdGF0dXM6IGZ1bmN0aW9uKCBzdGF0dXMgKSB7XG4gICAgICAkKCcjc3RhdHVzJykudGV4dChzdGF0dXMpO1xuICAgIH0sXG5cbiAgICBjbGVhckZpZWxkOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuJCgnI3VwbG9hZGVkLXByZWZlcmVuY2VzLWltYWdlJylbMF0uc3JjID0gJyc7XG4gICAgICB0aGlzLiQoJyNwcmVmZXJlbmNlcy1pbWFnZS11cGxvYWQnKS52YWwoJycpO1xuICAgIH0sXG5cbiAgICBpbnZpdGVVc2VyOiBmdW5jdGlvbihlKSB7XG4gICAgICAvLyBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB2YXIgcmVjaXBpZW50ID0gJC50cmltKCQoJyNpbnZpdGUtdXNlci1pbnB1dCcpLnZhbCgpKTtcbiAgICAgICAgZGVidWdnZXI7XG4gICAgICBpZiAocmVjaXBpZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgc2VuZGVyID0gdGhpcy5tb2RlbC5nZXQoJ2N1cnJlbnRVc2VyJyksXG4gICAgICAgICAgICByb29tSWQgPSB0aGlzLm1vZGVsLmdldCgnaWQnKSxcbiAgICAgICAgICAgIHJvb21OYW1lID0gdGhpcy5tb2RlbC5nZXQoJ25hbWUnKSxcbiAgICAgICAgICAgIGludml0YXRpb25PYmogPSB7c2VuZGVyOiBzZW5kZXIsIHJvb21JZDogcm9vbUlkLCByb29tTmFtZTogcm9vbU5hbWUsIHJlY2lwaWVudDogcmVjaXBpZW50fTtcbiAgICAgICAgdGhpcy52ZW50LnRyaWdnZXIoJ2ludml0ZVVzZXInLCBpbnZpdGF0aW9uT2JqKTtcbiAgICAgICAgJCgnI2ludml0ZS11c2VyLWlucHV0JykudmFsKCcnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdzZWFyY2ggdHlwaW5nJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgdXNlclNlYXJjaFR5cGVhaGVhZDogZnVuY3Rpb24oKSB7XG4gICAgICAkKCcjaW52aXRlLXVzZXItaW5wdXQnKS50eXBlYWhlYWQoe1xuICAgICAgICBsaW1pdDogNSxcbiAgICAgICAgbWluTGVuZ3RoOiA1LFxuICAgICAgICBvblNlbGVjdDogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGl0ZW0pO1xuICAgICAgICB9LFxuICAgICAgICBhamF4OiB7XG4gICAgICAgICAgdXJsOiAnL3NlYXJjaFVzZXJzJyxcbiAgICAgICAgICB0cmlnZ2VyTGVuZ3RoOiA1LFxuICAgICAgICAgIHByZURpc3BhdGNoOiBmdW5jdGlvbiAocXVlcnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHVzZXJuYW1lOiBxdWVyeVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHByZVByb2Nlc3M6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgIGlmIChkYXRhLnN1Y2Nlc3MgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAvLyBIaWRlIHRoZSBsaXN0LCB0aGVyZSB3YXMgc29tZSBlcnJvclxuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9LFxuXG4gIH0pO1xuXG59KShqUXVlcnkpOyIsInZhciBhcHAgPSBhcHAgfHwge307XG5cbihmdW5jdGlvbiAoJCkge1xuXG4gIGFwcC5OYXZiYXJWaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuICAgIGVsOiAnLmxvZ2luLW1lbnUnLFxuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKCQoJyNuYXZiYXItdGVtcGxhdGUnKS5odG1sKCkpLFxuICAgIGludml0YXRpb25UZW1wbGF0ZTogXy50ZW1wbGF0ZSgkKCcjaW52aXRhdGlvbi10ZW1wbGF0ZScpLmh0bWwoKSksXG4gICAgZXZlbnRzOiB7XG4gICAgICAnY2xpY2sgLmRlbGV0ZS1pbnZpdGF0aW9uJzogJ2RlbGV0ZUludml0YXRpb24nLFxuICAgICAgJ2NsaWNrIC5hY2NlcHQtaW52aXRhdGlvbic6ICdhY2NlcHRJbnZpdGF0aW9uJyxcbiAgICB9LFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIHRoaXMudmVudCA9IG9wdGlvbnMudmVudDtcbiAgICAgIHRoaXMubW9kZWwgPSBuZXcgYXBwLlVzZXJNb2RlbCh7IHVzZXJuYW1lOiAnJywgaW52aXRhdGlvbnM6IG5ldyBhcHAuSW52aXRhdGlvbkNvbGxlY3Rpb24oKSB9KTtcbiAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2VcIiwgdGhpcy5yZW5kZXIsIHRoaXMpO1xuXG4gICAgICB2YXIgaW52aXRhdGlvbnMgPSB0aGlzLm1vZGVsLmdldCgnaW52aXRhdGlvbnMnKTtcblxuICAgICAgdGhpcy5saXN0ZW5UbyhpbnZpdGF0aW9ucywgXCJyZXNldFwiLCB0aGlzLnJlbmRlckludml0YXRpb25zLCB0aGlzKTtcbiAgICB9LFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUodGhpcy5tb2RlbC50b0pTT04oKSkpO1xuICAgICAgdGhpcy5yZW5kZXJJbnZpdGF0aW9ucygpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICByZW5kZXJJbnZpdGF0aW9uczogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLiQoJyNpbnZpdGF0aW9ucycpLmVtcHR5KCk7XG4gICAgICB2YXIgaW52aXRhdGlvbnMgPSB0aGlzLm1vZGVsLmdldCgnaW52aXRhdGlvbnMnKTtcbiAgICAgIHZhciB0aGlzXyA9IHRoaXM7XG4gICAgICBpbnZpdGF0aW9ucy5lYWNoKGZ1bmN0aW9uKGludml0ZSkge1xuICAgICAgICB0aGlzXy5yZW5kZXJJbnZpdGF0aW9uKGludml0ZSk7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9LFxuICAgIHJlbmRlckludml0YXRpb246IGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgICB0aGlzLiQoJyNpbnZpdGF0aW9ucycpLmFwcGVuZCh0aGlzLmludml0YXRpb25UZW1wbGF0ZShtb2RlbC50b0pTT04oKSkpO1xuICAgIH0sXG4gICAgZGVsZXRlSW52aXRhdGlvbjogZnVuY3Rpb24oZSkge1xuICAgICAgdmFyIHJvb21JZCA9ICQoZS50YXJnZXQpLmRhdGEoJ3Jvb21pZCcpO1xuICAgICAgdGhpcy52ZW50LnRyaWdnZXIoJ2RlbGV0ZUludml0YXRpb24nLCByb29tSWQpO1xuICAgIH0sXG4gICAgYWNjZXB0SW52aXRhdGlvbjogZnVuY3Rpb24oZSkge1xuICAgICAgdmFyIHJvb21JZCA9ICQoZS50YXJnZXQpLmRhdGEoJ3Jvb21pZCcpO1xuICAgICAgdGhpcy52ZW50LnRyaWdnZXIoJ2FjY2VwdEludml0YXRpb24nLCByb29tSWQpO1xuICAgIH0sXG5cbiAgfSk7XG5cbn0pKGpRdWVyeSk7IiwidmFyIGFwcCA9IGFwcCB8fCB7fTtcblxuKGZ1bmN0aW9uICgkKSB7XG5cbiAgYXBwLlJlZ2lzdGVyVmlldyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZSgkKCcjcmVnaXN0ZXInKS5odG1sKCkpLFxuICAgIHVzZXJuYW1lQXZhaWxhYmxlVGVtcGxhdGU6IF8udGVtcGxhdGUoJzxkaXYgY2xhc3M9XCJ1c2VybmFtZS1hdmFpbGFibGUgZmEgZmEtY2hlY2tcIj51c2VybmFtZSBhdmFpbGFibGU8L2Rpdj4nKSxcbiAgICB1c2VybmFtZVRha2VuVGVtcGxhdGU6IF8udGVtcGxhdGUoJzxkaXYgY2xhc3M9XCJ1c2VybmFtZS10YWtlbiBmYSBmYS10aW1lc1wiPnVzZXJuYW1lIHRha2VuPC9kaXY+JyksXG4gICAgZXZlbnRzOiB7XG4gICAgICBcImNsaWNrICNzaWduVXBCdG5cIjogXCJzaWduVXBcIixcbiAgICAgIFwia2V5dXAgI3VzZXJuYW1lXCI6IFwidmFsaWRhdGVVc2VybmFtZVwiLFxuICAgIH0sXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9LFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUoKSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNpZ25VcDogZnVuY3Rpb24oKSB7XG4gICAgfSxcbiAgICB2YWxpZGF0ZVVzZXJuYW1lOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgkKCcjdXNlcm5hbWUnKS52YWwoKS5sZW5ndGggPCA1KSB7IHJldHVybjsgfVxuICAgICAgdmFyIHRoaXNfID0gdGhpcztcbiAgICAgIF8uZGVib3VuY2UoJC5wb3N0KCcvcmVnaXN0ZXJWYWxpZGF0aW9uJywgeyB1c2VybmFtZTogJCgnI3VzZXJuYW1lJykudmFsKCkgfSxmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICBkYXRhLnVzZXJuYW1lQXZhaWxhYmxlID9cbiAgICAgICAgICAgdGhpc18ucmVuZGVyVmFsaWRhdGlvbih0aGlzXy51c2VybmFtZUF2YWlsYWJsZVRlbXBsYXRlKCkpXG4gICAgICAgICA6XG4gICAgICAgICAgIHRoaXNfLnJlbmRlclZhbGlkYXRpb24odGhpc18udXNlcm5hbWVUYWtlblRlbXBsYXRlKCkpO1xuICAgICAgfSksIDE1MCk7XG4gICAgfSxcbiAgICByZW5kZXJWYWxpZGF0aW9uOiBmdW5jdGlvbih3aGF0KSB7XG4gICAgICAkKCcucmVnaXN0ZXItZXJyb3ItY29udGFpbmVyJykuZW1wdHkoKTtcbiAgICAgICQod2hhdCkuYXBwZW5kVG8oJCgnLnJlZ2lzdGVyLWVycm9yLWNvbnRhaW5lcicpKS5oaWRlKCkuZmFkZUluKCk7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAkKCcucmVnaXN0ZXItZXJyb3ItY29udGFpbmVyJykuY2hpbGRyZW4oKS5maXJzdCgpLmZhZGVPdXQoKTtcbiAgICAgIH0sIDIwMDApO1xuXG4gICAgfVxuICB9KTtcblxufSkoalF1ZXJ5KTsiLCJcbi8vIFRoZSBDaGF0Q2xpZW50IGlzIGltcGxlbWVudGVkIG9uIG1haW4uanMuXG4vLyBUaGUgY2hhdGNsaWVudCBpcyBhIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIG9uIHRoZSBNYWluQ29udHJvbGxlci5cbi8vIEl0IGJvdGggbGlzdGVucyB0byBhbmQgZW1pdHMgZXZlbnRzIG9uIHRoZSBzb2NrZXQsIGVnOlxuLy8gSXQgaGFzIGl0cyBvd24gbWV0aG9kcyB0aGF0LCB3aGVuIGNhbGxlZCwgZW1pdCB0byB0aGUgc29ja2V0IHcvIGRhdGEuXG4vLyBJdCBhbHNvIHNldHMgcmVzcG9uc2UgbGlzdGVuZXJzIG9uIGNvbm5lY3Rpb24sIHRoZXNlIHJlc3BvbnNlIGxpc3RlbmVyc1xuLy8gbGlzdGVuIHRvIHRoZSBzb2NrZXQgYW5kIHRyaWdnZXIgZXZlbnRzIG9uIHRoZSBhcHBFdmVudEJ1cyBvbiB0aGUgXG4vLyBNYWluQ29udHJvbGxlclxudmFyIENoYXRDbGllbnQgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdC8vIGlzLXR5cGluZyBoZWxwZXIgdmFyaWFibGVzXG5cdHZhciBUWVBJTkdfVElNRVJfTEVOR1RIID0gNDAwOyAvLyBtc1xuICB2YXIgdHlwaW5nID0gZmFsc2U7XG4gIHZhciBsYXN0VHlwaW5nVGltZTtcbiAgXG4gIC8vIHRoaXMgdmVudCBob2xkcyB0aGUgYXBwRXZlbnRCdXNcblx0c2VsZi52ZW50ID0gb3B0aW9ucy52ZW50O1xuXG5cdHNlbGYuaG9zdG5hbWUgPSAnaHR0cDovLycgKyB3aW5kb3cubG9jYXRpb24uaG9zdDtcblxuICAvLyBjb25uZWN0cyB0byBzb2NrZXQsIHNldHMgcmVzcG9uc2UgbGlzdGVuZXJzXG5cdHNlbGYuY29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKCdzYy5mLmNvbm5lY3QnKTtcblx0XHQvLyB0aGlzIGlvIG1pZ2h0IGJlIGEgbGl0dGxlIGNvbmZ1c2luZy4uLiB3aGVyZSBpcyBpdCBjb21pbmcgZnJvbT9cblx0XHQvLyBpdCdzIGNvbWluZyBmcm9tIHRoZSBzdGF0aWMgbWlkZGxld2FyZSBvbiBzZXJ2ZXIuanMgYmMgZXZlcnl0aGluZ1xuXHRcdC8vIGluIHRoZSAvcHVibGljIGZvbGRlciBoYXMgYmVlbiBhdHRhY2hlZCB0byB0aGUgc2VydmVyLCBhbmQgdmlzYVxuXHRcdC8vIHZlcnNhLlxuXHRcdHNlbGYuc29ja2V0ID0gaW8uY29ubmVjdChzZWxmLmhvc3RuYW1lKTtcbiAgICBzZWxmLnNldFJlc3BvbnNlTGlzdGVuZXJzKHNlbGYuc29ja2V0KTtcbiAgfTtcblxuXG5cblxuLy8vLy8gVmlld0V2ZW50QnVzIG1ldGhvZHMgLy8vL1xuICAgIC8vIG1ldGhvZHMgdGhhdCBlbWl0IHRvIHRoZSBjaGF0c2VydmVyXG5cbi8vIExPR0lOXG4gIHNlbGYubG9naW4gPSBmdW5jdGlvbih1c2VyKSB7XG4gICAgY29uc29sZS5sb2coJ3NjLmYubG9naW46ICcsIHVzZXIpO1xuICAgIHNlbGYuc29ja2V0LmVtaXQoXCJsb2dpblwiLCB1c2VyKTtcbiAgfTtcblxuXG4vLyBST09NXG4gIHNlbGYuY29ubmVjdFRvUm9vbSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBjb25zb2xlLmxvZygnc2MuZi5jb25uZWN0VG9Sb29tOiAnLCBuYW1lKTtcbiAgICBzZWxmLnNvY2tldC5lbWl0KFwiY29ubmVjdFRvUm9vbVwiLCBuYW1lKTtcbiAgfTtcbiAgc2VsZi5qb2luUm9vbSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBzZWxmLnNvY2tldC5lbWl0KCdqb2luUm9vbScsIG5hbWUpO1xuICB9O1xuICBzZWxmLmFkZFJvb20gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgY29uc29sZS5sb2coJ3NjLmYuYWRkUm9vbTogJywgbmFtZSk7XG4gICAgc2VsZi5zb2NrZXQuZW1pdChcImFkZFJvb21cIiwgbmFtZSk7XG4gIH07XG4gIHNlbGYucmVtb3ZlUm9vbSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBjb25zb2xlLmxvZygnc2MuZi5yZW1vdmVSb29tOiAnLCBuYW1lKTtcbiAgICBzZWxmLnNvY2tldC5lbWl0KFwicmVtb3ZlUm9vbVwiLCBuYW1lKTtcbiAgfTtcbiAgc2VsZi5jcmVhdGVSb29tID0gZnVuY3Rpb24oZm9ybURhdGEpIHtcbiAgICBjb25zb2xlLmxvZygnc2MuZi5jcmVhdGVSb29tOiAnLCBmb3JtRGF0YSk7XG4gICAgc2VsZi5zb2NrZXQuZW1pdChcImNyZWF0ZVJvb21cIiwgZm9ybURhdGEpO1xuICB9O1xuICBzZWxmLnVwZGF0ZVJvb20gPSBmdW5jdGlvbihmb3JtRGF0YSkge1xuICAgIGNvbnNvbGUubG9nKCdzYy5mLnVwZGF0ZVJvb206ICcsIGZvcm1EYXRhKTtcbiAgICBzZWxmLnNvY2tldC5lbWl0KFwidXBkYXRlUm9vbVwiLCBmb3JtRGF0YSk7XG4gIH07XG4gIHNlbGYuZGVzdHJveVJvb20gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgY29uc29sZS5sb2coJ3NjLmYuZGVzdHJveVJvb206ICcsIG5hbWUpO1xuICAgIHNlbGYuc29ja2V0LmVtaXQoXCJkZXN0cm95Um9vbVwiLCBuYW1lKTtcbiAgfTtcblxuXG5cbi8vIENIQVRcbiAgc2VsZi5jaGF0ID0gZnVuY3Rpb24oY2hhdCkge1xuICAgIGNvbnNvbGUubG9nKCdzYy5mLmNoYXQ6ICcsIGNoYXQpO1xuXHRcdHNlbGYuc29ja2V0LmVtaXQoXCJjaGF0XCIsIGNoYXQpO1xuXHR9O1xuICBzZWxmLmdldE1vcmVDaGF0cyA9IGZ1bmN0aW9uKGNoYXRSZXEpIHtcbiAgICBzZWxmLnNvY2tldC5lbWl0KCdnZXRNb3JlQ2hhdHMnLCBjaGF0UmVxKTtcbiAgfTtcblxuXG4vLyBESVJFQ1QgTUVTU0FHRVxuICBzZWxmLmluaXREaXJlY3RNZXNzYWdlID0gZnVuY3Rpb24ocmVjaXBpZW50KSB7XG4gICAgc2VsZi5zb2NrZXQuZW1pdCgnaW5pdERpcmVjdE1lc3NhZ2UnLCByZWNpcGllbnQpO1xuICB9O1xuICBzZWxmLmRpcmVjdE1lc3NhZ2UgPSBmdW5jdGlvbihkaXJlY3RNZXNzYWdlKSB7XG4gICAgc2VsZi5zb2NrZXQuZW1pdCgnZGlyZWN0TWVzc2FnZScsIGRpcmVjdE1lc3NhZ2UpO1xuICB9O1xuICBzZWxmLmdldE1vcmVEaXJlY3RNZXNzYWdlcyA9IGZ1bmN0aW9uKGRpcmVjdE1lc3NhZ2VSZXEpIHtcbiAgICBzZWxmLnNvY2tldC5lbWl0KCdnZXRNb3JlRGlyZWN0TWVzc2FnZXMnLCBkaXJlY3RNZXNzYWdlUmVxKTtcbiAgfTtcbiAgXG5cbi8vIFRZUElOR1xuXHRzZWxmLmFkZENoYXRUeXBpbmcgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgdmFyIG1lc3NhZ2UgPSBkYXRhLnVzZXJuYW1lICsgJyBpcyB0eXBpbmcnO1xuICAgICQoJy50eXBldHlwZXR5cGUnKS50ZXh0KG1lc3NhZ2UpO1xuXHR9O1xuXHRzZWxmLnJlbW92ZUNoYXRUeXBpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAkKCcudHlwZXR5cGV0eXBlJykuZW1wdHkoKTtcblx0fTtcbiAgc2VsZi51cGRhdGVUeXBpbmcgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoc2VsZi5zb2NrZXQpIHtcbiAgICAgIGlmICghdHlwaW5nKSB7XG4gICAgICAgIHR5cGluZyA9IHRydWU7XG4gICAgICAgIHNlbGYuc29ja2V0LmVtaXQoJ3R5cGluZycpO1xuICAgICAgfVxuICAgICAgbGFzdFR5cGluZ1RpbWUgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHR5cGluZ1RpbWVyID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcbiAgICAgICAgdmFyIHRpbWVEaWZmID0gdHlwaW5nVGltZXIgLSBsYXN0VHlwaW5nVGltZTtcbiAgICAgICAgaWYgKHRpbWVEaWZmID49IFRZUElOR19USU1FUl9MRU5HVEggJiYgdHlwaW5nKSB7XG4gICAgICAgICAgIHNlbGYuc29ja2V0LmVtaXQoJ3N0b3AgdHlwaW5nJyk7XG4gICAgICAgICAgIHR5cGluZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9LCBUWVBJTkdfVElNRVJfTEVOR1RIKTtcbiAgICB9XG4gIH07XG5cblxuLy8gSU5WSVRBVElPTlNcbiAgc2VsZi5pbnZpdGVVc2VyID0gZnVuY3Rpb24oaW52aXRhdGlvbk9iaikge1xuICAgIHNlbGYuc29ja2V0LmVtaXQoXCJpbnZpdGVVc2VyXCIsIGludml0YXRpb25PYmopO1xuICB9O1xuICBzZWxmLmRlbGV0ZUludml0YXRpb24gPSBmdW5jdGlvbihyb29tSWQpIHtcbiAgICBzZWxmLnNvY2tldC5lbWl0KFwiZGVsZXRlSW52aXRhdGlvblwiLCByb29tSWQpO1xuICB9O1xuICBzZWxmLmFjY2VwdEludml0YXRpb24gPSBmdW5jdGlvbihyb29tSWQpIHtcbiAgICBzZWxmLnNvY2tldC5lbWl0KFwiYWNjZXB0SW52aXRhdGlvblwiLCByb29tSWQpO1xuICB9O1xuXG5cbi8vIEVSUk9SIEhBTkRMSU5HXG4gIHNlbGYuZG9lc0NoYXRyb29tRXhpc3QgPSBmdW5jdGlvbihjaGF0cm9vbVF1ZXJ5KSB7XG4gICAgc2VsZi5zb2NrZXQuZW1pdCgnZG9lc0NoYXRyb29tRXhpc3QnLCBjaGF0cm9vbVF1ZXJ5KTtcbiAgfTtcblxuXG4gIFxuXG5cblxuXG4gIC8vLy8vLy8vLy8vLy8vIGNoYXRzZXJ2ZXIgbGlzdGVuZXJzLy8vLy8vLy8vLy8vL1xuXG4gIC8vIHRoZXNlIGd1eXMgbGlzdGVuIHRvIHRoZSBjaGF0c2VydmVyL3NvY2tldCBhbmQgZW1pdCBkYXRhIHRvIG1haW4uanMsXG4gIC8vIHNwZWNpZmljYWxseSB0byB0aGUgYXBwRXZlbnRCdXMuXG5cdHNlbGYuc2V0UmVzcG9uc2VMaXN0ZW5lcnMgPSBmdW5jdGlvbihzb2NrZXQpIHtcblxuXG4vLyBMT0dJTlxuICAgIHNvY2tldC5vbignbG9naW4nLCBmdW5jdGlvbih1c2VyKSB7XG4gICAgICBjb25zb2xlLmxvZygnc2MuZS5sb2dpbicpO1xuICAgICAgc2VsZi52ZW50LnRyaWdnZXIoJ2xvZ2luVXNlcicsIHVzZXIpO1xuICAgICAgc2VsZi5jb25uZWN0VG9Sb29tKFwiUGFybG9yXCIpO1xuICAgIH0pO1xuXG5cbi8vIENIQVRcblx0XHRzb2NrZXQub24oJ3VzZXJKb2luZWQnLCBmdW5jdGlvbih1c2VyKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnc2MuZS51c2VySm9pbmVkOiAnLCB1c2VyKTtcbiAgICAgIC8vIHNvY2tldC5lbWl0KFwib25saW5lVXNlcnNcIik7XG5cdFx0XHRzZWxmLnZlbnQudHJpZ2dlcihcInVzZXJKb2luZWRcIiwgdXNlcik7XG5cdFx0fSk7XG5cdFx0c29ja2V0Lm9uKCd1c2VyTGVmdCcsIGZ1bmN0aW9uKHVzZXIpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdzYy5lLnVzZXJMZWZ0OiAnLCB1c2VyKTtcbiAgICAgIC8vIHNvY2tldC5lbWl0KFwib25saW5lVXNlcnNcIik7XG5cdFx0XHRzZWxmLnZlbnQudHJpZ2dlcihcInVzZXJMZWZ0XCIsIHVzZXIpO1xuXHRcdH0pO1xuXHRcdHNvY2tldC5vbignY2hhdCcsIGZ1bmN0aW9uKGNoYXQpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdzYy5lLmNoYXQ6ICcsIGNoYXQpO1xuXHRcdFx0c2VsZi52ZW50LnRyaWdnZXIoXCJjaGF0UmVjZWl2ZWRcIiwgY2hhdCk7XG5cdFx0fSk7XG4gICAgc29ja2V0Lm9uKCdtb3JlQ2hhdHMnLCBmdW5jdGlvbihjaGF0cykge1xuICAgICAgc2VsZi52ZW50LnRyaWdnZXIoXCJtb3JlQ2hhdHNcIiwgY2hhdHMpO1xuICAgIH0pO1xuICAgIHNvY2tldC5vbignbm9Nb3JlQ2hhdHMnLCBmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYudmVudC50cmlnZ2VyKFwibm9Nb3JlQ2hhdHNcIik7XG4gICAgfSk7XG5cblxuLy8gRElSRUNUIE1FU1NBR0VcbiAgICBzb2NrZXQub24oJ3NldERpcmVjdE1lc3NhZ2VDaGF0bG9nJywgZnVuY3Rpb24oY2hhdGxvZykge1xuICAgICAgc2VsZi52ZW50LnRyaWdnZXIoXCJzZXRETWNoYXRsb2dcIiwgY2hhdGxvZyk7XG4gICAgfSk7XG4gICAgc29ja2V0Lm9uKCdzZXREaXJlY3RNZXNzYWdlSGVhZGVyJywgZnVuY3Rpb24oaGVhZGVyKSB7XG4gICAgICBzZWxmLnZlbnQudHJpZ2dlcihcInNldERNaGVhZGVyXCIsIGhlYWRlcik7XG4gICAgfSk7XG4gICAgc29ja2V0Lm9uKCdkaXJlY3RNZXNzYWdlJywgZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgLy8gc2VsZi52ZW50LnRyaWdnZXIoXCJyZW5kZXJEaXJlY3RNZXNzYWdlXCIsIERNKTtcbiAgICAgIHNlbGYudmVudC50cmlnZ2VyKFwiZGlyZWN0TWVzc2FnZVJlY2VpdmVkXCIsIG1lc3NhZ2UpO1xuICAgIH0pO1xuXG5cblxuLy8gVFlQSU5HXG4gICAgc29ja2V0Lm9uKCd0eXBpbmcnLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICBzZWxmLmFkZENoYXRUeXBpbmcoZGF0YSk7XG4gICAgfSk7XG4gICAgc29ja2V0Lm9uKCdzdG9wIHR5cGluZycsIGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5yZW1vdmVDaGF0VHlwaW5nKCk7XG4gICAgfSk7XG5cblxuLy8gU0VUIFJPT01cbiAgICBzb2NrZXQub24oJ2NoYXRsb2cnLCBmdW5jdGlvbihjaGF0bG9nKSB7XG4gICAgICBjb25zb2xlLmxvZygnc2MuZS5jaGF0bG9nOiAnLCBjaGF0bG9nKTtcbiAgICAgIHNlbGYudmVudC50cmlnZ2VyKFwic2V0Q2hhdGxvZ1wiLCBjaGF0bG9nKTtcbiAgICB9KTtcbiAgICBzb2NrZXQub24oJ2NoYXRyb29tcycsIGZ1bmN0aW9uKGNoYXRyb29tcykge1xuICAgICAgY29uc29sZS5sb2coJ3NjLmUuY2hhdHJvb21zOiAgJywgY2hhdHJvb21zKTtcbiAgICAgIHNlbGYudmVudC50cmlnZ2VyKFwic2V0Q2hhdHJvb21zXCIsIGNoYXRyb29tcyk7XG4gICAgfSk7XG4gICAgc29ja2V0Lm9uKCdwcml2YXRlUm9vbXMnLCBmdW5jdGlvbihyb29tcykge1xuICAgICAgY29uc29sZS5sb2coJ3NjLmUucHJpdmF0ZVJvb21zOiAgJywgcm9vbXMpO1xuICAgICAgc2VsZi52ZW50LnRyaWdnZXIoXCJzZXRQcml2YXRlUm9vbXNcIiwgcm9vbXMpO1xuICAgIH0pO1xuICAgIHNvY2tldC5vbignb25saW5lVXNlcnMnLCBmdW5jdGlvbihvbmxpbmVVc2Vycykge1xuICAgICAgY29uc29sZS5sb2coJ3NjLmUub25saW5lVXNlcnM6ICcsIG9ubGluZVVzZXJzKTtcbiAgICAgIHNlbGYudmVudC50cmlnZ2VyKFwic2V0T25saW5lVXNlcnNcIiwgb25saW5lVXNlcnMpO1xuICAgIH0pO1xuICAgIHNvY2tldC5vbignb2ZmbGluZVVzZXJzJywgZnVuY3Rpb24ob2ZmbGluZVVzZXJzKSB7XG4gICAgICBjb25zb2xlLmxvZygnc2MuZS5vZmZsaW5lVXNlcnM6ICcsIG9mZmxpbmVVc2Vycyk7XG4gICAgICBzZWxmLnZlbnQudHJpZ2dlcihcInNldE9mZmxpbmVVc2Vyc1wiLCBvZmZsaW5lVXNlcnMpO1xuICAgIH0pO1xuICAgIHNvY2tldC5vbignY2hhdHJvb21IZWFkZXInLCBmdW5jdGlvbihoZWFkZXJPYmopIHtcbiAgICAgIGNvbnNvbGUubG9nKCdzYy5lLmNoYXRyb29tSGVhZGVyOiAnLCBoZWFkZXJPYmopO1xuICAgICAgc2VsZi52ZW50LnRyaWdnZXIoXCJzZXRDaGF0cm9vbUhlYWRlclwiLCBoZWFkZXJPYmopO1xuICAgIH0pO1xuXG5cbi8vIE1PRElGWSBST09NXG4gICAgc29ja2V0Lm9uKCdyb29tRGVzdHJveWVkJywgZnVuY3Rpb24obmFtZSkge1xuICAgICAgY29uc29sZS5sb2coJ3NjLmUucm9vbURlc3Ryb3llZDogJywgbmFtZSk7XG4gICAgICBzZWxmLnZlbnQudHJpZ2dlcihcInJvb21EZXN0cm95ZWRcIiwgbmFtZSk7XG4gICAgfSk7XG5cbi8vIENSRUFURSBST09NXG4gICAgc29ja2V0Lm9uKCdjaGF0cm9vbUF2YWlsYWJpbGl0eScsIGZ1bmN0aW9uKGF2YWlsYWJpbHR5KSB7XG4gICAgICBzZWxmLnZlbnQudHJpZ2dlcignY2hhdHJvb21BdmFpbGFiaWxpdHknLCBhdmFpbGFiaWx0eSk7XG4gICAgfSk7XG5cbi8vIEVSUk9SIEhBTkRMSU5HXG4gICAgc29ja2V0Lm9uKCdjaGF0cm9vbUFscmVhZHlFeGlzdHMnLCBmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYudmVudC50cmlnZ2VyKFwiY2hhdHJvb21BbHJlYWR5RXhpc3RzXCIpO1xuICAgIH0pO1xuXG4vLyBJTlZJVEFUSU9OU1xuICAgIHNvY2tldC5vbigncmVmcmVzaEludml0YXRpb25zJywgZnVuY3Rpb24oaW52aXRhdGlvbnMpIHtcbiAgICAgIHNlbGYudmVudC50cmlnZ2VyKFwicmVmcmVzaEludml0YXRpb25zXCIsIGludml0YXRpb25zKTtcbiAgICB9KTtcblxuXG5cdH07XG59OyIsIlxuXG5hcHAuTWFpbkNvbnRyb2xsZXIgPSBmdW5jdGlvbigpIHtcblxuXHR2YXIgc2VsZiA9IHRoaXM7XG5cblxuICAvL1RoZXNlIGFsbG93cyB1cyB0byBiaW5kIGFuZCB0cmlnZ2VyIG9uIHRoZSBvYmplY3QgZnJvbSBhbnl3aGVyZSBpbiB0aGUgYXBwLlxuXHRzZWxmLmFwcEV2ZW50QnVzID0gXy5leHRlbmQoe30sIEJhY2tib25lLkV2ZW50cyk7XG5cdHNlbGYudmlld0V2ZW50QnVzID0gXy5leHRlbmQoe30sIEJhY2tib25lLkV2ZW50cyk7XG5cblx0c2VsZi5pbml0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBsb2dpbk1vZGVsXG4gICAgc2VsZi5sb2dpbk1vZGVsID0gbmV3IGFwcC5Mb2dpbk1vZGVsKCk7XG4gICAgc2VsZi5sb2dpblZpZXcgPSBuZXcgYXBwLkxvZ2luVmlldyh7dmVudDogc2VsZi52aWV3RXZlbnRCdXMsIG1vZGVsOiBzZWxmLmxvZ2luTW9kZWx9KTtcbiAgICBzZWxmLnJlZ2lzdGVyVmlldyA9IG5ldyBhcHAuUmVnaXN0ZXJWaWV3KHt2ZW50OiBzZWxmLnZpZXdFdmVudEJ1cyB9KTtcbiAgICBzZWxmLm5hdmJhclZpZXcgPSBuZXcgYXBwLk5hdmJhclZpZXcoe3ZlbnQ6IHNlbGYudmlld0V2ZW50QnVzfSk7XG5cblxuICAgIC8vIFRoZSBDb250YWluZXJNb2RlbCBnZXRzIHBhc3NlZCBhIHZpZXdTdGF0ZSwgTG9naW5WaWV3LCB3aGljaFxuICAgIC8vIGlzIHRoZSBsb2dpbiBwYWdlLiBUaGF0IExvZ2luVmlldyBnZXRzIHBhc3NlZCB0aGUgdmlld0V2ZW50QnVzXG4gICAgLy8gYW5kIHRoZSBMb2dpbk1vZGVsLlxuICAgIHNlbGYuY29udGFpbmVyTW9kZWwgPSBuZXcgYXBwLkNvbnRhaW5lck1vZGVsKHsgdmlld1N0YXRlOiBzZWxmLmxvZ2luVmlld30pO1xuXG4gICAgLy8gbmV4dCwgYSBuZXcgQ29udGFpbmVyVmlldyBpcyBpbnRpYWxpemVkIHdpdGggdGhlIG5ld2x5IGNyZWF0ZWQgY29udGFpbmVyTW9kZWxcbiAgICAvLyB0aGUgbG9naW4gcGFnZSBpcyB0aGVuIHJlbmRlcmVkLlxuICAgIHNlbGYuY29udGFpbmVyVmlldyA9IG5ldyBhcHAuQ29udGFpbmVyVmlldyh7IG1vZGVsOiBzZWxmLmNvbnRhaW5lck1vZGVsIH0pO1xuICAgIHNlbGYuY29udGFpbmVyVmlldy5yZW5kZXIoKTtcblxuIFxuICAgICQoJ2Zvcm0nKS5rZXlwcmVzcyhmdW5jdGlvbihlKSB7XG4gICAgICByZXR1cm4gZS5rZXlDb2RlICE9IDEzO1xuICAgIH0pO1xuXG5cbiAgfTtcblxuXG4gIHNlbGYuYXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgY29uc29sZS5sb2coJ2YubWFpbi5hdXRoZW50aWNhdGVkJyk7XG4gICAgICAgXG4gICAgJChcImJvZHlcIikuY3NzKFwib3ZlcmZsb3dcIiwgXCJoaWRkZW5cIik7XG4gICAgJCgnZm9ybScpLmtleXByZXNzKGZ1bmN0aW9uKGUpIHtcbiAgICAgIHJldHVybiBlLmtleUNvZGUgIT0gMTM7XG4gICAgfSk7XG4gICAgc2VsZi5jaGF0Q2xpZW50ID0gbmV3IENoYXRDbGllbnQoeyB2ZW50OiBzZWxmLmFwcEV2ZW50QnVzIH0pO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdodWgnKTtcbiAgICBzZWxmLmNoYXRDbGllbnQuY29ubmVjdCgpO1xuXG4gICAgLy8gbmV3IG1vZGVsIGFuZCB2aWV3IGNyZWF0ZWQgZm9yIGNoYXRyb29tXG4gICAgc2VsZi5jaGF0cm9vbU1vZGVsID0gbmV3IGFwcC5DaGF0cm9vbU1vZGVsKHsgbmFtZTogJ1BhcmxvcicgfSk7XG4gICAgc2VsZi5jaGF0cm9vbUxpc3QgPSBuZXcgYXBwLkNoYXRyb29tTGlzdCgpO1xuICAgIHNlbGYucHJpdmF0ZVJvb21Db2xsZWN0aW9uID0gbmV3IGFwcC5Qcml2YXRlUm9vbUNvbGxlY3Rpb24oKTtcbiAgICBzZWxmLmNoYXRyb29tTGlzdC5mZXRjaCgpLmRvbmUoZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLmNoYXRyb29tTW9kZWwuc2V0KCdjaGF0cm9vbXMnLCBzZWxmLmNoYXRyb29tTGlzdCk7XG4gICAgICBzZWxmLmNoYXRyb29tTW9kZWwuc2V0KCdwcml2YXRlUm9vbXMnLCBzZWxmLnByaXZhdGVSb29tQ29sbGVjdGlvbik7XG4gICAgICBzZWxmLmNoYXRyb29tVmlldyAgPSBuZXcgYXBwLkNoYXRyb29tVmlldyh7dmVudDogc2VsZi52aWV3RXZlbnRCdXMsIG1vZGVsOiBzZWxmLmNoYXRyb29tTW9kZWwgfSk7XG4gICAgICBzZWxmLmNvbnRhaW5lck1vZGVsLnNldCgndmlld1N0YXRlJywgc2VsZi5jaGF0cm9vbVZpZXcpO1xuICAgICAgXG5cbiAgICAgIC8vIHNlbGYuY29ubmVjdFRvUm9vbSgpO1xuICAgICAgLy8gc2VsZi5pbml0Um9vbSgpO1xuICAgICAgICAgICAvLyA7XG4gICAgfSk7XG5cbiAgfTtcblxuICAvLyBzZWxmLmNvbm5lY3RUb1Jvb20gPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAvLyAgIGNvbnNvbGUubG9nKCdmLm1haW4uY29ubmVjdFRvUm9vbScpO1xuICAvLyAgIHNlbGYuY2hhdENsaWVudC5jb25uZWN0VG9Sb29tKFwiUGFybG9yXCIpO1xuICAvLyB9O1xuXG4gIC8vIHNlbGYuaW5pdFJvb20gPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAvLyAgIHNlbGYuY2hhdHJvb21WaWV3LmluaXRSb29tKCk7XG4gIC8vIH07XG5cblxuXG5cblxuICAvLy8vLy8vLy8vLy8gIEJ1c3NlcyAvLy8vLy8vLy8vLy9cbiAgICAvLyBUaGVzZSBCdXNzZXMgbGlzdGVuIHRvIHRoZSBzb2NrZXRjbGllbnRcbiAgIC8vICAgIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cbiAgLy8vLyB2aWV3RXZlbnRCdXMgTGlzdGVuZXJzIC8vLy8vXG4gIFxuXHRzZWxmLnZpZXdFdmVudEJ1cy5vbihcImxvZ2luXCIsIGZ1bmN0aW9uKHVzZXIpIHtcbiAgICBzZWxmLmNoYXRDbGllbnQubG9naW4odXNlcik7XG4gIH0pO1xuXHRzZWxmLnZpZXdFdmVudEJ1cy5vbihcImNoYXRcIiwgZnVuY3Rpb24oY2hhdCkge1xuICAgIHNlbGYuY2hhdENsaWVudC5jaGF0KGNoYXQpO1xuICB9KTtcbiAgc2VsZi52aWV3RXZlbnRCdXMub24oXCJ0eXBpbmdcIiwgZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5jaGF0Q2xpZW50LnVwZGF0ZVR5cGluZygpO1xuICB9KTtcbiAgc2VsZi52aWV3RXZlbnRCdXMub24oXCJqb2luUm9vbVwiLCBmdW5jdGlvbihyb29tKSB7XG4gICAgc2VsZi5jaGF0Q2xpZW50LmpvaW5Sb29tKHJvb20pO1xuICB9KTtcbiAgc2VsZi52aWV3RXZlbnRCdXMub24oXCJhZGRSb29tXCIsIGZ1bmN0aW9uKHJvb20pIHtcbiAgICBzZWxmLmNoYXRDbGllbnQuYWRkUm9vbShyb29tKTtcbiAgfSk7XG4gIHNlbGYudmlld0V2ZW50QnVzLm9uKFwicmVtb3ZlUm9vbVwiLCBmdW5jdGlvbihyb29tKSB7XG4gICAgc2VsZi5jaGF0Q2xpZW50LnJlbW92ZVJvb20ocm9vbSk7XG4gIH0pO1xuICBzZWxmLnZpZXdFdmVudEJ1cy5vbihcImNyZWF0ZVJvb21cIiwgZnVuY3Rpb24oZm9ybURhdGEpIHtcbiAgICBzZWxmLmNoYXRDbGllbnQuY3JlYXRlUm9vbShmb3JtRGF0YSk7XG4gIH0pO1xuICBzZWxmLnZpZXdFdmVudEJ1cy5vbihcInVwZGF0ZVJvb21cIiwgZnVuY3Rpb24oZm9ybURhdGEpIHtcbiAgICBzZWxmLmNoYXRDbGllbnQudXBkYXRlUm9vbShmb3JtRGF0YSk7XG4gIH0pO1xuICBzZWxmLnZpZXdFdmVudEJ1cy5vbihcImRlc3Ryb3lSb29tXCIsIGZ1bmN0aW9uKHJvb20pIHtcbiAgICBzZWxmLmNoYXRDbGllbnQuZGVzdHJveVJvb20ocm9vbSk7XG4gIH0pO1xuICBzZWxmLnZpZXdFdmVudEJ1cy5vbihcImdldE1vcmVDaGF0c1wiLCBmdW5jdGlvbihjaGF0UmVxKSB7XG4gICAgc2VsZi5jaGF0Q2xpZW50LmdldE1vcmVDaGF0cyhjaGF0UmVxKTtcbiAgfSk7XG4gIHNlbGYudmlld0V2ZW50QnVzLm9uKFwiZG9lc0NoYXRyb29tRXhpc3RcIiwgZnVuY3Rpb24oY2hhdHJvb21RdWVyeSkge1xuICAgIHNlbGYuY2hhdENsaWVudC5kb2VzQ2hhdHJvb21FeGlzdChjaGF0cm9vbVF1ZXJ5KTtcbiAgfSk7XG4gIHNlbGYudmlld0V2ZW50QnVzLm9uKFwiaW5pdERpcmVjdE1lc3NhZ2VcIiwgZnVuY3Rpb24ocmVjaXBpZW50KSB7XG4gICAgc2VsZi5jaGF0Q2xpZW50LmluaXREaXJlY3RNZXNzYWdlKHJlY2lwaWVudCk7XG4gIH0pO1xuICBzZWxmLnZpZXdFdmVudEJ1cy5vbihcImRpcmVjdE1lc3NhZ2VcIiwgZnVuY3Rpb24oZGlyZWN0TWVzc2FnZSkge1xuICAgIHNlbGYuY2hhdENsaWVudC5kaXJlY3RNZXNzYWdlKGRpcmVjdE1lc3NhZ2UpO1xuICB9KTtcbiAgc2VsZi52aWV3RXZlbnRCdXMub24oXCJnZXRNb3JlRGlyZWN0TWVzc2FnZXNcIiwgZnVuY3Rpb24oZGlyZWN0TWVzc2FnZVJlcSkge1xuICAgIHNlbGYuY2hhdENsaWVudC5nZXRNb3JlRGlyZWN0TWVzc2FnZXMoZGlyZWN0TWVzc2FnZVJlcSk7XG4gIH0pO1xuICBzZWxmLnZpZXdFdmVudEJ1cy5vbihcImludml0ZVVzZXJcIiwgZnVuY3Rpb24oaW52aXRhdGlvbk9iaikge1xuICAgIHNlbGYuY2hhdENsaWVudC5pbnZpdGVVc2VyKGludml0YXRpb25PYmopO1xuICB9KTtcbiAgc2VsZi52aWV3RXZlbnRCdXMub24oXCJkZWxldGVJbnZpdGF0aW9uXCIsIGZ1bmN0aW9uKHJvb21JZCkge1xuICAgIHNlbGYuY2hhdENsaWVudC5kZWxldGVJbnZpdGF0aW9uKHJvb21JZCk7XG4gIH0pO1xuICBzZWxmLnZpZXdFdmVudEJ1cy5vbihcImFjY2VwdEludml0YXRpb25cIiwgZnVuY3Rpb24ocm9vbUlkKSB7XG4gICAgc2VsZi5jaGF0Q2xpZW50LmFjY2VwdEludml0YXRpb24ocm9vbUlkKTtcbiAgfSk7XG5cblxuXG5cblxuXG4gIC8vLy8gYXBwRXZlbnRCdXMgTGlzdGVuZXJzIC8vLy9cblxuXHQvLyBzZWxmLmFwcEV2ZW50QnVzLm9uKFwidXNlcnNJbmZvXCIsIGZ1bmN0aW9uKGRhdGEpIHtcbiAvLyAgICBjb25zb2xlLmxvZygnbWFpbi5lLnVzZXJzSW5mbzogJywgZGF0YSk7XG4gLy8gICAgLy9kYXRhIGlzIGFuIGFycmF5IG9mIHVzZXJuYW1lcywgaW5jbHVkaW5nIHRoZSBuZXcgdXNlclxuXHQvLyBcdC8vIFRoaXMgbWV0aG9kIGdldHMgdGhlIG9ubGluZSB1c2VycyBjb2xsZWN0aW9uIGZyb20gY2hhdHJvb21Nb2RlbC5cblx0Ly8gXHQvLyBvbmxpbmVVc2VycyBpcyB0aGUgY29sbGVjdGlvblxuXHQvLyBcdHZhciBvbmxpbmVVc2VycyA9IHNlbGYuY2hhdHJvb21Nb2RlbC5nZXQoXCJvbmxpbmVVc2Vyc1wiKTtcbiAvLyAgICBjb25zb2xlLmxvZyhcIi4uLm9ubGluZVVzZXJzOiBcIiwgb25saW5lVXNlcnMpO1xuXHQvLyBcdHZhciB1c2VycyA9IF8ubWFwKGRhdGEsIGZ1bmN0aW9uKGl0ZW0pIHtcblx0Ly8gXHRcdHJldHVybiBuZXcgYXBwLlVzZXJNb2RlbCh7dXNlcm5hbWU6IGl0ZW19KTtcblx0Ly8gXHR9KTtcbiAvLyAgICBjb25zb2xlLmxvZyhcInVzZXJzOiBcIiwgdXNlcnMpO1xuXHQvLyBcdG9ubGluZVVzZXJzLnJlc2V0KHVzZXJzKTtcblx0Ly8gfSk7XG5cbiAvLyAgc2VsZi5hcHBFdmVudEJ1cy5vbihcInJvb21JbmZvXCIsIGZ1bmN0aW9uKGRhdGEpIHtcbiAvLyAgICBkZWJ1Z2dlcjtcbiAvLyAgICBjb25zb2xlLmxvZygnbWFpbi5lLnJvb21JbmZvOiAnLCBkYXRhKTtcbiAvLyAgICB2YXIgcm9vbXMgPSBzZWxmLmNoYXRyb29tTW9kZWwuZ2V0KFwiY2hhdHJvb21zXCIpO1xuIC8vICAgICBjb25zb2xlLmxvZyhcIi4uLnJvb21zOiBcIiwgcm9vbXMpO1xuIC8vICAgIHZhciB1cGRhdGVkUm9vbXMgPSBfLm1hcChkYXRhLCBmdW5jdGlvbihyb29tKSB7XG4gLy8gICAgICB2YXIgbmV3Q2hhdHJvb21Nb2RlbCA9IG5ldyBhcHAuQ2hhdHJvb21Nb2RlbCh7bmFtZTogcm9vbX0pO1xuIC8vICAgICAgcmV0dXJuIG5ld0NoYXRyb29tTW9kZWw7XG4gLy8gICAgfSk7XG4gLy8gICAgY29uc29sZS5sb2coXCIuLi51cGRhdGVkcm9vbXM6IFwiLCB1cGRhdGVkUm9vbXMpO1xuIC8vICAgIHJvb21zLnJlc2V0KHVwZGF0ZWRSb29tcyk7XG4gLy8gIH0pO1xuXG5cblxuICBzZWxmLmFwcEV2ZW50QnVzLm9uKFwibG9naW5Vc2VyXCIsIGZ1bmN0aW9uKHVzZXIpIHtcbiAgICBjb25zb2xlLmxvZygnbWFpbi5lLmxvZ2luVXNlcjogJywgdXNlcik7XG4gICAgaW52aXRhdGlvbnMgPSBzZWxmLm5hdmJhclZpZXcubW9kZWwuZ2V0KCdpbnZpdGF0aW9ucycpO1xuICAgIG5ld0ludml0YXRpb25zID0gXy5tYXAodXNlci5pbnZpdGF0aW9ucywgZnVuY3Rpb24oaW52aXRlKSB7XG4gICAgICAgdmFyIG5ld0ludml0YXRpb24gPSBuZXcgYXBwLkludml0YXRpb25Nb2RlbChpbnZpdGUpO1xuICAgICAgIHJldHVybiBuZXdJbnZpdGF0aW9uO1xuICAgIH0pO1xuICAgIGludml0YXRpb25zLnJlc2V0KG5ld0ludml0YXRpb25zKTtcbiAgICBzZWxmLm5hdmJhclZpZXcubW9kZWwuc2V0KCd1c2VybmFtZScsIHVzZXIudXNlcm5hbWUpO1xuICB9KTtcblxuICBzZWxmLmFwcEV2ZW50QnVzLm9uKFwicmVmcmVzaEludml0YXRpb25zXCIsIGZ1bmN0aW9uKGludml0YXRpb25zKSB7XG4gICAgY29uc29sZS5sb2coJ21haW4uZS5yZWZyZXNoSW52aXRhdGlvbnM6ICcsIGludml0YXRpb25zKTtcbiAgICBvbGRJbnZpdGF0aW9ucyA9IHNlbGYubmF2YmFyVmlldy5tb2RlbC5nZXQoJ2ludml0YXRpb25zJyk7XG4gICAgbmV3SW52aXRhdGlvbnMgPSBfLm1hcChpbnZpdGF0aW9ucywgZnVuY3Rpb24oaW52aXRlKSB7XG4gICAgICAgdmFyIG5ld0ludml0YXRpb24gPSBuZXcgYXBwLkludml0YXRpb25Nb2RlbChpbnZpdGUpO1xuICAgICAgIHJldHVybiBuZXdJbnZpdGF0aW9uO1xuICAgIH0pO1xuICAgIG9sZEludml0YXRpb25zLnJlc2V0KG5ld0ludml0YXRpb25zKTtcbiAgfSk7XG5cbiAgLy8gc2VsZi5hcHBFdmVudEJ1cy5vbihcInNldFJvb21cIiwgZnVuY3Rpb24obW9kZWwpIHtcbiAgLy8gICBjb25zb2xlLmxvZygnbWFpbi5lLnNldFJvb206ICcsIG1vZGVsKTtcblxuICAvLyAgIHZhciBjaGF0bG9nID0gbmV3IGFwcC5DaGF0Q29sbGVjdGlvbihtb2RlbC5jaGF0bG9nKTtcbiAgLy8gICBzZWxmLmNoYXRyb29tTW9kZWwuc2V0KCdjaGF0bG9nJywgY2hhdGxvZyk7XG5cbiAgLy8gICB2YXIgcm9vbXMgPSBuZXcgYXBwLkNoYXRyb29tTGlzdChtb2RlbC5jaGF0cm9vbXMpO1xuICAvLyAgIHNlbGYuY2hhdHJvb21Nb2RlbC5zZXQoJ2NoYXRyb29tcycsIHJvb21zKTtcblxuICAvLyAgIHZhciB1c2VycyA9IG5ldyBhcHAuVXNlckNvbGxlY3Rpb24obW9kZWwub25saW5lVXNlcnMpO1xuICAvLyAgIHNlbGYuY2hhdHJvb21Nb2RlbC5zZXQoJ29ubGluZVVzZXJzJywgdXNlcnMpO1xuXG4gIC8vIH0pO1xuXG5cblxuICBzZWxmLmFwcEV2ZW50QnVzLm9uKFwiQ2hhdHJvb21Nb2RlbFwiLCBmdW5jdGlvbihtb2RlbCkge1xuICAgIGNvbnNvbGUubG9nKCdtYWluLmUuQ2hhdHJvb21Nb2RlbDogJywgbW9kZWwpO1xuICAgIHNlbGYuY2hhdHJvb21Nb2RlbCA9IG5ldyBhcHAuQ2hhdHJvb21Nb2RlbCgpO1xuICAgIHNlbGYuY2hhdHJvb21MaXN0ID0gbmV3IGFwcC5DaGF0cm9vbUxpc3QoKTtcbiAgICBzZWxmLmNoYXRyb29tVmlldyAgPSBuZXcgYXBwLkNoYXRyb29tVmlldyh7dmVudDogc2VsZi52aWV3RXZlbnRCdXMsIG1vZGVsOiBzZWxmLmNoYXRyb29tTW9kZWwsIGNvbGxlY3Rpb246IHNlbGYuY2hhdHJvb21MaXN0fSk7XG4gICAgc2VsZi5jb250YWluZXJNb2RlbC5zZXQoJ3ZpZXdTdGF0ZScsIHNlbGYuY2hhdHJvb21WaWV3KTtcbiAgICBzZWxmLmNoYXRyb29tTW9kZWwubG9hZE1vZGVsKG1vZGVsKTtcbiAgfSk7XG5cblxuXG4gIC8vIGFkZHMgbmV3IHVzZXIgdG8gdXNlcnMgY29sbGVjdGlvbiwgc2VuZHMgZGVmYXVsdCBqb2luaW5nIG1lc3NhZ2Vcblx0c2VsZi5hcHBFdmVudEJ1cy5vbihcInVzZXJKb2luZWRcIiwgZnVuY3Rpb24odXNlcikge1xuICAgICAgICBjb25zb2xlLmxvZygnbWFpbi5lLnVzZXJKb2luZWQ6ICcsIHVzZXIpO1xuXHRcdHNlbGYuY2hhdHJvb21Nb2RlbC5hZGRVc2VyKHVzZXIpO1xuXHRcdHNlbGYuY2hhdHJvb21Nb2RlbC5hZGRDaGF0KHtzZW5kZXI6IFwiQnV0dGVyc1wiLCBtZXNzYWdlOiB1c2VyLnVzZXJuYW1lICsgXCIgam9pbmVkIHJvb20uXCIgfSk7XG5cdH0pO1xuXG5cdC8vIHJlbW92ZXMgdXNlciBmcm9tIHVzZXJzIGNvbGxlY3Rpb24sIHNlbmRzIGRlZmF1bHQgbGVhdmluZyBtZXNzYWdlXG5cdHNlbGYuYXBwRXZlbnRCdXMub24oXCJ1c2VyTGVmdFwiLCBmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdtYWluLmUudXNlckxlZnQ6ICcsIHVzZXIpO1xuXHRcdHNlbGYuY2hhdHJvb21Nb2RlbC5yZW1vdmVVc2VyKHVzZXIpO1xuXHRcdHNlbGYuY2hhdHJvb21Nb2RlbC5hZGRDaGF0KHtzZW5kZXI6IFwiQnV0dGVyc1wiLCBtZXNzYWdlOiB1c2VyLnVzZXJuYW1lICsgXCIgbGVmdCByb29tLlwiIH0pO1xuXHR9KTtcblxuXHQvLyBjaGF0IHBhc3NlZCBmcm9tIHNvY2tldGNsaWVudCwgYWRkcyBhIG5ldyBjaGF0IG1lc3NhZ2UgdXNpbmcgY2hhdHJvb21Nb2RlbCBtZXRob2Rcblx0c2VsZi5hcHBFdmVudEJ1cy5vbihcImNoYXRSZWNlaXZlZFwiLCBmdW5jdGlvbihjaGF0KSB7XG4gICAgc2VsZi5jaGF0cm9vbU1vZGVsLmFkZENoYXQoY2hhdCk7XG5cdFx0JCgnI2NoYXRib3gtY29udGVudCcpWzBdLnNjcm9sbFRvcCA9ICQoJyNjaGF0Ym94LWNvbnRlbnQnKVswXS5zY3JvbGxIZWlnaHQ7XG5cdH0pO1xuXG5cblxuXG4gIHNlbGYuYXBwRXZlbnRCdXMub24oXCJyb29tRGVzdHJveWVkXCIsIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBzZWxmLmNvbm5lY3RUb1Jvb20oKTtcbiAgICAvLyBzZWxmLmluaXRSb29tKCk7XG4gICAgLy8gYWxlcnQoJ0NoYXRyb29tICcgKyBuYW1lICsgJyBkZXN0cm95ZWQnKTtcbiAgfSk7XG5cbiAgc2VsZi5hcHBFdmVudEJ1cy5vbihcInNldENoYXRyb29tSGVhZGVyXCIsIGZ1bmN0aW9uKGhlYWRlck9iaikge1xuICAgIHZhciBuZXdIZWFkZXIgPSBuZXcgYXBwLkNoYXRyb29tSGVhZGVyTW9kZWwoaGVhZGVyT2JqKTtcbiAgICBzZWxmLmNoYXRyb29tTW9kZWwuc2V0KCdjaGF0cm9vbScsIG5ld0hlYWRlcik7XG4gIH0pO1xuXG4gIHNlbGYuYXBwRXZlbnRCdXMub24oXCJzZXRDaGF0bG9nXCIsIGZ1bmN0aW9uKGNoYXRsb2cpIHtcbiAgICB2YXIgb2xkQ2hhdGxvZyA9IHNlbGYuY2hhdHJvb21Nb2RlbC5nZXQoJ2NoYXRsb2cnKTtcbiAgICB2YXIgdXBkYXRlZENoYXRsb2cgPSBfLm1hcChjaGF0bG9nLCBmdW5jdGlvbihjaGF0KSB7XG4gICAgICB2YXIgbmV3Q2hhdE1vZGVsID0gbmV3IGFwcC5DaGF0TW9kZWwoeyByb29tOiBjaGF0LnJvb20sIG1lc3NhZ2U6IGNoYXQubWVzc2FnZSwgc2VuZGVyOiBjaGF0LnNlbmRlciwgdGltZXN0YW1wOiBjaGF0LnRpbWVzdGFtcCwgdXJsOiBjaGF0LnVybCB9KTtcbiAgICAgIHJldHVybiBuZXdDaGF0TW9kZWw7XG4gICAgfSk7XG4gICAgb2xkQ2hhdGxvZy5yZXNldCh1cGRhdGVkQ2hhdGxvZyk7XG4gICAkKCcjbWVzc2FnZS1pbnB1dCcpLnJlbW92ZUNsYXNzKCdkaXJlY3QtbWVzc2FnZS1pbnB1dCcpLmFkZENsYXNzKCdtZXNzYWdlLWlucHV0Jyk7XG4gICAgJCgnI2NoYXRib3gtY29udGVudCcpWzBdLnNjcm9sbFRvcCA9ICQoJyNjaGF0Ym94LWNvbnRlbnQnKVswXS5zY3JvbGxIZWlnaHQ7XG4gIH0pO1xuXG4gIHNlbGYuYXBwRXZlbnRCdXMub24oXCJtb3JlQ2hhdHNcIiwgZnVuY3Rpb24oY2hhdGxvZykge1xuICAgIHZhciBvbGRDaGF0bG9nID0gc2VsZi5jaGF0cm9vbU1vZGVsLmdldCgnY2hhdGxvZycpO1xuICAgIHZhciBtb3JlQ2hhdGxvZyA9IF8ubWFwKGNoYXRsb2csIGZ1bmN0aW9uKGNoYXQpIHtcbiAgICAgIHZhciBuZXdDaGF0TW9kZWwgPSBuZXcgYXBwLkNoYXRNb2RlbCh7IHJvb206IGNoYXQucm9vbSwgbWVzc2FnZTogY2hhdC5tZXNzYWdlLCBzZW5kZXI6IGNoYXQuc2VuZGVyLCB0aW1lc3RhbXA6IGNoYXQudGltZXN0YW1wLCB1cmw6IGNoYXQudXJsIH0pO1xuICAgICAgcmV0dXJuIG5ld0NoYXRNb2RlbDtcbiAgICB9KTtcbiAgICBzZWxmLmNoYXRyb29tTW9kZWwudHJpZ2dlcignbW9yZUNoYXRzJywgbW9yZUNoYXRsb2cpO1xuICB9KTtcblxuICBzZWxmLmFwcEV2ZW50QnVzLm9uKFwibm9Nb3JlQ2hhdHNcIiwgZnVuY3Rpb24oY2hhdGxvZykge1xuICAgIHNlbGYuY2hhdHJvb21Nb2RlbC5zdG9wTGlzdGVuaW5nKCdtb3JlQ2hhdHMnKTtcbiAgfSk7XG4gIFxuICBzZWxmLmFwcEV2ZW50QnVzLm9uKFwic2V0Q2hhdHJvb21zXCIsIGZ1bmN0aW9uKGNoYXRyb29tcykge1xuICAgIHZhciBvbGRDaGF0cm9vbXMgPSBzZWxmLmNoYXRyb29tTW9kZWwuZ2V0KCdjaGF0cm9vbXMnKTtcbiAgICB2YXIgdXBkYXRlZENoYXRyb29tcyA9IF8ubWFwKGNoYXRyb29tcywgZnVuY3Rpb24oY2hhdHJvb20pIHtcbiAgICAgIHZhciBuZXdDaGF0cm9vbU1vZGVsID0gbmV3IGFwcC5DaGF0cm9vbU1vZGVsKHsgbmFtZTogY2hhdHJvb20ubmFtZSwgb3duZXI6IGNoYXRyb29tLm93bmVyLCByb29tSW1hZ2U6IGNoYXRyb29tLnJvb21JbWFnZX0pO1xuICAgICAgcmV0dXJuIG5ld0NoYXRyb29tTW9kZWw7XG4gICAgfSk7XG4gICAgb2xkQ2hhdHJvb21zLnJlc2V0KHVwZGF0ZWRDaGF0cm9vbXMpO1xuICB9KTtcblxuICBzZWxmLmFwcEV2ZW50QnVzLm9uKFwic2V0UHJpdmF0ZVJvb21zXCIsIGZ1bmN0aW9uKHJvb21zKSB7XG4gICAgdmFyIG9sZFJvb21zID0gc2VsZi5jaGF0cm9vbU1vZGVsLmdldCgncHJpdmF0ZVJvb21zJyk7XG4gICAgdmFyIG5ld1Jvb21zID0gXy5tYXAocm9vbXMsIGZ1bmN0aW9uKHJvb20pIHtcbiAgICAgIHZhciBuZXdDaGF0cm9vbU1vZGVsID0gbmV3IGFwcC5DaGF0cm9vbU1vZGVsKHsgbmFtZTogcm9vbS5uYW1lLCBvd25lcjogcm9vbS5vd25lciwgcm9vbUltYWdlOiByb29tLnJvb21JbWFnZX0pO1xuICAgICAgcmV0dXJuIG5ld0NoYXRyb29tTW9kZWw7XG4gICAgfSk7XG4gICAgb2xkUm9vbXMucmVzZXQobmV3Um9vbXMpO1xuICB9KTtcblxuICBzZWxmLmFwcEV2ZW50QnVzLm9uKFwic2V0T25saW5lVXNlcnNcIiwgZnVuY3Rpb24ob25saW5lVXNlcnMpIHtcbiAgICB2YXIgb2xkT25saW5lVXNlcnMgPSBzZWxmLmNoYXRyb29tTW9kZWwuZ2V0KCdvbmxpbmVVc2VycycpO1xuICAgIHZhciB1cGRhdGVkT25saW5lVXNlcnMgPSBfLm1hcChvbmxpbmVVc2VycywgZnVuY3Rpb24odXNlcikge1xuICAgICAgdmFyIG5ld1VzZXJNb2RlbCA9IG5ldyBhcHAuVXNlck1vZGVsKHt1c2VybmFtZTogdXNlci51c2VybmFtZSwgdXNlckltYWdlOiB1c2VyLnVzZXJJbWFnZX0pO1xuICAgICAgcmV0dXJuIG5ld1VzZXJNb2RlbDtcbiAgICB9KTtcbiAgICBvbGRPbmxpbmVVc2Vycy5yZXNldCh1cGRhdGVkT25saW5lVXNlcnMpO1xuICB9KTtcblxuICBzZWxmLmFwcEV2ZW50QnVzLm9uKFwic2V0T2ZmbGluZVVzZXJzXCIsIGZ1bmN0aW9uKG9mZmxpbmVVc2Vycykge1xuICAgIHZhciBvbGRPZmZsaW5lVXNlcnMgPSBzZWxmLmNoYXRyb29tTW9kZWwuZ2V0KCdvZmZsaW5lVXNlcnMnKTtcbiAgICB2YXIgdXBkYXRlZE9mZmxpbmVVc2VycyA9IF8ubWFwKG9mZmxpbmVVc2VycywgZnVuY3Rpb24odXNlcikge1xuICAgICAgdmFyIG5ld1VzZXJNb2RlbCA9IG5ldyBhcHAuVXNlck1vZGVsKHt1c2VybmFtZTogdXNlci51c2VybmFtZSwgdXNlckltYWdlOiB1c2VyLnVzZXJJbWFnZX0pO1xuICAgICAgcmV0dXJuIG5ld1VzZXJNb2RlbDtcbiAgICB9KTtcbiAgICBvbGRPZmZsaW5lVXNlcnMucmVzZXQodXBkYXRlZE9mZmxpbmVVc2Vycyk7XG4gIH0pO1xuXG5cbi8vIGNoYXRyb29tIGF2YWlsYWJpbGl0eVxuXG4gIHNlbGYuYXBwRXZlbnRCdXMub24oXCJjaGF0cm9vbUF2YWlsYWJpbGl0eVwiLCBmdW5jdGlvbihhdmFpbGFiaWxpdHkpIHtcbiAgICBzZWxmLmNoYXRyb29tTW9kZWwudHJpZ2dlcignY2hhdHJvb21BdmFpbGFiaWxpdHknLCBhdmFpbGFiaWxpdHkpO1xuICB9KTtcblxuXG4vLyBlcnJvcnNcblxuXG4gIHNlbGYuYXBwRXZlbnRCdXMub24oXCJjaGF0cm9vbUFscmVhZHlFeGlzdHNcIiwgZnVuY3Rpb24oKSB7XG4gICAgc3dhbCh7XG4gICAgICB0aXRsZTogXCJPSCBOTyBPSCBOTyBPSCBOT1wiLFxuICAgICAgdGV4dDogXCJDaGF0cm9vbSBBbHJlYWR5LCBJdCBBbHJlYWR5IEV4aXN0cyEgQW5kLiBEb24ndCBHbyBJbiBUaGVyZS4gRG9uJ3QuIFlvdS4gWW91IFNob3VsZCBIYXZlLiBJIFRocmV3IFVwIE9uIFRoZSBTZXJ2ZXIuIFRob3NlIFBvb3IgLiAuIC4gVGhleSBXZXJlIEp1c3QhIE9IIE5PIFdIWS4gV0hZIE9IIE5PLiBPSCBOTy5cIixcbiAgICAgIHR5cGU6IFwiZXJyb3JcIixcbiAgICAgIGNvbmZpcm1CdXR0b25Db2xvcjogXCIjNzQ5Q0E4XCJcbiAgICB9KTtcbiAgfSk7XG5cblxuXG4gIC8vIERpcmVjdE1lc3NhZ2VcblxuICBzZWxmLmFwcEV2ZW50QnVzLm9uKFwic2V0RE1jaGF0bG9nXCIsIGZ1bmN0aW9uKGNoYXRsb2cpIHtcbiAgICB2YXIgb2xkQ2hhdGxvZyA9IHNlbGYuY2hhdHJvb21Nb2RlbC5nZXQoJ2NoYXRsb2cnKTtcbiAgICB2YXIgdXBkYXRlZENoYXRsb2cgPSBfLm1hcChjaGF0bG9nLCBmdW5jdGlvbihjaGF0KSB7XG4gICAgICB2YXIgbmV3Q2hhdE1vZGVsID0gbmV3IGFwcC5DaGF0TW9kZWwoeyByb29tOiBjaGF0LnJvb20sIG1lc3NhZ2U6IGNoYXQubWVzc2FnZSwgc2VuZGVyOiBjaGF0LnNlbmRlciwgdGltZXN0YW1wOiBjaGF0LnRpbWVzdGFtcCwgdXJsOiBjaGF0LnVybCB9KTtcbiAgICAgIHJldHVybiBuZXdDaGF0TW9kZWw7XG4gICAgfSk7XG4gICAgb2xkQ2hhdGxvZy5yZXNldCh1cGRhdGVkQ2hhdGxvZyk7XG5cbiAgICAkKCcjbWVzc2FnZS1pbnB1dCcpLnJlbW92ZUNsYXNzKCdtZXNzYWdlLWlucHV0JykuYWRkQ2xhc3MoJ2RpcmVjdC1tZXNzYWdlLWlucHV0Jyk7XG4gICAgJCgnI2NoYXRJbWFnZVVwbG9hZENvbnRhaW5lcicpLmRhdGEoJ2NoYXQtdHlwZScsICdtZXNzYWdlJyk7XG4gICAgJCgnI2NoYXRib3gtY29udGVudCcpWzBdLnNjcm9sbFRvcCA9ICQoJyNjaGF0Ym94LWNvbnRlbnQnKVswXS5zY3JvbGxIZWlnaHQ7XG4gIH0pO1xuXG4gIHNlbGYuYXBwRXZlbnRCdXMub24oXCJzZXRETWhlYWRlclwiLCBmdW5jdGlvbihoZWFkZXIpIHtcbiAgICB2YXIgbmV3SGVhZGVyID0gbmV3IGFwcC5DaGF0cm9vbUhlYWRlck1vZGVsKGhlYWRlcik7XG4gICAgc2VsZi5jaGF0cm9vbU1vZGVsLnNldCgnY2hhdHJvb20nLCBuZXdIZWFkZXIpO1xuICB9KTtcblxuXG4gIHNlbGYuYXBwRXZlbnRCdXMub24oXCJkaXJlY3RNZXNzYWdlUmVjZWl2ZWRcIiwgZnVuY3Rpb24obWVzc2FnZSkge1xuICAgIHNlbGYuY2hhdHJvb21Nb2RlbC5hZGRDaGF0KG1lc3NhZ2UpO1xuICAgICQoJyNjaGF0Ym94LWNvbnRlbnQnKVswXS5zY3JvbGxUb3AgPSAkKCcjY2hhdGJveC1jb250ZW50JylbMF0uc2Nyb2xsSGVpZ2h0O1xuICB9KTtcbn07XG5cbiIsInZhciBhcHAgPSBhcHAgfHwge307XG5cbihmdW5jdGlvbiAoKSB7XG5cbiAgLy8gJCh3aW5kb3cpLmJpbmQoJ2JlZm9yZXVubG9hZCcsIGZ1bmN0aW9uKGV2ZW50T2JqZWN0KSB7XG4gIC8vICAgJC5hamF4KHtcbiAgLy8gICAgICB1cmw6IFwiL2xvZ291dFwiLFxuICAvLyAgIH0pO1xuICAvLyB9KTtcblxuICB2YXIgQ2hhdHJvb21Sb3V0ZXIgPSBCYWNrYm9uZS5Sb3V0ZXIuZXh0ZW5kKHtcbiAgICBcbiAgICByb3V0ZXM6IHtcbiAgICAgICcnOiAnc3RhcnQnLFxuICAgICAgJ2xvZyc6ICdsb2dpbicsXG4gICAgICAncmVnJzogJ3JlZ2lzdGVyJyxcbiAgICAgICdvdXQnOiAnb3V0JyxcbiAgICAgICdhdXRoZW50aWNhdGVkJzogJ2F1dGhlbnRpY2F0ZWQnLFxuICAgICAgJ2ZhY2Vib29rJzogJ2ZhY2Vib29rJyxcbiAgICAgICd0d2l0dGVyJzogJ3R3aXR0ZXInXG4gICAgfSxcblxuICAgIHN0YXJ0OiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAnLyMnO1xuICAgICAgYXBwLm1haW5Db250cm9sbGVyID0gbmV3IGFwcC5NYWluQ29udHJvbGxlcigpO1xuICAgICAgYXBwLm1haW5Db250cm9sbGVyLmluaXQoKTtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgfSBcbiAgICAgIGVsc2Uge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIHVybDogXCIvbG9nb3V0XCIsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sXG5cblxuICAgIGxvZ2luOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBsb2dpbk1vZGVsID0gbmV3IGFwcC5Mb2dpbk1vZGVsKCk7XG4gICAgICB2YXIgbG9naW5WaWV3ID0gbmV3IGFwcC5Mb2dpblZpZXcoe3ZlbnQ6IGFwcC5tYWluQ29udHJvbGxlci52aWV3RXZlbnRCdXMsIG1vZGVsOiBsb2dpbk1vZGVsfSk7XG4gICAgICBhcHAubWFpbkNvbnRyb2xsZXIuY29udGFpbmVyTW9kZWwuc2V0KFwidmlld1N0YXRlXCIsIGxvZ2luVmlldyk7XG4gICAgfSxcblxuICAgIHJlZ2lzdGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByZWdpc3RlclZpZXcgPSBuZXcgYXBwLlJlZ2lzdGVyVmlldyh7dmVudDogYXBwLm1haW5Db250cm9sbGVyLnZpZXdFdmVudEJ1cyB9KTtcbiAgICAgIGFwcC5tYWluQ29udHJvbGxlci5jb250YWluZXJNb2RlbC5zZXQoXCJ2aWV3U3RhdGVcIiwgcmVnaXN0ZXJWaWV3KTtcbiAgICB9LFxuXG4gICAgLy8gb3V0OiBmdW5jdGlvbigpIHtcbiAgICAvLyAgICAgdmFyIHRoaXNfID0gdGhpcztcbiAgICAvLyAgICAgJC5hamF4KHtcbiAgICAvLyAgICAgICB1cmw6IFwiL2xvZ291dFwiLFxuICAgIC8vICAgICB9KVxuICAgIC8vIH0sXG5cbiAgICBhdXRoZW50aWNhdGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghYXBwLm1haW5Db250cm9sbGVyKSB7XG4gICAgICAgIHRoaXMuc3RhcnQoKTtcbiAgICAgIH1cbiAgICAgICAgYXBwLm1haW5Db250cm9sbGVyLmF1dGhlbnRpY2F0ZWQoKTtcbiAgICB9LFxuICAgIGZhY2Vib29rOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuc3RhcnQodGhpcy5hdXRoZW50aWNhdGVkKTtcbiAgICB9LFxuICAgIHR3aXR0ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5zdGFydCh0aGlzLmF1dGhlbnRpY2F0ZWQpO1xuICAgIH0sXG5cbiAgfSk7XG5cbiAgYXBwLkNoYXRyb29tUm91dGVyID0gbmV3IENoYXRyb29tUm91dGVyKCk7XG4gIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQoKTtcblxufSkoKTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=