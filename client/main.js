import { Template } from 'meteor/templating'
import './main.html'

Template.body.onCreated(function() {
  Meteor.subscribe('Rooms')
})

Template.registerHelper( 'overviewDisplay', () => { return !Session.get("displayMode") || Session.get("displayMode") == "overview" })
Template.registerHelper( 'playDisplay', () => { return Session.get("displayMode") == "play" })
Template.registerHelper( 'editorDisplay', () => { return Session.get("displayMode") == "edit" })
Template.registerHelper( 'currentRoom', () => { return currentRoom() })

// overview

Template.roomOverview.helpers({
  rooms() { return Rooms.find() }  
})

Template.roomDetails.events({
  'click .start-play-button'(event) {
    Session.set("displayMode", "play")
    roomAPI.movePlayerToRoom(this.name)
  },
  'click .open-form-button'(event) {
    Session.set("displayMode", "edit")
    roomAPI.movePlayerToRoom(this.name)      
  },
  'click .remove-room-button'(event) {
    if(confirm("permanently remove room?")) {
      Meteor.call('rooms.remove', this._id)
    }
  }
})

Template.newRoomForm.events({  
  'submit .new-room'(event) {
    event.preventDefault()
    Meteor.call('rooms.create', event.target.name.value)
    event.target.name.value = ''
  }
})

// edit

Template.roomEditor.rendered = function() {
  var room = currentRoom()
  
  $(this.find(".test-log")).html("")
  this.find(".test-input").value = ""
  this.find(".room-script").value = room.script
  
  this.editor = CodeMirror.fromTextArea(this.find(".room-script"), {
    lineNumbers: true,
  	mode: "javascript",
    theme: "ambiance"
  })
  this.editor.refresh()
}
 
Template.roomEditor.events({
  'submit .test-form'(event, template) {
    event.preventDefault()
    var input = template.find(".test-input").value    
    var testLog = $(template.find(".test-log"))
    runRoomScript(input, template.editor.getValue(), input == "" ? true : false)
    template.find(".test-input").value = ""
  },
  'click .cancel-edit-button'(event, template) {
    Session.set("displayMode", "overview")
  },
  'click .save-script-button'(event, template) {
    Meteor.call('rooms.updateScript', currentRoom()._id, template.editor.getValue())
    Session.set("displayMode", "overview")
  },
  
}) 
  
// play

Template.play.events({
  'click .cancel-play-button'(event, template) {
    Session.set("displayMode", "overview")
  },
  'submit .play-form'(event, template) {
    event.preventDefault()
    var input = template.find(".play-input").value    
    var playLog = $(template.find(".play-log"))
    var roomScript = Rooms.findOne({name: Meteor.user().profile.currentRoom}).script
    runRoomScript(input, roomScript)    
    template.find(".play-input").value = ""
  }
})


// core functionality

currentRoom = function() {
  return Rooms.findOne({name: Meteor.user().profile.currentRoom})
}

currentLog = function() {
  return Session.get("displayMode") == "edit" ? $(".test-log") : $(".play-log")
}

logAction = function(text) {
  var timeout = currentLog() ? 0 : 500 // check if log is ready, otherwise wait a bit
  setTimeout(function() {
    var log = currentLog()
    if(log.length > 0) {
      log.append("<li>"+ text + "</li>")
      Meteor.setTimeout(function() {
        log.scrollTop(log[0].scrollHeight)
      }, 100)
    }
  }, timeout)
}

// this is exposed to the plugin script in the rooms - called by application.remote.functionName
// todo: move output to api - no callback
roomAPI = { 
  output: function(text) {
    logAction(text)
  },
  movePlayerToRoom: function(roomName) {
    var room = Rooms.findOne({name: roomName})
    if(room) {
      Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.currentRoom": roomName}});
      logAction("[you are now in room " + roomName + "]")
      runRoomScript("", room.script)        
    } else { 
      logAction("[room " + roomName + " not found]")
    }
  },
  setRoomVar: function(varName, value) {
    var room = currentRoom()
    if(room) {
      Meteor.call("rooms.setRoomVar", room._id, varName, value)
    }
  }
}

// use this to automatically add application.remote before function calls to the API
simplifyRoomScript = function(script) {
  Object.keys(roomAPI).forEach(function(key) {
    script = script.replace(new RegExp(key, 'g'), "application.remote." + key)
  })
  return(script)
}

// this data context is passed into the script with each call of processInput
vars = function() {
  var roomVars = currentRoom().variables
  if(!roomVars) { roomVars = {} }
  var vars = { room: roomVars }
  return vars
}

// TODO: differentiate data context between play and testing
runRoomScript = function(input, roomScript) {  
  
  // setup untrusted code to be processed as jailed plugin
  var pluginCode = 
      "var remoteAPI = {" 
      + "processInput: function(input, vars, callback) {"
      + simplifyRoomScript(roomScript)
      + " callback()}};"
      + "application.setInterface(remoteAPI);"

  console.log(pluginCode)

  // create plugin
  var plugin = new jailed.DynamicPlugin(pluginCode, roomAPI)
  var scriptEnded = false
  
  // called after the plugin is loaded
  plugin.whenConnected(function() {
    // run the process function on the sandboxed plugin
    plugin.remote.processInput(input, vars(),
      function() { 
        scriptEnded = true
        plugin = null      
      })  
  })
  
  Meteor.setTimeout(function() {
    if(plugin) {
      plugin.disconnect()
      plugin = null
    }
    if(!scriptEnded) {
     logAction("[room script didn't terminate]") 
    }
  }, 3000)
  
}