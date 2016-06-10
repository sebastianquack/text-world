import { Template } from 'meteor/templating'
import './main.html'

Template.registerHelper( 'manageDisplay', () => { return Session.get("displayMode") == "overview" || Session.get("displayMode") == "edit" ? "" : "hidden" })
Template.registerHelper( 'overviewDisplay', () => { return Session.get("displayMode") == "overview" ? "" : "hidden" })
Template.registerHelper( 'playDisplay', () => { return Session.get("displayMode") == "play" ? "" : "hidden" })

Template.roomOverview.onCreated(function() {
  Meteor.subscribe('Rooms')
  Session.set("displayMode", "overview")
})

Template.roomOverview.helpers({
  rooms() { return Rooms.find() }  
})

Template.newRoomForm.events({  
  'submit .new-room'(event) {
    event.preventDefault()
    Meteor.call('rooms.create', event.target.name.value)
    event.target.name.value = ''
  }
})

Template.roomDetails.helpers({
  editorOptions() { return {lineNumbers: true, mode: "javascript"} },
  editorDisplay() { return Session.get("displayMode") == "edit" && Session.get("activeRoom") == this._id ? "" : "hidden" },
})

Template.roomDetails.rendered = function() {
  this.editor = CodeMirror.fromTextArea(this.find(".room-script"), {
    lineNumbers: true,
  	mode: "javascript"
  });
}
  
Template.roomDetails.events({
  'click .start-play-button'(event, template) {
    //move player to selected room
    roomAPI.movePlayerToRoom(this.name)
    Session.set("displayMode", "play")
  },
  'click .open-form-button'(event, template) {
    Session.set("displayMode", "edit")
    Session.set("activeRoom", this._id)
    $(template.find(".test-log")).html("")
    template.find(".test-input").value = ""
    template.find(".room-script").value = this.script
    Meteor.setTimeout(function() {
      template.editor.refresh()
    }, 100)
  },
  'click .cancel-edit-button'(event, template) {
    Session.set("displayMode", "overview")
  },
  'click .save-script-button'(event, template) {
    Meteor.call('rooms.updateScript', this._id, template.editor.getValue())
    Session.set("displayMode", "overview")
  },
  'submit .test-form'(event, template) {
    event.preventDefault()
    var input = template.find(".test-input").value    
    var testLog = $(template.find(".test-log"))
    processInput(input, template.editor.getValue(), testLog)
    template.find(".test-input").value = ""
  },
  'click .remove-room-button'(event) {
    if(confirm("permanently remove room?")) {
      Meteor.call('rooms.remove', this._id)
    }
  }
})

Template.play.events({
  'click .cancel-play-button'(event, template) {
    Session.set("displayMode", "overview")
  },
  'submit .play-form'(event, template) {
    event.preventDefault()
    var input = template.find(".play-input").value    
    var playLog = $(template.find(".play-log"))
    var roomScript = Rooms.findOne({name: Meteor.user().profile.currentRoom}).script
    processInput(input, roomScript, playLog)    
    template.find(".play-input").value = ""
  }
})

// this is exposed to the plugin script in the rooms - called by application.remote.function
roomAPI = { 
  movePlayerToRoom: function(roomName) { // todo: figure out how to avoid multiple calls to this
    var playLog = $(".play-log")
    if(Rooms.findOne({name: roomName})) {
      Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.currentRoom": roomName}});
      logAction("[you are now in room " + roomName + "]", playLog)
    } else {
      logAction("[room " + roomName + " not found]", playLog)
    }
  }
}

// use this to automatically add application.remote before function calls to the API
parseRoomScript = function(script) {
  Object.keys(roomAPI).forEach(function(key) {
    script = script.replace(key, "application.remote." + key)
  })
  return(script)
}

processInput = function(input, roomScript, log) {  
  logAction("input: " + input, log)
  
  // setup untrusted code to be processed as jailed plugin
  var pluginCode = 
      "var api = {" 
      + "processInput: function(input, output) {" // name the callback function output
      + parseRoomScript(roomScript)
      + "}};"
      + "application.setInterface(api);"

  // create plugin
  var plugin = new jailed.DynamicPlugin(pluginCode, roomAPI)
  var response = false
  
  // called after the plugin is loaded
  plugin.whenConnected(function() {
    // run the process function on the sandboxed plugin
    plugin.remote.processInput(input, function(outputValue) { 
      logAction(outputValue, log)
      response = true
      plugin = null      
    })  
  })
  
  Meteor.setTimeout(function() {
    if(plugin) {
      plugin.disconnect()
      plugin = null
    }
    if(!response) {
     logAction("[there was no response]", log) 
    }
  }, 3000)
  
}

logAction = function(text, log) {
  log.append("<li>"+ text + "</li>")
  Meteor.setTimeout(function() {
    log.scrollTop(log[0].scrollHeight)
  }, 100)
}


