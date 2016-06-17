Meteor.publish('Rooms', function() {
  return Rooms.find({})
})

Meteor.publish('Log', function() {
  return Log.find({})
})
