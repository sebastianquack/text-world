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
  
  'rooms.remove'(id) {
    Rooms.remove({_id: id})
  }
  

})
