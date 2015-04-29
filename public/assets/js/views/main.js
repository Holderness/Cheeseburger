var ContainerView = Backbone.View.extend({
	el: '#view-container',
	initialize: function(options) {
		this.model.on("change:viewState", this.render, this);
	},
	render: function() {
		var view = this.model.get('viewState');
		this.$el.html(view.render().el);
	}
});

var LoginView = Backbone.View.extend({
	template: _.template($('#login-template').html()),
	events: {
		'click #nameBtn': 'onLogin'
	},
	initialize: function(options) {
		// gets passed the viewEventBus when the MainController is initialized
		this.vent = options.vent;
		// telling the view to listen to an event on its model,
		// if there's an error, the callback (this.render) is called with the  
		// view as context
		this.listenTo(this.model, "change:error", this.render, this);
	},
	render: function() {
		this.$el.html(this.template(this.model.toJSON()));
		return this;
	},
	onLogin: function() {
		// triggering the login event and passing the username data to js/main.js
		this.vent.trigger("login", this.$('#nameText').val());
	}
});


var ChatroomView = Backbone.View.extend({
	template: _.template($('#chatroom-template').html()),
	events: {
		'keypress .message-input': 'messageInputPressed'
	},
	// initialized after the 'loginDone' event
	initialize: function(options) {
		console.log(options);
		// passed the viewEventBus
		this.vent = options.vent;

    // requests to the socketclient
		var onlineUsers = this.model.get('onlineUsers');
		var userChats = this.model.get('userChats');

    //sets event listeners on the collections
		this.listenTo(onlineUsers, "add", this.renderUser, this);
		this.listenTo(onlineUsers, "remove", this.renderUsers, this);
		this.listenTo(onlineUsers, "reset", this.renderUsers, this);

		this.listenTo(userChats, "add", this.renderChat, this);
		this.listenTo(userChats, "remove", this.renderChats, this);
		this.listenTo(userChats, "reset", this.renderChats, this);
	},
	render: function() {
		var onlineUsers = this.model.get("onlineUsers");
		this.$el.html(this.template());
		this.renderUsers();
		this.renderChats();
		return this;
	},
	// renders on events, called just above
	renderUsers: function() {
		this.$('.online-users').empty();
		this.model.get("onlineUsers").each(function (user) {
			console.log('-------users----------');
			console.log(user);
			this.renderUser(user);
		}, this);
	},
	renderUser: function(model) {
		var template = _.template($("#online-users-list-template").html());
		console.log('-------user----------');
		console.log(model);
		this.$('.online-users').append(template(model.toJSON()));
		this.$('.user-count').html(this.model.get("onlineUsers").length);
		// this.$('.nano').nanoScroller();
	},
	renderChats: function() {
		this.$('.chatbox-content').empty();
		this.model.get('userChats').each(function(chat) {
			this.renderChat(chat);
		}, this);
	},
	renderChat: function(model) {
		var template = _.template($('#chatbox-message-template').html());
		var element = $(template(model.toJSON()));
		element.appendTo(this.$('.chatbox-content')).hide().fadeIn().slideDown();
		// this.$('.nano').nanoScroller();
		// this.$('.nano').nanoScroller({ scroll: 'bottom' });
	},
	//events
	messageInputPressed: function(evt) {
		if (evt.keyCode == 13 && $('.message-input').val() !== '') {
			this.vent.trigger("chat message", this.$('.message-input').val());
			this.$('.message-input').val('');
			return false;
		}
	}
});