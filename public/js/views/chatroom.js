var app = app || {};

(function ($) {

app.ChatroomView = Backbone.View.extend({
  template: _.template($('#chatroom-template').html()),
  chatTemplate: _.template($('#chatbox-message-template').html()),
  nameTemplate: _.template($('#chatroom-name-template').html()),
  dateTemplate: _.template('<div class="followMeBar col-xs-12 col-sm-12 col-md-12"><span>-----------------</span><span> <%= moment(timestamp).format("dddd, MMMM Do YYYY") %> </span><span>-----------------</span></div>'),
  events: {
    'keypress .message-input': 'messageInputPressed',
    'click .chat-directory .room': 'setRoom',
    'keypress #chat-search-input': 'search'
  },
  initialize: function(options) {
    console.log('chatroomView.f.initialize: ', options);
    // passed the viewEventBus
    
    this.vent = options.vent;
  },
  initRoom: function() {
    this.renderName();
  },
  render: function(model) {
    console.log('crv.f.render');
    this.model = model || this.model;
    this.$el.html(this.template(this.model.toJSON()));
    // this.setChatCollection();
    // this.chatImageViewView.setElement(this.$('#chatImageUploadContainer')).render();
    this.setChatListeners();
    return this;
  },
  setChatListeners: function() {

    var onlineUsers = this.model.get('onlineUsers');
    this.listenTo(onlineUsers, "add", this.renderUser, this);
    this.listenTo(onlineUsers, "remove", this.renderUsers, this);
    this.listenTo(onlineUsers, "reset", this.renderUsers, this);

    var chatlog = this.model.get('chatlog');
    this.listenTo(chatlog, "add", this.renderChat, this);
    this.listenTo(chatlog, "remove", this.renderChats, this);
    this.listenTo(chatlog, "reset", this.renderChats, this);

    var chatrooms = this.model.get('chatrooms');
    this.listenTo(chatrooms, "add", this.renderRoom, this);
    this.listenTo(chatrooms, "remove", this.renderRooms, this);
    this.listenTo(chatrooms, "reset", this.renderRooms, this);


    this.chatImageView = new app.ChatImageView();
    this.listenTo(this.chatImageView, 'image-uploaded', this.updateInput);
    this.listenTo(this.model, "change:chatroom", this.renderName, this);

    // setTimeout(function() {
    //     $("#chatImageUpload").change(function(){
    //        console.log('burn daddy burn');
    //      });
    //     // $('#chatbox-content')[0].scrollTop = $('#chatbox-content')[0].scrollHeight;
    // }, 2000);

// figure this out, put somewhere else. no setTimeout
    setTimeout(function() {
      $('#chat-search-input').typeahead({
      onSelect: function(item) {
        console.log(item);
      },
      ajax: {
        url: '/api/searchChatrooms',
        triggerLength: 1,
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
            // We good!
            return data;
        }
      },
    });
        $('#chatbox-content')[0].scrollTop = $('#chatbox-content')[0].scrollHeight;
    }, 1000);

  },

  search: function(e) {
    if (e.keyCode === 13 && $.trim($('.message-input').val()).length > 0) {
      // fun fact: separate events with a space in trigger's first arg and you
      // can trigger multiple events.
      // this.vent.trigger("chat", { message: this.$('.message-input').val()});
      // this.$('.message-input').val('');
      $.post( "/api/searchChatrooms", function( data ) {
        $( ".result" ).html( data );
      });
      return false;
    } else {
      console.log('yay');
    }
    return this;
  },

  getChatroomModel: function(name) {
    console.log('crv.f.getChatroomModel');
    this.vent.trigger('getChatroomModel', name);
  },
  // renders on events, called just above
  renderName: function() {
    this.$('.chatbox-header').html(this.nameTemplate(this.model.get('chatroom').toJSON()));
  },
  renderUsers: function() {
    console.log('crv.f.renderUsers');
    console.log('USERS: ', this.model.get("onlineUsers"));
    this.$('.online-users').empty();
    this.model.get("onlineUsers").each(function (user) {
      this.renderUser(user);
    }, this);
  },
  renderUser: function(model) {
    var template = _.template($("#online-users-list-template").html());
    this.$('.online-users').append(template(model.toJSON()));
  },
  renderChats: function() {
    console.log('crv.f.renderChats');
    console.log('CHATLOG: ', this.model.get("chatlog"));
    this.$('#chatbox-content').empty();
    this.model.get('chatlog').each(function(chat) {
      this.renderChat(chat);
    }, this);

// these things should not be here
    autosize($('textarea.message-input'));
    this.dateDivider.load($(".followMeBar"));
  },
  renderChat: function(model) {

    // delete in production
    if (model.attributes.url === '' || model.attributes.url === null || model.attributes.url === undefined) {
      model.attributes.url = '';
    }

    this.renderDateDividers(model);
    var chatTemplate = $(this.chatTemplate(model.toJSON()));
    chatTemplate.appendTo(this.$('#chatbox-content')).hide().fadeIn().slideDown();
    $('#chatbox-content')[0].scrollTop = $('#chatbox-content')[0].scrollHeight;
  },
  renderDateDividers: function(model) {
    this.currentDate = moment(model.attributes.timestamp).format('dddd, MMMM Do YYYY');
    if ( this.currentDate !== this.previousDate ) {
      var currentDate = $(this.dateTemplate(model.toJSON()));
      currentDate.appendTo(this.$('#chatbox-content')).hide().fadeIn().slideDown();
      this.previousDate = this.currentDate;
    }
            this.chatImageView.setElement($('#chatImageUploadContainer'));
  },





  updateInput: function(response) {
    debugger;
    var chatImage = new app.ChatModel(response);
    console.log('img url: ', response);
    this.vent.trigger("chat", response);
    // this.renderChat(chatImage);
    // $('#chatImageUpload').val(response.url);
    // this.createData();
    setTimeout(function() {
      $('#chatbox-content')[0].scrollTop = $('#chatbox-content')[0].scrollHeight;
    }, 1000);
  },









  // renders on events, called just above
  renderRooms: function() {
    console.log('crv.f.renderRooms');
    console.log('CHATROOMS: ', this.model.get("chatrooms"));
    this.$('.public-rooms-container').empty();
    this.model.get('chatrooms').each(function (room) {
      this.renderRoom(room);
    }, this);
  },
  renderRoom: function(model) {
    var template = _.template($("#room-list-template").html());
    this.$('.public-rooms-container').append(template(model.toJSON()));
  },

  joinRoom: function(name) {
    console.log('crv.f.joinRoom');
    this.vent.trigger('joinRoom', name);
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
  setRoom: function(e) {
    console.log('crv.f.setRoom');
    var $tar = $(e.target);
    if ($tar.is('p')) {
      this.joinRoom($tar.data('room'));
    }
  },


  dateDivider: (function() {

    var $window = $(window),
    $stickies;

    load = function(stickies) {

      $stickies = stickies.each(function() {

        var $thisSticky = $(this).wrap('<div class="followWrap row" />');

        $thisSticky
        .data('originalPosition', $thisSticky.offset().top)
        .data('originalHeight', $thisSticky.outerHeight())
        .parent()
        .height($thisSticky.outerHeight());
        console.log('thissticky.originalposition', $thisSticky.offset().top);
      });
      
      $('#chatbox-content').scroll(scrollStickiesInit);

    };


    scrollStickiesInit = function() {
      $(this).off("scroll.stickies");
      $(this).on("scroll.stickies", _.debounce(_whenScrolling, 150));
    };


    _whenScrolling = function() {

      $stickies.each(function(i, sticky) {

        var $thisSticky = $(sticky),
        $thisStickyTop = $thisSticky.offset().top,
        $thisStickyPosition = $thisSticky.data('originalPosition'),

        $prevSticky = $stickies.eq(i - 1),
        $prevStickyTop = $prevSticky.offset().top,
        $prevStickyPosition = $prevSticky.data('originalPosition');


        if ($thisStickyTop <= 157) {

          var $nextSticky = $stickies.eq(i + 1),

          $thisStickyPosition = $thisSticky.data('originalPosition'),
          $thisAndPrevStickyDifference = Math.abs($prevStickyPosition - $thisStickyPosition);

          $thisSticky.addClass("fixed");

          // var $nextStickyPosition = $nextSticky.data('originalPosition');
          // var $thisAndNextStickyDifference = Math.abs($thisStickyPosition - $nextStickyPosition);
          // var $nextStickyTop = $nextSticky.offset().top;
          // console.log('-------------');
          // console.log('prevstickyoriginposition', $stickies.eq(i - 1).data('originalPosition'));
          // console.log('prevstickytop', $stickies.eq(i - 1).offset().top);
          // console.log('$thisAndPrevStickyDifference', Math.abs($thisStickyPosition - $stickies.eq(i - 1).data('originalPosition')));
          // console.log('thisStickyTop', $thisSticky.offset().top);
          // console.log('$thisAndNextStickyDifference', Math.abs($thisStickyPosition - $nextStickyPosition));
          // console.log('nextStickyTop', $nextSticky.offset().top);
          // console.log('nextstickyoriginposition', $nextSticky.data('originalPosition'));
          // // console.log('prev', $prevSticky);
          // // console.log('this', $thisSticky);
          // // console.log('next', $nextSticky);
          // console.log('-------------');
        
          //scrolling up
          if ($nextSticky.hasClass("fixed")) {
            $nextSticky.removeClass("fixed");
          }

         // scrolling up and sticking to proper position
          if ($prevStickyTop + $thisAndPrevStickyDifference > 157 && i !== 0) {
            $nextSticky.removeClass("fixed");
          }

          if ($prevStickyTop >= 157 && $prevSticky.hasClass("fixed") && i !== 0) {
            $prevSticky.removeClass("fixed");
          }

          // scrolling down
        } else {

          if ($prevStickyTop >= 157 && $prevSticky.hasClass("fixed") && i !== 0) {
            $thisSticky.removeClass("fixed");
          }

        }

        if ($('#chatbox-content').scrollTop() === 0) {
          $stickies.removeClass('fixed');
        }

      });

    };

    return {
      load: load
    };
  })()




});

})(jQuery);