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
    roomAPI.movePlayerToRoom(this.name, true)      
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
    if(event.target.name.value) {
      if(Rooms.findOne({"name": {$regex: new RegExp(event.target.name.value, "i")}})) { // case insensitive search
        alert("Room name already taken, try another!")
      } else {
        Meteor.call('rooms.create', event.target.name.value)
        event.target.name.value = ''
      }
    }
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
  
  $('.api-cheat-sheet-code').each(function() {
      var $this = $(this),
          $code = $this.html(),
          $unescaped = $('<div/>').html($code).text();
      $this.empty();
      CodeMirror(this, {
          value: $unescaped,
          mode: 'javascript',
          lineNumbers: false,
          readOnly: true,
          theme: "base16-light"
      });
  });
}
 
Template.roomEditor.events({
  'submit .test-form'(event, template) {
    event.preventDefault()
    var input = template.find(".test-input").value    
    if(input) {
      runRoomScript(input, template.editor.getValue())
      template.find(".test-input").value = ""
    }
  },
  'click .re-enter-room-button'(event, template) {
    $(template.find(".test-log")).html("")
    logAction("[you are now in room " + currentRoom().name + "]")
    runRoomScript("", template.editor.getValue())
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
    if(input) {
      var roomScript = Rooms.findOne({name: Meteor.user().profile.currentRoom}).script
      runRoomScript(input, roomScript)    
      template.find(".play-input").value = ""
    }
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

initPlayerRoomVariables = function(roomName) {
  var playerRoomVariables = Meteor.user().profile.playerRoomVariables
  if(playerRoomVariables[roomName] == undefined) {
    playerRoomVariables[roomName] = {}
  }  
  Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.playerRoomVariables": playerRoomVariables}});
}

// this is exposed to the plugin script in the rooms - called by application.remote.functionName
roomAPI = { 
  output: function(text) {
    logAction(text)
  },
  movePlayerToRoom: function(roomName, force=false) { // used as player.moveTo
    var room = (Rooms.findOne({"name": {$regex: new RegExp(roomName, "i")}})) // case insensitive search
    if(room) {
      if(Session.get("displayMode") == "play" || force) {
        if(currentRoom()) {
          Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.arrivedFrom": currentRoom().name}})
        }
        Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.currentRoom": room.name}});
        initPlayerRoomVariables(room.name)
        logAction("[you are now in room " + room.name + "]")
        runRoomScript("", room.script)        
      } else {
        logAction("[player would move to room " + room.name + "]")
      }
    } else { 
      logAction("[room " + roomName + " not found]")
    }
  },
  setRoomVar: function(varName, value) { // used as room.set
    var room = currentRoom()
    if(room) {
      Meteor.call("rooms.setRoomVar", room._id, varName, value)
    }
  },
  setPlayerVar: function(varName, value) { // used as player.set
    var playerVariables = Meteor.user().profile.variables
    if(!playerVariables) {
      playerVariables = {}
    }
    playerVariables[varName] = value
    Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.variables": playerVariables}});
  },
  setPlayerVarHere: function(varName, value) { // used as player.setHere
    var room = currentRoom()
    if(room) {
      var playerRoomVariables = Meteor.user().profile.playerRoomVariables
      if(!playerRoomVariables) {
        playerRoomVariables = {}
      }
      if(!playerRoomVariables[room.name]) {
        playerRoomVariables[room.name] = {}
      }
      playerRoomVariables[room.name][varName] = value
      Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.playerRoomVariables": playerRoomVariables}});
    }
  }
}

// use this to automatically add application.remote before function calls to the API
preProcessRoomScript = function(script) {
  Object.keys(roomAPI).forEach(function(key) {
    script = script.replace(new RegExp(key, 'g'), "application.remote." + key)
  })  
  
  // special accessors because we can only have non-nested API object
  script = script.replace(new RegExp("room.set", 'g'), "application.remote.setRoomVar")
  script = script.replace(new RegExp("player.set", 'g'), "application.remote.setPlayerVar")
  script = script.replace(new RegExp("player.setHere", 'g'), "application.remote.setPlayerVarHere")
  script = script.replace(new RegExp("player.moveTo", 'g'), "application.remote.movePlayerToRoom")
    
  return(script)
}

// this data context is passed into the script with each call of processInput

createInput = function(inputString) {
  var input = {
    raw: inputString,
    words: inputString.length > 0 ? inputString.split(" ") : []
  }
  return input
}

createRoomObject = function() {
  var room = currentRoom().variables
  if(!room) { room = {} }
  return room
}

createPlayerObject = function(justArrived = false) {
  var player = Meteor.user().profile.variables
  if(!player) { player = {} }
  player.justArrived = justArrived
  player.arrivedFrom = Meteor.user().profile.arrivedFrom

  var was = Meteor.user().profile.playerRoomVariables
  if(!was) { was = {} }
  player.was = was
  
  if(Meteor.user().profile.playerRoomVariables) {
    var here = Meteor.user().profile.playerRoomVariables[currentRoom().name]
    if(!here) { here = {} }
    player.here = here
  } else {
    player.here = {}
  }
    
  return player
}

// TODO: differentiate data context between play and testing
runRoomScript = function(inputString, roomScript) {  
    
  // create plugin
  var plugin = new jailed.Plugin(Meteor.absoluteUrl() + '/plugin.js', roomAPI)
  var scriptEnded = false
  
  // called after the plugin is loaded
  plugin.whenConnected(function() {
    // run the processInput function inside the sandboxed plugin
    plugin.remote.processInput(
      preProcessRoomScript(roomScript),
      createInput(inputString), 
      createRoomObject(), 
      createPlayerObject(inputString == "" ? true : false),
      function(result) { // callback function, end of roomScript is reached
        if(result.error) {
          logAction("[error: " + result.error + "]")
        }
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