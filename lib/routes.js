// route definitions

FlowRouter.route('/', {
  name: 'home',
  action: function() {
    Meteor.call("logoutAdmin")
    Session.set("activeTag", null)
    BlazeLayout.render('welcome');
    if(Session.get("roomsSubscribed")) {
      updatePlacesGraph()    
    }
  }
})

FlowRouter.route('/tag/:tag', {
  name: 'tag',
  action: function(params) {
    console.log("tag route")
    Session.set("activeTag", FlowRouter.getParam("tag"))
    Session.set("displayMode", "overview")
    Session.set("editorDisplay", "false")
    BlazeLayout.render('welcome', params);                      
    if(Session.get("roomsSubscribed")) {
      updatePlacesGraph()    
    }
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
        Session.set("displayMode", "play")
        BlazeLayout.render('welcome', params);                  
      }
    }
})

FlowRouter.route('/edit/:uuid', {
    name: 'edit',
    action: function(params) {
        Meteor.call("logoutAdmin")
        Session.set("displayMode", "play")
        BlazeLayout.render('welcome', params);
    }
})

FlowRouter.route('/enter/:uuid', {
    name: 'enter',
    action: function(params) {
        Meteor.call("logoutAdmin")
        Session.set("displayMode", "play")
        BlazeLayout.render('welcome', params);
    }
})

// helper functions

onSecretEditRoute = function() {
  if(!currentRoom()) {
    return false
  }
  if(FlowRouter.getRouteName() == "edit") {
    if(FlowRouter.getParam("uuid") == currentRoom().editUUID) {
      return true
    }
  }
  return false
}

getRouteTags = function() {
  if(FlowRouter.getRouteName() == "tag") {
    return [FlowRouter.getParam("tag")]
  }
  return []
}

