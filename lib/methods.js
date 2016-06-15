Meteor.methods({

  'rooms.create'(name, script) {
    Rooms.insert({
      name: name,
      script: ""
    })
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
