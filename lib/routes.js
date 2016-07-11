FlowRouter.route('/', {
  name: 'home',
  action: function() {
    Meteor.call("logoutAdmin")
    BlazeLayout.render('welcome');
  }
});

FlowRouter.route('/tag/:tag', {
  name: 'tag',
  action: function(params) {
    Session.set("displayMode", "overview")
    Session.set("editorDisplay", "false")
    BlazeLayout.render('welcome', params);                  
  }
})

FlowRouter.route('/admin/:pw', {
  name: 'admin',
  action: function(params) {
    Meteor.call('authorizeAdmin', params.pw, function(error, result) {
      if(result == "ok" ) {
        BlazeLayout.render('welcome');
      }
    })
  }
})

FlowRouter.route('/:placeName', {
    name: 'place',
    action: function(params) {
      Meteor.call("logoutAdmin")
      if(params.placeName == "edit") {
        FlowRouter.go("edit", {uuid: params.placeName})
      }
      else if(params.placeName == "enter") {
        FlowRouter.go("enter", {uuid: params.placeName})
      }
      else {
        BlazeLayout.render('play', params);                  
      }
    }
});

FlowRouter.route('/edit/:uuid', {
    name: 'edit',
    action: function(params) {
        Meteor.call("logoutAdmin")
        BlazeLayout.render('play', params);
    }
});

FlowRouter.route('/enter/:uuid', {
    name: 'enter',
    action: function(params) {
        Meteor.call("logoutAdmin")
        BlazeLayout.render('play', params);
    }
});
