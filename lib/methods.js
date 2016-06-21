// deny client setting themselves to admin
Meteor.users.deny({
  update: function(userId, doc, fieldNames, modifier) {
    if(modifier['$set']['profile.isAdmin']) {
      return true;
    }
    return false;
  }
});

authorizeRoomEdit = function(roomId) {
  if(Meteor.user().profile.isAdmin) {
    return true
  }
  var room = Rooms.findOne({_id: roomId})
  if(room) {
    // warning: this is still insecure because the secret edit urls of all rooms can be seen from the client
    // todo: constrain publication of rooms to user with editing privileges + room from current route
    return room.editors? room.editors.indexOf(Meteor.userId()) > -1 : false    
  }
  return false
}


Meteor.methods({

  'rooms.create'(name, script) {
    Rooms.insert({
      name: name,
      slug: slugify(name),
      script: "",
      visibility: "private",
      editUUID: generateUUID(),
      playUUID: generateUUID(),
      editors: [Meteor.userId()]
    })
  },

  'rooms.resetPlayUUID'(id) {
    if(authorizeRoomEdit(id)) {
      Rooms.update(id, { $set: { 
        playUUID: generateUUID()
      }})    
    }
  },
  
  'rooms.resetEditUUID'(id) {
    if(authorizeRoomEdit(id)) {
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
    if(authorizeRoomEdit(id)) {
      Rooms.update(id, { $set: { 
        script: script  
      }})
    }
  },
  
  'rooms.setCoffeeScript'(id, value) {
    if(authorizeRoomEdit(id)) {
      Rooms.update(id, { $set: { 
        useCoffeeScript: value
      }})
    }
  },
  
  'rooms.updateMeta'(id, author, description, visibility, css, useCoffeeScript) {
    if(authorizeRoomEdit(id)) {
      var room = Rooms.findOne({_id: id})
      if(!room.slug) {
        Rooms.update(id, { $set: { 
          slug: slugify(room.name)
        }})
      }
      Rooms.update(id, { $set: { 
        author: author,
        description: description,
        visibility: visibility,
        css: css,
        useCoffeeScript: useCoffeeScript,
      }})
    }
  },
  
  'rooms.remove'(id) {
    if(authorizeRoomEdit(id)) {
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
