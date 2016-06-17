Meteor.methods({

  'rooms.create'(name, script) {
    Rooms.insert({
      name: name,
      script: "",
      visibility: "private",
      editUUID: generateUUID(),
      playUUID: generateUUID(),
      editors: [Meteor.userId()]
    })
  },

  'rooms.resetPlayUUID'(id) {
    Rooms.update(id, { $set: { 
      playUUID: generateUUID()
    }})    
  },
  
  'rooms.resetEditUUID'(id) {
    Rooms.update(id, { $set: { 
      editUUID: generateUUID()
    }})    
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
    Rooms.update(id, { $set: { 
      script: script  
    }})
  },
  
  'rooms.setCoffeeScript'(id, value) {
    Rooms.update(id, { $set: { 
      useCoffeeScript: value
    }})
  },
  
  'rooms.updateMeta'(id, author, description, visibility, css, useCoffeeScript) {
    Rooms.update(id, { $set: { 
      author: author,
      description: description,
      visibility: visibility,
      css: css,
      useCoffeeScript: useCoffeeScript,
    }})
  },
  
  'rooms.remove'(id) {
    Rooms.remove({_id: id})
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


})
