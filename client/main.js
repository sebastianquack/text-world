import { Template } from 'meteor/templating'
import './main.html'

// general template helpers
Template.registerHelper( 'overviewDisplay', () => { return !Session.get("displayMode") || Session.get("displayMode") == "overview" })
Template.registerHelper( 'playDisplay', () => { return Session.get("displayMode") == "play" })
Template.registerHelper( 'editorDisplay', () => { return Session.get("displayMode") == "edit" })
Template.registerHelper( 'currentRoom', () => { return currentRoom() })

// overview 

Template.body.onCreated(function() {
  Meteor.subscribe('Rooms')
  Meteor.subscribe('Log')
})

Template.roomOverview.helpers({
  publicRooms() { return Rooms.find({visibility: "public"}) },
  userRooms() { return Rooms.find({editors: Meteor.userId()}) },  
  allRooms() { return Rooms.find() }  
})

Template.roomDetails.helpers({
  'editAuthorized'() {
    return this.editors? this.editors.indexOf(Meteor.userId()) > -1 : false
  }
})

Template.roomDetails.events({
  'click .start-play-button'(event) {
    Session.set("displayMode", "play")
    movePlayerToRoom(this.name, true)
  },
  'click .open-form-button'(event) {
    Session.set("displayMode", "edit")
    movePlayerToRoom(this.name, true)      
  }
})

Template.newRoomForm.events({  
  'submit .new-room'(event) {
    event.preventDefault()
    if(event.target.name.value) {
      // case insensitive search for slug of name
      if(Rooms.findOne({"slug": {$regex: new RegExp(slugify(event.target.name.value), "i")}})) {         
        alert("Place name already taken, try another!")
      } else {
        Meteor.call('rooms.create', event.target.name.value)
        event.target.name.value = ''
      }
    }
  }
})

// play

Template.play.rendered = function() {
  this.subscribe("Rooms", function() {      
    var room = currentRoom()
    if(room) {
      Meteor.subscribe("Log", function() {
        setupLogHandle("play", room)
      })     
    }
  })
}

Template.play.events({
  'click .cancel-play-button'(event, template) {
    leaveEditorOrPlay()
  },
  'submit .play-form'(event, template) {
    event.preventDefault()
    if(currentRoom()) {
      submitCommand()
    }
  }
})

leaveEditorOrPlay = function() {
  logRoomLeave()
  logReady = false
  Session.set("displayMode", "overview")      
  if(FlowRouter.getRouteName() == "edit" || FlowRouter.getRouteName() == "enter" || FlowRouter.getRouteName() == "place") {
    FlowRouter.go('home')
  }   
}

// edit

roomEditor = null
cssEditor = null

Template.roomEditor.rendered = function() {
  var self = this
  self.subscribe("Rooms", function() {
    var room = currentRoom()
    if(room) {
      
      // initialise input fields
      self.find(".test-input").value = ""
      Session.set("useCoffeeScript", room.useCoffeeScript)
      Session.set("visibilitySelected", room.visibility ? room.visibility : "private")
      Session.set("scriptSaved", true)

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
      
      // handle player input through log
      Meteor.subscribe("Log", {roomId: room._id}, function() {
        setupLogHandle("edit", room)
      })
      
    } else {
      FlowRouter.go("/")
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
    return [{value: "private", label: "private - only accessible via secret links"}, 
            {value: "unlisted", label: "unlisted - players may be moved here from other places"}, 
            {value: "public", label: "public - shows up in overview of public places"}]
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
 
Template.roomEditor.events({
  'change .show-in-my-places'(event, template) {
    var newValue = true // default if editors isn't defined on the room
    if(currentRoom().editors) {
      newValue = !(currentRoom().editors.indexOf(Meteor.userId()) > -1)
    }
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
      var room = currentRoom()
      Meteor.call("rooms.resetEditUUID", room._id, function(error, result) {
        FlowRouter.go("edit", {uuid: result})
      })
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
  
// handle logging and user input

observeLogHandle = null
logReady = false
redoEntry = false

setupLogHandle = function(mode, room) {
  //console.log("runnig setupLogHandle")
  if(observeLogHandle) {
    observeLogHandle.stop()
    observeLogHandle = null
  }
  if(!observeLogHandle) { // prevent multiple calls of observeChanges
    var entries = Log.find()
    var initializing = true
    observeLogHandle = entries.observeChanges({
      added: function(id, entry) {
        if(!initializing) {
          //console.log("observeChanges:")
          //console.log(entry)
          onLogUpdate(entry)
        }              
      }
    })
    initializing = false
    logReady = true
    //console.log("observelogHandler ready")
    if(redoEntry) { // we missed the room init command while loading, redo once
      redoEntry = false
      //console.log("redoing entry")
      performRoomEntry(room)
    } 
  }
  if(Session.get("displayMode") != mode) { // this needs to be done when route first accessed
    //console.log("setting up after direct call to route")
    Session.set("displayMode", mode)
    movePlayerToRoom(room.name, true)
  }
  if(Session.get("displayMode") == "play" && room.visibility == "public") {
    FlowRouter.go("place", {placeName: room.slug})
  }
}

// submits user input to the rooms script
submitCommand = function(specialInput = null) {
  if($('#command-input').val() || specialInput != null) {
    var input = specialInput ? specialInput : $('#command-input').val()    
    if(input) {
      //console.log("logging command " + input)
      Meteor.call("log.add", {type: "input", editing: Session.get("displayMode") == "edit", playerId: Meteor.userId(), roomId: currentRoom()._id, input: input})
      $('#command-input').val("")
    }
    var script = null
    if(Session.get("displayMode") == "edit") {
      if(roomEditor) {
        script = roomEditor.getValue()
      }
    } else {
      script = currentRoom().script  
    }
    if(script) {
      runRoomScript(input, script, currentRoom().useCoffeeScript)          
    }
  }  
}

// this is called when there is a new log item
onLogUpdate = function(entry) {
  var roomName = Rooms.findOne({_id: entry.roomId}).name
  
  if(entry.type == "output") {
    if(entry.playerId == Meteor.userId()) {
      logAction(entry.output, false, entry.className)      
    } else {
      if(entry.input) {
        logAction("[player " + entry.playerId + " typed '" + entry.input + "' and "+ roomName +" responded with:")      
        logAction(entry.output, false, entry.className)      
        logAction("]")      
      }
    }
  }
  if(entry.type == "roomEnter") {
    if(entry.playerId == Meteor.userId()) {
      logAction("[you are now in place " + roomName + "]")  
    } else {
      if(entry.roomId == currentRoom()._id) {
        logAction("[player " + entry.playerId + " is now also in " + roomName + "]")  
      }
    }    
  }
  if(entry.type == "roomLeave") {
    if(entry.roomId == currentRoom()._id && entry.playerId != Meteor.userId()) {
      logAction("[player " + entry.playerId + " has left "+ (entry.destinationId ? "to " + Rooms.findOne({_id: entry.destinationId}).name : "") + "]")  
    }
  }
}

// return the current room depending on display mode
currentRoom = function() {
  if(Meteor.user()) {
    if(Meteor.user().profile.currentRoom) {
      return Rooms.findOne({name: Meteor.user().profile.currentRoom})  
    }
  }  
  if(FlowRouter.getRouteName() == "edit") {
    return Rooms.findOne({editUUID: FlowRouter.getParam("uuid")})  
  } 
  if(FlowRouter.getRouteName() == "enter") {
    return Rooms.findOne({playUUID: FlowRouter.getParam("uuid")})  
  }
  if(FlowRouter.getParam("placeName")) {
    return Rooms.findOne({slug: FlowRouter.getParam("placeName")})  
  }
  return null
}

// move player to a new room
movePlayerToRoom = function(roomName, fromMenu=false) {
  //console.log("attempting to move player to " + roomName)
  var room = null
  // force option used when moving player to room for editing or playing rooms player is editor of - not available in roomAPI
  if(fromMenu) {
    // case insensitive search - ignore privacy
    room = (Rooms.findOne({"name": {$regex: new RegExp(roomName, "i")}})) 
  } else {
    // case insensitive search - API call: respect privacy    
    room = (Rooms.findOne({"visibility": {$in: ["unlisted", "public"] }, "name": {$regex: new RegExp(roomName, "i")}})) 
  }
  if(room) {
    if(Session.get("displayMode") == "play") {
      Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.arrivedFrom": currentRoom()}}) // arrived from room or null
      if(currentRoom()) {
        logRoomLeave(room._id)
      }
      performRoomEntry(room)
    }
    if(Session.get("displayMode") == "edit") {
      if(fromMenu) {
        performRoomEntry(room)
      } else {
        logAction("[you would now move to place " + room.name + " - disabled during edit mode]")  
      }
    }
  } else { 
    logAction("[room " + roomName + " not found]")
  }
}

performRoomEntry = function(room) {
  Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.currentRoom": room.name}});  
  if(logReady) {
    redoEntry = false
    Meteor.call("log.add", {type: "roomEnter", editing: Session.get("displayMode") == "edit", playerId: Meteor.userId(), roomId: room._id})
    initPlayerRoomVariables(room.name)
    //console.log("initiating justArrived response from room script")
    submitCommand("") // init justArrived output with empty comamnd
  } else {
    //console.log("log not ready")
    redoEntry = true
  }
}

logRoomLeave = function(destinationId = null) {
  if(Session.get("displayMode") == "play") {
    if(currentRoom()) {
      Meteor.call("log.add", {type: "roomLeave", playerId: Meteor.userId(), roomId: currentRoom()._id, destinationId: destinationId})
    }
    Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.currentRoom": null}})
  }
}

// this is called from inside the plugin script
roomAPI = { 
  outputIncludingInput: function(result, className=null) {
    //logAction(text, false, className)
    if(result.output) { // don't log empty text
      Meteor.call("log.add", {type: "output", editing: Session.get("displayMode") == "edit", playerId: Meteor.userId(), roomId: currentRoom()._id, input: result.input, output: result.output, className: result.className})
    }
  },
  movePlayerToRoom: function(roomName) { // used as player.moveTo
    movePlayerToRoom(roomName)
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
  if(!inputString) {
    inputString = ""
  }
  var input = {
    raw: inputString,
    words: inputString.length > 0 ? inputString.split(" ") : []
  }
  return input
}

createRoomObject = function() {
  var roomObject = {}
  var room = currentRoom()
  if(room) {
    roomObject = room.variables
  }
  return roomObject
}

createPlayerObject = function(justArrived = false) {
  var room = currentRoom()
  if(!room) {
    return {}
  }
  var player = Meteor.user().profile.variables
  if(!player) { player = {} }
  player.justArrived = justArrived
  player.arrivedFrom = Meteor.user().profile.arrivedFrom

  var was = Meteor.user().profile.playerRoomVariables
  if(!was) { was = {} }
  player.was = was
  
  if(Meteor.user().profile.playerRoomVariables) {
    var here = Meteor.user().profile.playerRoomVariables[room.name]
    if(!here) { here = {} }
    player.here = here
  } else {
    player.here = {}
  }
    
  return player
}

// creates the plugin and runs the rooms script in jailed sandbox
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
  
  setTimeout(function() {
    if(plugin) {
      plugin.disconnect()
      plugin = null
    }
    if(!scriptEnded) {
     logAction("[place script didn't terminate]") 
    }
  }, 3000)
  
}


// core interface functionality

currentLog = function() {
  return Session.get("displayMode") == "edit" ? $(".test-log") : $(".play-log")
}

// writes a text into the current log and adds autotyping events
logAction = function(text, erase=false, className=null) {
  var timeout = currentLog() ? 0 : 500 // check if log is ready, otherwise wait a bit
  setTimeout(function() {
    var log = currentLog()
    if(log.length > 0) {
      
      //use this for other syntax for shortcuts in log - for now we just use <b> </b>
      //text = text.replace(/(\<(.*?)\>)/g,'<b class="shortcut-link" data-command="$2"></b>')
      
      var appendText = className ? 
        '<li class="' + className + '">' + text + '</li>'
        : '<li>' + text + '</li>'
      
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
      
      setTimeout(function() {
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