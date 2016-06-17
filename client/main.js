import { Template } from 'meteor/templating'
import './main.html'

Template.body.onCreated(function() {
  Meteor.subscribe('Rooms')
})

Template.registerHelper( 'overviewDisplay', () => { return !Session.get("displayMode") || Session.get("displayMode") == "overview" })
Template.registerHelper( 'playDisplay', () => { return Session.get("displayMode") == "play" })
Template.registerHelper( 'editorDisplay', () => { return Session.get("displayMode") == "edit" })
Template.registerHelper( 'currentRoom', () => { return currentRoom() })

currentRoom = function() {
  if(FlowRouter.getRouteName() == "edit") {
    return Rooms.findOne({editUUID: FlowRouter.getParam("uuid")})  
  } 
  if(FlowRouter.getRouteName() == "enter") {
    return Rooms.findOne({playUUID: FlowRouter.getParam("uuid")})  
  } 
  if(Meteor.user()) {
    return Rooms.findOne({name: Meteor.user().profile.currentRoom})  
  }  
}

// overview

Template.roomOverview.helpers({
  publicRooms() { return Rooms.find({visibility: "public"}) },
  userRooms() { return Rooms.find({editors: Meteor.userId()}) },  
  allRooms() { return Rooms.find() }  
})

Template.roomDetails.helpers({
  'editAuthorized'() {
    if(this.editors) {
      return this.editors.indexOf(Meteor.userId()) > -1
    } else {
      return false
    }
  }
})

Template.roomDetails.events({
  'click .start-play-button'(event) {
    Session.set("displayMode", "play")
    movePlayerToRoomSystem(this.name, true)
  },
  'click .open-form-button'(event) {
    Session.set("displayMode", "edit")
    Session.set("scriptSaved", true)
    var self = this
    Meteor.setTimeout(function() {
      movePlayerToRoomSystem(self.name, true)      
    }, 100)
  }
})

Template.newRoomForm.events({  
  'submit .new-room'(event) {
    event.preventDefault()
    if(event.target.name.value) {
      if(Rooms.findOne({"name": {$regex: new RegExp(event.target.name.value, "i")}})) { // case insensitive search
        alert("Place name already taken, try another!")
      } else {
        Meteor.call('rooms.create', event.target.name.value)
        event.target.name.value = ''
      }
    }
  }
})

// edit

roomEditor = null
cssEditor = null

Template.roomEditor.rendered = function() {
  var self = this
  self.subscribe("Rooms", function() {
    var room = currentRoom()
    if(FlowRouter.getRouteName() == "edit") {
      Session.set("displayMode", "edit")
      Session.set("scriptSaved", true)
      movePlayerToRoomSystem(room.name, true)      
    }
    if(room) {
      // initialise input fields
      $(self.find(".test-log")).html("")
      self.find(".test-input").value = ""
      Session.set("useCoffeeScript", room.useCoffeeScript)
      Session.set("visibilitySelected", room.visibility ? room.visibility : "private")

      // setup script editor
      roomEditor = null
      roomEditor = CodeMirror.fromTextArea(self.find(".room-script"), {
        lineNumbers: false,
      	mode: "javascript",
        theme: "ambiance"
      })
      roomEditor.getDoc().setValue(room.script)
      roomEditor.refresh()
      roomEditor.on("change", function() {
        Session.set("scriptSaved", false)
      })

      // setup css editor
      cssEditor = null
      cssEditor = CodeMirror.fromTextArea(self.find(".room-css"), {
        lineNumbers: false,
      	mode: "css",
        theme: "base16-light"
      })
      cssEditor.getDoc().setValue(room.css)
      cssEditor.refresh()
      cssEditor.on("change", function() {
        Session.set("scriptSaved", false)
      })
    }
  })
  
  // setup cheat sheet
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
 
Template.roomEditor.helpers({
  'coffeeScriptChecked': function() {
    return Session.get("useCoffeeScript") ? 'checked' : ''
  },
  'saved': function() {
    return Session.get("scriptSaved") ? 'disabled' : ''
  },
  'visibilityOptions': function() {
    return [{value: "private"}, {value: "unlisted"}, {value: "public"}]
  },
  'selected': function() {
    return this.value == Session.get("visibilitySelected") ? "selected" : ""
  }, 
  'editURL': function() {
    return currentRoom() ? Meteor.absoluteUrl() + "edit/" + currentRoom().editUUID : ""
  },
  'enterURL': function() {
    return currentRoom() ? Meteor.absoluteUrl() + "enter/" + currentRoom().playUUID : ""
  },
  'myPlacesChecked': function() {
    var room = currentRoom()
    if(room) {
      if(room.editors) {
        return currentRoom().editors.indexOf(Meteor.userId()) > -1 ? "checked" : ""
      }
    } 
    return ""
  }
})
 
leaveEditorOrPlay = function() {
  Session.set("displayMode", "overview")      
  if(FlowRouter.getRouteName() == "edit" || FlowRouter.getRouteName() == "enter") {
    FlowRouter.go('home')
  }   
}
 
Template.roomEditor.events({
  'change .show-in-my-places'(event, template) {
    var newValue = !(currentRoom().editors.indexOf(Meteor.userId()) > -1)
    Meteor.call("rooms.toggleEditor", currentRoom()._id, newValue)
  },
  'change .use-coffee-script'(event, template) {
    var newValue = !Session.get("useCoffeeScript")
    Session.set("useCoffeeScript", newValue)
    Session.set("scriptSaved", false)    
  },
  'change .visibility-select'(event, template) {
    var newValue = $(event.target).val();
    Session.set("visibilitySelected", newValue)
    Session.set("scriptSaved", false)    
  },
  'input .author-input, input .description-input'() {
    Session.set("scriptSaved", false)
  },
  'click .new-play-uuid-button'() {
    if(confirm("This will create a new secret link for entering this place. Warning: Old links will stop working. Proceed?")) {
      Meteor.call("rooms.resetPlayUUID", currentRoom()._id)
    }
  },
  'click .new-edit-uuid-button'() {
    if(confirm("This will create a new secret link for editing this place. Warning: Old links will stop working. Proceed?")) {
      Meteor.call("rooms.resetEditUUID", currentRoom()._id)
    }
  },
  'submit .test-form'(event, template) {
    event.preventDefault()
    submitCommand()
  },
  'click .re-enter-room-button'(event, template) {
    $(template.find(".test-log")).html("")
    logAction("[you are now in place " + currentRoom().name + "]")
    submitCommand("")
  },
  'click .close-edit-button'(event, template) {
    if(!Session.get("scriptSaved")) {
      if(confirm("Leave without saving? All changes will be lost.")) { leaveEditorOrPlay() }
    } else { leaveEditorOrPlay() }
  },
  'click .save-script-button'(event, template) {
    Session.set("scriptSaved", true)
    var id = currentRoom()._id
    Meteor.call('rooms.updateMeta', id, 
      template.find(".author-input").value,
      template.find(".description-input").value,
      Session.get("visibilitySelected"),
      cssEditor.getValue(),
      Session.get("useCoffeeScript")
    )
    Meteor.call('rooms.updateScript', id, roomEditor.getValue())
  },
  'click .remove-room-button'(event) {
    if(confirm("permanently remove this place?")) {
      Meteor.call('rooms.remove', currentRoom()._id)
      Session.set("displayMode", "overview")
    }
  }
}) 
  
// play

Template.play.rendered = function() {
  if(FlowRouter.getRouteName() == "enter") {
    this.subscribe("Rooms", function() {
      var room = currentRoom() 
      if(room) {
        Session.set("displayMode", "play")
        movePlayerToRoomSystem(room.name, true)
      }
    })
  }  
}

Template.play.events({
  'click .cancel-play-button'(event, template) {
    leaveEditorOrPlay()
  },
  'submit .play-form'(event, template) {
    event.preventDefault()
    submitCommand()
  }
})

// core interface functionality

currentLog = function() {
  return Session.get("displayMode") == "edit" ? $(".test-log") : $(".play-log")
}

// submits user input to the rooms script
submitCommand = function(specialInput = null) {
  if($('#command-input').val() || specialInput != null) {
    var script = Session.get("displayMode") == "edit" ? roomEditor.getValue() : currentRoom().script
    var input = specialInput ? specialInput : $('#command-input').val()
    runRoomScript(input, script, currentRoom().useCoffeeScript)
    $('#command-input').val("")
  }  
}

// writes a text into the current log and adds autotyping events
logAction = function(text, erase=false) {
  var timeout = currentLog() ? 0 : 500 // check if log is ready, otherwise wait a bit
  setTimeout(function() {
    var log = currentLog()
    if(log.length > 0) {
      
      //use this for other syntax for shortcuts in log - for now we just use <b> </b>
      //text = text.replace(/(\<(.*?)\>)/g,'<b class="shortcut-link" data-command="$2"></b>')
      
      var appendText = "<li>"+ text + "</li>"

      if(erase) {
        log.html(appendText)
      } else {
        log.append(appendText)
      }
      
      // setup log events
      log.off("click")
      log.on("click","li b", null, function() { 
        autoType($(this).html())
      })
      
      Meteor.setTimeout(function() {
        log.scrollTop(log[0].scrollHeight)
      }, 100)
    }
  }, timeout)
}

// animate typing into input field when user clicks shortcut in log
var autoTyping = false
autoType = function(text) {
  if (autoTyping) return
  else autoTyping = true
  //scrollInput()
  var delay = 90
  var type = function(text, delay) {
    character = text.substr(0,1)
    remaining = text.substr(1)
    elem = $('#command-input')
    elem.val(elem.val() + character)
    elem.trigger("keypress")
    if (remaining != "") setTimeout(function () {type(remaining,delay)}, delay)
  }
  type(text, delay)
  setTimeout(function() { submitCommand(); autoTyping = false; }, delay*(text.length+5))
}

// core API functionality

movePlayerToRoomSystem = function(roomName, force=false) {
  var room = null
  if(force) {
    // case insensitive search - ignore privacy
    room = (Rooms.findOne({"name": {$regex: new RegExp(roomName, "i")}})) 
  } else {
    // case insensitive search - respect privacy    
    room = (Rooms.findOne({"visibility": {$in: ["unlisted", "public"] }, "name": {$regex: new RegExp(roomName, "i")}})) 
  }
  if(room) {
    if(Session.get("displayMode") == "play" || force) {
      if(currentRoom()) {
        Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.arrivedFrom": currentRoom().name}})
      }
      Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.currentRoom": room.name}});
      initPlayerRoomVariables(room.name)
      logAction("[you are now in place " + room.name + "]", true) // with erase before write
      runRoomScript("", room.script, room.useCoffeeScript)        
    } else {
      logAction("[player would move to place " + room.name + "]")
    }
  } else { 
    logAction("[room " + roomName + " not found]")
  }
}


// this is exposed to the plugin script in the rooms - called by application.remote.functionName
roomAPI = { 
  output: function(text) {
    logAction(text)
  },
  movePlayerToRoom: function(roomName) { // used as player.moveTo
    movePlayerToRoomSystem(roomName)
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

// set up emtpy object when player first enters a room
initPlayerRoomVariables = function(roomName) {
  var playerRoomVariables = Meteor.user().profile.playerRoomVariables
  if(playerRoomVariables == undefined) {
    playerRoomVariables = {}
  }
  if(playerRoomVariables[roomName] == undefined) {
    playerRoomVariables[roomName] = {}
  }  
  Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.playerRoomVariables": playerRoomVariables}});
}

// use this to automatically add application.remote before function calls to the API
preProcessRoomScript = function(script) {
  Object.keys(roomAPI).forEach(function(key) {
    script = script.replace(new RegExp(key, 'g'), "application.remote." + key)
  })  
  
  // special accessors because we can only have non-nested API object
  script = script.replace(new RegExp("place.set", 'g'), "application.remote.setRoomVar")
  script = script.replace(new RegExp("room.set", 'g'), "application.remote.setRoomVar") // deprecated
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
runRoomScript = function(inputString, roomScript, useCoffeeScript=false) {  
  
  if(useCoffeeScript) {
    roomScript = CoffeeScript.compile(roomScript)
  }
    
  // create plugin
  var plugin = new jailed.Plugin(Meteor.absoluteUrl() + 'plugin.js', roomAPI)
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
     logAction("[place script didn't terminate]") 
    }
  }, 3000)
  
}