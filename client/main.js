import { Template } from 'meteor/templating'
import './main.html'

// general template helpers

Template.registerHelper( 'overviewDisplay', () => { return !Session.get("displayMode") || Session.get("displayMode") == "overview" })
Template.registerHelper( 'playDisplay', () => { return Session.get("displayMode") == "play" })
Template.registerHelper( 'editorDisplay', () => { return Session.get("editorDisplay") })

Template.registerHelper( 'currentRoom', () => { return Session.get("currentRoomObject") })
Template.registerHelper( 'adminRoute', () => { return FlowRouter.getRouteName() == "admin" })

Template.registerHelper( 'editAuthorized', () => { return editAuthorized(currentRoom()) || onSecretEditRoute() })
Template.registerHelper( 'unclaimed', () => { return unclaimedRoom(currentRoom()) || onSecretEditRoute() })
Template.registerHelper( 'editAuthorizedOrUnclaimed', () => { return editAuthorizedOrUnclaimed(currentRoom()) || onSecretEditRoute() })
Template.registerHelper( 'showReEnterButton', () => { return Session.get("editorDisplay") && (editAuthorized(currentRoom()) || onSecretEditRoute()) })

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

// overview 

Template.body.onCreated(function() {
  Meteor.subscribe('Log')
  Meteor.subscribe('Users')
})

elementsForRooms = function(rooms) {
  var elements = {nodes: [], edges: []}
  for(var i=0;i<rooms.length;i++) {
    var color = rooms[i].visibility == "public"? "#000" : "#ccc"
    if(rooms[i].editors.length == 0) {
      color = "#008000"
    }
    elements.nodes.push({
      data: {
        id: rooms[i]._id, 
        name: rooms[i].name,
        displayName: /*(editAuthorized(rooms[i])? "✎ " : "") +*/ rooms[i].name,
        color: color
      }
    })
    if(rooms[i].exits) {
      rooms[i].exits.forEach(function(exit) {
        var exitRoom = Rooms.findOne({_id: exit})
        if(exitRoom.visibility == "public" || editAuthorized(exitRoom) || FlowRouter.getRouteName() == "admin") {
          elements.edges.push({
            data: {
              source: rooms[i]._id,
              target: exit,
              color: color
            }
          })
        }          
      })
    }    
  }
  return elements
}

tooltipContent = function(roomId) {
  var room = Rooms.findOne({_id: roomId})
  if(!room) { return "error: room not found" }
  var content = ""
  content += room.description? "<p>"+room.description+"</p>" : ""
  content += room.author? "<p>by "+room.author+"</p>" : ""
  content += '<input class="enter-room" type="button" value="> enter">'
  return content
}

Template.roomOverview.rendered = function() {
  this.subscribe('Rooms', function() {
    var rooms = []
    if(FlowRouter.getRouteName() == "admin") {
      rooms = Rooms.find()
    } else {
      rooms = Rooms.find({$or: [{visibility: "public"}, {editors: Meteor.userId()}]}) 
    }
    var elements = elementsForRooms(rooms.fetch())
    
    // assemble network diagram
    var cy = cytoscape({
      container: document.getElementById('cy'),
      boxSelectionEnabled: false,
      autounselectify: true,
      elements: elements,
      layout: {
        name: 'cose-bilkent'
      },
      ready: function(){
        window.cy = this;
      },
      style: cytoscape.stylesheet()
        .selector('node')
          .css({
            'shape': 'circle',
            'background-color': '#fff',
            'border-color': 'data(color)',
            'border-style': 'solid',
            'border-width': '0.6',
            'width': '25',
            'height': '25',
            'text-valign': "top",
            'color': 'data(color)',
            'text-margin-y': "-5",
            'font-family': "times",
            'font-weight': "normal",
            'font-size': "16",
            'content': 'data(displayName)'
          })
        .selector('edge')
          .css({
              'curve-style': 'bezier',
              'width': '0.6',
              'target-arrow-shape': 'triangle',
              'line-color': 'data(color)',
              'source-arrow-color': '#000',
              'target-arrow-color': 'data(color)'
          })
    })
  
    // add tooltips to nodes
    cy.elements().forEach(function(element) {
      element.qtip({
        content: tooltipContent(element.data("id")),
        position: {
          my: 'top center',
          at: 'bottom center',
          adjust: { y: 5 }
        },
        show: { effect: false },
        events: {
          render: function(event, api) {
            $(".enter-room").off("click")
            $(".enter-room").on("click", function() {
              api.hide()
              Session.set("displayMode", "play")
              Session.set("editorDisplay", false)
              movePlayerToRoom(element.data("name"), true)              
            })
          }
        },
        style: {
          classes: 'qtip-light qtip-rounded',
          width: 180,
          tip: {
            width: 10,
            height: 5
          }
        }
      });
    })
    
  })
}

Template.newRoomForm.events({  
  'click .autogenerate'(event) {
    Meteor.call('rooms.autogenerate', function(error, roomId) {
      if(error) {
        console.log(error)
      } else {
        if(roomId) {
          var room = Rooms.findOne({_id: roomId})
          if(room) {
            Session.set("displayMode", "play")
            Session.set("editorDisplay", true)
            movePlayerToRoom(room.name, true)      
          }
        }
      }
    })
  },
  'submit .new-room'(event) {
    event.preventDefault()
    var roomName = event.target.name.value
    if(roomName) {
      // case insensitive search for slug of name
      if(Rooms.findOne({"slug": {$regex: new RegExp(slugify(roomName), "i")}})) {         
        alert("Place name already taken, try another!")
      } else {
        Meteor.call('rooms.create', roomName, function(error, result) {
          if(error) {
            console.log(error)
          } else {
            Session.set("displayMode", "play")
            Session.set("editorDisplay", true)
            movePlayerToRoom(roomName, true)      
          }
        })
        event.target.name.value = ''
      }
    }
  }
})

// play

Template.play.rendered = function() {
  this.subscribe("Rooms", function() { 
    var room = null
    if(FlowRouter.getRouteName() == "enter") {
      room = Rooms.findOne({playUUID: FlowRouter.getParam("uuid")})
      if(room) {
        movePlayerToRoom(room.name)  
      } 
      
    } else if(FlowRouter.getRouteName() == "edit") {
        room = Rooms.findOne({editUUID: FlowRouter.getParam("uuid")})
        if(room) {
          Session.set("editorDisplay", true)
          movePlayerToRoom(room.name)  
        } 
    } else {
      if(FlowRouter.getRouteName() == "place" && FlowRouter.getParam("placeName")) {
        room = Rooms.findOne({slug: FlowRouter.getParam("placeName"), visibility: "public"})
        if(room) {
          if(currentRoom()) {
            if(currentRoom()._id != room._id) {
              console.log("in route place - moving player because she's not already there...")
              movePlayerToRoom(room.name)  
            }
          }
        } 
      } else {
        room = currentRoom()
      }  
    }
    if(room) {
      Meteor.subscribe("Log", function() {
        setupLogHandle("play", room)
      })     
    } else {
      console.log("room not found")
      FlowRouter.go("home")
    }
  })
}

Template.play.helpers({
  claimable() { return currentRoom() ? currentRoom().editors.length == 0 : false }
})

Template.play.events({
  'click .cancel-play-button'(event, template) {
    leaveEditorOrPlay()
  },
  'submit .play-form'(event, template) {
    event.preventDefault()
    if(currentRoom()) {
      submitCommand()
    }
  },
  'click .re-enter-room-button'(event, template) {
    console.log("re-enter-room-button pressed")
    $(template.find(".play-log")).html("")
    performRoomEntry(currentRoom())
  },
  'click .open-editor-button'() {
    Session.set("editorDisplay", true)
  }
})

Template.chatToggle.helpers({
  chatModeActive() { return Session.get("chatModeActive")? "disabled" : "" },
  actionModeActive() { return Session.get("chatModeActive")? "" : "disabled" },
  playerName() { 
    if(Meteor.user()) {
      return Meteor.user().profile.playerName
    } 
  }
})

Template.chatToggle.events({
  'click .chat-button'(event, template) {
    Session.set("chatModeActive", !Session.get("chatModeActive"))
  },
  "input .player-name"(event) {
    if(Meteor.userId()) {
      Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.playerName": event.target.value}})
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
cheatSheetEditor = null

Template.roomEditor.rendered = function() {
  var self = this
  self.subscribe("Rooms", function() {
    var room = null
    console.log("current route: " + FlowRouter.getRouteName())
    if(FlowRouter.getRouteName() == "edit") {
      room = Rooms.findOne({editUUID: FlowRouter.getParam("uuid")})
      console.log("room via edit link:")
      console.log(room)  
      if(room) {
        Session.set("displayMode", "edit")              
        movePlayerToRoom(room.name, true)
        console.log("current room object:")
        console.log(Session.get("currentRoomObject"))
      } else {
        console.log("place not found")
        FlowRouter.go("home")
      }
    } else {
      room = currentRoom()
    }
    if(room) {
      
      // reset script editors
      roomEditor = null
      roomEditor = CodeMirror.fromTextArea(self.find(".room-script"), {
        lineNumbers: false,
        readOnly: !(editAuthorized(room) || onSecretEditRoute()),
        mode: "javascript",
        theme: "ambiance"
      })
      cssEditor = null
      cssEditor = CodeMirror.fromTextArea(self.find(".room-css"), {
        lineNumbers: false,
        readOnly: !(editAuthorized(room) || onSecretEditRoute()),
      	mode: "css",
        theme: "base16-light"
      })
      
      // initialise input fields
      updateEditorFields(room)
      
      // track changes
      roomEditor.on("change", function() {
        if(Session.get("editorsReady")) {
          Session.set("scriptSaved", false)
        }
      })
      cssEditor.on("change", function() {
        if(Session.get("editorsReady")) {
          Session.set("scriptSaved", false)
        }
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
      cheatSheetEditor = CodeMirror(this, {
          value: $unescaped,
          mode: 'javascript',
          lineNumbers: false,
          readOnly: true,
          theme: "base16-light"
      });
  });
}

updateEditorFields = function(room) {
  Session.set("editorsReady", false)
  Session.set("useCoffeeScript", room.useCoffeeScript)
  Session.set("visibilitySelected", room.visibility ? room.visibility : "private")
  Session.set("sourceCodeSelected", room.sourceCode ? room.sourceCode : "open")
  Session.set("scriptSaved", true)
  
  if(roomEditor) {
    roomEditor.getDoc().setValue(room.script)
    roomEditor.refresh()
  }
  if(cssEditor) {
    if(room.css) {
      cssEditor.getDoc().setValue(room.css)
    } else {
      cssEditor.getDoc().setValue("")
    }
    cssEditor.refresh()  
  }
  Session.set("editorsReady", true)
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
            {value: "unlisted", label: "unlisted - players may only be moved here from other places"}, 
            {value: "public", label: "public - shows up in overview of public places"}]
  },
  'privatePlace': function() {
    return currentRoom() ? currentRoom().visibility == "private" : false
  },
  'publicPlace': function() {
    return currentRoom() ? currentRoom().visibility == "public" : false
  },
  'selectedVisibility': function() {
    return this.value == Session.get("visibilitySelected") ? "selected" : ""
  }, 
  'editURL': function() {
    return currentRoom() ? Meteor.absoluteUrl() + "edit/" + currentRoom().editUUID : ""
  },
  'enterURL': function() {
    return currentRoom() ? Meteor.absoluteUrl() + "enter/" + currentRoom().playUUID : ""
  },
  'myPlacesChecked': function() {
    var room = Session.get("currentRoomObject")
    if(room) {
      if(room.editors) {
        return room.editors.indexOf(Meteor.userId()) > -1 ? "checked" : ""
      }
    } 
    return ""
  },
  'sourceCodeOptions': function() {
    return [{value: "open", label: "open - players can see your source code"}, 
            {value: "closed", label: "closed - players cannot see your source code"}]
  },  
  'selectedSourceCode': function() {
    return this.value == Session.get("sourceCodeSelected") ? "selected" : ""
  }, 
  'showCSS': function() {
    return currentRoom() ? (currentRoom().css || editAuthorized(currentRoom()) || onSecretEditRoute()) : true
  },
  'hideSource': function() {
    return currentRoom() ? (currentRoom().sourceCode == "closed" && !editAuthorized(currentRoom()) && !onSecretEditRoute()) : false
  }
})
 
Template.roomEditor.events({
  'change .show-in-my-places'(event, template) {
    var newValue = true // default if editors isn't defined on the room
    if(currentRoom().editors) {
      newValue = !(currentRoom().editors.indexOf(Meteor.userId()) > -1)
    }
    if(newValue == true) {
      alert("Congratulations! You have claimed editing rights to this place. Others can only edit (and claim it) if they have the secret edit link.")
    }
    if(newValue == false) {
      if(!confirm("Do you really want to give up editing rights to this place? This cannot be undone.")) {
        $(template.find(".show-in-my-places")).prop('checked', true)
        return false
      }
    }
    roomEditor.setOption("readOnly", !newValue)
    cssEditor.setOption("readOnly", !newValue)
    Meteor.call("rooms.toggleEditor", currentRoom()._id, newValue)
    Session.set("currentRoomObject", currentRoom())
  },
  'input .author-input'(event, template) {
    Meteor.call('rooms.updateAuthor', currentRoom()._id, template.find(".author-input").value)
    Session.set("currentRoomObject", currentRoom())
  },  
  'input .description-input'(event, template) {
    Meteor.call('rooms.updateDescription', currentRoom()._id, template.find(".description-input").value)
    Session.set("currentRoomObject", currentRoom())
  },  
  'change .visibility-select'(event, template) {
    var newValue = $(event.target).val();
    Meteor.call('rooms.updateVisibility', currentRoom()._id, newValue)
    Session.set("visibilitySelected", newValue)
  },
  'change .source-code-select'(event, template) {
    var newValue = $(event.target).val();
    console.log("change source code to " + newValue)
    Meteor.call('rooms.updateSourceCode', currentRoom()._id, newValue)
    Session.set("sourceCodeSelected", newValue)
  },

  'click .close-editor-button'(event, template) {
    if(!Session.get("scriptSaved")) {
      if(confirm("Leave without saving? All changes will be lost.")) { Session.set("editorDisplay", false) }
    } else { Session.set("editorDisplay", false) }
  },
  'click .save-script-button'(event, template) {
    Session.set("scriptSaved", true)
    var id = currentRoom()._id
    Meteor.call('rooms.updateCss', id, cssEditor.getValue())
    Meteor.call('rooms.updateScript', id, roomEditor.getValue())
  },
  'click .remove-room-button'(event) {
    if(confirm("permanently remove this place?")) {
      Meteor.call('rooms.remove', currentRoom()._id)
      Session.set("displayMode", "overview")
    }
  },
  /* deprecated:
  'change .use-coffee-script'(event, template) {
    var newValue = !Session.get("useCoffeeScript")
    Session.set("useCoffeeScript", newValue)
    Session.set("scriptSaved", false)    
  },*/
  /*'click .new-play-uuid-button'() {
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
  }*/
}) 
  
Template.apiCheatSheet.helpers({
  'cheatSheetToggler': function() {
    return Session.get("cheatSheetOpen") ? "hide coding help" : "show coding help"
  }
})

Template.apiCheatSheet.events({
  'click .toggle-cheat-sheet'(event, template) {
    if(Session.get("cheatSheetOpen")) {
      $(template.find('.api-cheat-sheet-code')).hide()
      Session.set("cheatSheetOpen", false)
    } else {
      $(template.find('.api-cheat-sheet-code')).show()
      Session.set("cheatSheetOpen", true)
      cheatSheetEditor.refresh()
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
    console.log("moving player into place after direct call to route")
    Session.set("displayMode", mode)
    movePlayerToRoom(room.name, true)
  }
}

// submits user input to the rooms script
submitCommand = function(specialInput = null, chatmode) {
  if(chatmode == undefined) {
    chatmode = Session.get("chatModeActive")
  }
  //console.log(chatmode)
  if($('#command-input').val() || specialInput != null) {
    var input = specialInput ? specialInput : $('#command-input').val()    
    if(input) {
      //console.log("logging command " + input)
      Meteor.call("log.add", {type: "input", editing: Session.get("editorDisplay"), playerId: Meteor.userId(), roomId: currentRoom()._id, input: input, chatMode: chatmode})
      $('#command-input').val("")
    }
    var script = null
    if(Session.get("editorDisplay")) { // if in edit mode, use script from editor -> bug: takes old room script on room move
      if(roomEditor) {
        script = roomEditor.getValue()
      }
    } else {
      script = currentRoom().script  
    }
    if(script) {
      runRoomScript(input, script, currentRoom().useCoffeeScript, chatmode)          
    }
  }  
}

playerName = function(id) {
  var player = Meteor.users.findOne({_id: id})
  if(player) {
    if(player.profile.playerName) {
      return player.profile.playerName
    }    
  } else {
    return "Anonymous"
  }
}

// this is called when there is a new log item
onLogUpdate = function(entry) {
  //console.log(entry)
  var roomName = Rooms.findOne({_id: entry.roomId}).name

  /*if(entry.type == "input" && entry.playerId != Meteor.userId()) {
    logAction("[" + playerName(entry.playerId) + " typed '" + entry.input + "']")  
  }*/
  
  if(entry.type == "input" && entry.chatMode) {
    logAction(playerName(entry.playerId) + ": " + entry.input)      
  }
  
  if(entry.type == "output") {
    if(!entry.announce && entry.playerId == Meteor.userId()) {
      logAction(entry.output, false, entry.className)      
    } /*else {
        if(entry.input) {
          logAction("["+roomName+ " responded with:]")      
          logAction(entry.output, false, entry.className)      
        }
    }*/
    if(entry.announce && entry.playerId != Meteor.userId()) {
      logAction(entry.output, false, entry.className) 
    }
  }
  if(entry.type == "roomEnter") {
    if(entry.playerId == Meteor.userId()) {
      var log = currentLog()
      log.html("")
      console.log("[you are now in place " + roomName + "]")  
    } else {
      if(entry.roomId == currentRoom()._id) {
        logAction("[" + playerName(entry.playerId) + " is now also in " + roomName + "]")  
      }
    }    
  }
  if(entry.type == "roomLeave") {
    if(entry.roomId == currentRoom()._id && entry.playerId != Meteor.userId()) {
      logAction("[" + playerName(entry.playerId) + " has left" + (entry.destinationId ? " to " + Rooms.findOne({_id: entry.destinationId}).name : "") + "]")  
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
  return null
}

// move player to a new room
movePlayerToRoom = function(roomName, fromMenu=false) {
  console.log("attempting to move player to " + roomName)
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
    // option: here we could prevent actually entering the room in edit mode if we wanted that
    Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.arrivedFrom": currentRoom()}}) // arrived from room or null
    if(currentRoom()) {
      logRoomLeave(room._id)
    }
    if(Session.get("editorDisplay")) {
      updateEditorFields(room)
    }
    performRoomEntry(room)
  } else { 
    logAction("[error: place " + roomName + " not found - perhaps the author deleted it or set it to private]")
  }
}

performRoomEntry = function(room) {
  Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.currentRoom": room.name}});  
  console.log("setting currentRoomObject to:")
  Session.set("currentRoomObject", room)
  console.log(Session.get("currentRoomObject"))
    
  if(logReady) {
    redoEntry = false
    Meteor.call("log.add", {type: "roomEnter", editing: Session.get("editorDisplay"), playerId: Meteor.userId(), roomId: room._id})
    initPlayerRoomVariables(room.name)
    //console.log("initiating justArrived response from room script")
    submitCommand("") // init justArrived output with empty comamnd
  } else {
    //console.log("log not ready")
    redoEntry = true
  }
  
  //if were on regular play mode or if this room is different from edit or enter route we're on, change url
  if((FlowRouter.getRouteName() == "home" || FlowRouter.getRouteName() == "place")
    || (FlowRouter.getRouteName() == "edit" && FlowRouter.getParam("uuid") != room.editUUID)
    || (FlowRouter.getRouteName() == "enter" && FlowRouter.getParam("uuid") != room.playUUID) ){
      if(room.visibility == "public") {  //if it's public, use that
        FlowRouter.go("place", {placeName: room.slug})
      } else {
        FlowRouter.go("home") //otherwise reset url
      }
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
      Meteor.call("log.add", {type: "output", editing: Session.get("displayMode") == "edit", playerId: Meteor.userId(), roomId: currentRoom()._id, input: result.input, output: result.output, announce: result.announce, className: result.className})
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
    if(room.variables) {
      roomObject = room.variables
    }
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
  player.name = Meteor.user().profile.playerName

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
runRoomScript = function(inputString, roomScript, useCoffeeScript=false, chatMode=false) {  
  
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
      chatMode? createInput("") : createInput(inputString),
      chatMode? createInput(inputString) : createInput(""),  
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
  }, 5000)
  
}


// core interface functionality

currentLog = function() {
  return /*Session.get("displayMode") == "edit" ? $(".test-log") :*/ $(".play-log")
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
  setTimeout(function() { submitCommand(null, undefined); autoTyping = false; }, delay*(text.length+5))
}