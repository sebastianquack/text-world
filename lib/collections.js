Rooms = new Mongo.Collection('Rooms')
Log = new Mongo.Collection('Log')

generateUUID = function() {
  var d = new Date().getTime()
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random()*16)%16 | 0;
      d = Math.floor(d/16);
      return (c=='x' ? r : (r&0x3|0x8)).toString(16);
  })
  return uuid
}

slugify = function(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

unclaimedRoom = function(room) {
  if(!room) {
    return false
  }
  if(!room.editors) {
    return true
  }
  if(room.editors.length == 0) {
    return true
  }
  return false
}

findExits = function(script) {
  var re = /player\.moveTo\(\"(.+)\"\)/g; 
  var m;
  var exits = []
   
  do {
      m = re.exec(script);
      if(m) {
        var room = Rooms.findOne({name: m[1]})
        if(room) {
          exits.push(room._id)          
        }
      }
  } while(m);
  
  return exits
}

