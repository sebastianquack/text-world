Meteor.publish('Rooms', function() {
  return Rooms.find({})
})

Meteor.publish('Log', function() {
  return Log.find({})
})

Meteor.publish('Users', function() {
  return Meteor.users.find({}, {"profile": 1})
})