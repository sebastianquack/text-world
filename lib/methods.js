// deny client setting themselves to admin
Meteor.users.deny({
  update: function(userId, doc, fieldNames, modifier) {
    if(modifier['$set']['profile.isAdmin']) {
      return true;
    }
    return false;
  }
});

// allows editing if there are no editors set, or if the current user is one of the set editors
editAuthorizedOrUnclaimed = function(room) {
  return unclaimedRoom(room) || editAuthorized(room)
}

// allows editing if there are no editors set, or if the current user is one of the set editors
// warning: this is still insecure because the secret edit urls of all rooms can be seen from the client
// todo: constrain publication of rooms to user with editing privileges + room from current route
editAuthorized = function(room) {
  if(!room) {
    return false
  }
  if(Meteor.user().profile.isAdmin) {
    return true
  }
  return room.editors? room.editors.indexOf(Meteor.userId()) > -1 : false
}

editAuthorizedId = function(roomId) {
  var room = Rooms.findOne({_id: roomId})  
  return room ? editAuthorized(room) : false
}

Meteor.methods({

  'rooms.create'(name, tags) {
    Rooms.insert({
      name: name,
      slug: slugify(name),
      script: "",
      css: "",
      visibility: "private",
      editUUID: generateUUID(),
      playUUID: generateUUID(),
      editors: [Meteor.userId()],
      sourceCode: "open",
      tags: tags
    })
  },
  
  'rooms.autogenerate'(tags=[]) {
    return autogenerateRoom(tags)
  },

  'rooms.resetPlayUUID'(id) {
    if(editAuthorizedId(id)) {
      Rooms.update(id, { $set: { 
        playUUID: generateUUID()
      }})    
    }
  },
  
  'rooms.resetEditUUID'(id) {
    if(editAuthorizedId(id)) {
      var newUUID = generateUUID()
      Rooms.update(id, { $set: { 
        editUUID: newUUID
      }})
      return newUUID
    }
  },
  
  'rooms.toggleEditor'(id, add) {
    var editors = Rooms.findOne({_id: id}).editors
    if(add) {
      if(!editors) {
        editors = []
      }
      editors.push(Meteor.userId())
    } else {
      var index = editors.indexOf(Meteor.userId());
      if(index > -1) {
        editors.splice(index, 1)
      }
    }
    Rooms.update(id, { $set: { 
      editors: editors
    }})      
  },
  
  'rooms.updateScript'(id, script) {
    if(editAuthorizedId(id)) {
      Rooms.update(id, { $set: { 
        script: script,
        exits: findExits(script)  
      }})
    }
  },
  
  'rooms.updateCss'(id, css) {
    if(editAuthorizedId(id)) {
      var room = Rooms.findOne({_id: id})
      Rooms.update(id, { $set: { 
        css: css
      }})
    }
  },
    
  'rooms.updateAuthor'(id, author) {
    if(editAuthorizedId(id)) {
      var room = Rooms.findOne({_id: id})
      Rooms.update(id, { $set: { 
        author: author
      }})
    }
  },

  'rooms.updateDescription'(id, description) {
    if(editAuthorizedId(id)) {
      var room = Rooms.findOne({_id: id})
      Rooms.update(id, { $set: { 
        description: description
      }})
    }
  },

  'rooms.updateVisibility'(id, visibility) {
    if(editAuthorizedId(id)) {
      var room = Rooms.findOne({_id: id})
      Rooms.update(id, { $set: { 
        visibility: visibility
      }})
    }
  },

  'rooms.updateSourceCode'(id, sourceCodeOption) {
    if(editAuthorizedId(id)) {
      var room = Rooms.findOne({_id: id})
      Rooms.update(id, { $set: { 
        sourceCode: sourceCodeOption
      }})
    }
  },
  
  'rooms.addTag'(id, tag) {
    if(editAuthorizedId(id) && tag) {
      var room = Rooms.findOne({_id: id})
      var tags = room.tags
      if(!tags) {
        tags = []
      }
      tag = tag.toLowerCase().trim()
      if(tags.indexOf(tag) == -1) {
        tags.push(tag)
        Rooms.update(id, { $set: { 
          tags: tags
        }})
      }
    }
  },
  
  'rooms.removeTag'(id, tag) {
    if(editAuthorizedId(id) && tag) {
      var room = Rooms.findOne({_id: id})
      var tags = room.tags
      if(!tags) {
        tags = []
      }
      tag = tag.toLowerCase().trim()
      var index = tags.indexOf(tag)
      if(index > -1) {
        tags.splice(index, 1)
        Rooms.update(id, { $set: { 
          tags: tags
        }})
      }
    }
  },
  
  'rooms.remove'(id) {
    if(editAuthorizedId(id)) {
      Rooms.remove({_id: id})
    }
  },
  
  'rooms.setRoomVar'(id, varName, value) {
    var room = Rooms.findOne({_id: id})
    var variables = room.variables
    if(!variables) {
      variables = {}
    }
    variables[varName] = value
    Rooms.update({_id: room._id}, {$set: {"variables": variables}})
  },
  
  'log.add'(data) {
    data.date = new Date()
    Log.insert(data)
  },
  
  'logoutAdmin'() {
    Meteor.users.update(Meteor.userId(), {$set: {'profile.isAdmin': false}})
  },
  
  'authorizeAdmin'(pw) {
    if(pw == process.env.adminRoute) {
      Meteor.users.update(Meteor.userId(), {$set: {'profile.isAdmin': true}})
      return "ok"
    } else {
      return "wrong password"
    }
  }
})
