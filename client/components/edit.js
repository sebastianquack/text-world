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
        lineNumbers: true,
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
  'submit .add-tag'(event, template) {
    event.preventDefault()
    Meteor.call('rooms.addTag', currentRoom()._id, event.target.tag.value)
    event.target.tag.value = ""
    Session.set("currentRoomObject", currentRoom())
  },
  'click .remove-tag'(event, template) {
    event.preventDefault()
    Meteor.call('rooms.removeTag', currentRoom()._id, this.toString())
    Session.set("currentRoomObject", currentRoom())
  },
  'click .close-editor-button'(event, template) {
    if(!Session.get("scriptSaved")) {
      if(confirm("Leave without saving? All changes will be lost.")) { Session.set("editorDisplay", false) }
    } else { Session.set("editorDisplay", false) }
  },
  'click .save-script-button'(event, template) {
    Session.set("scriptSaved", true)
    var id = currentRoom()._id
    var oldExits = currentRoom().exits
    var newScript = roomEditor.getValue()
    
    Meteor.call('rooms.updateCss', id, cssEditor.getValue())
    Meteor.call('rooms.updateScript', id, newScript)
    
    if(findExits(newScript) != oldExits) {
      updatePlacesGraph()
    }
        
  },
  'click .remove-room-button'(event) {
    if(confirm("permanently remove this place?")) {
      Meteor.call('rooms.remove', currentRoom()._id)
      Session.set("displayMode", "overview")
    }
  },
}) 
  
Template.apiCheatSheet.helpers({
  'cheatSheetToggler': function() {
    return Session.get("cheatSheetOpen") ? "hide reference" : "show reference"
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