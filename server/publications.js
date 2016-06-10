Meteor.publish('Rooms', function() {
  return Rooms.find({})
})
