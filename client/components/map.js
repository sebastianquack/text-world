Template.roomOverview.rendered = function() {
  this.subscribe('Rooms', function() {
    var rooms = []
    if(FlowRouter.getRouteName() == "admin") {
      rooms = Rooms.find()
    } else {
      if(FlowRouter.getRouteName() == "tag") {
        rooms = Rooms.find({$or: [{tags: FlowRouter.getParam("tag")}]})   
      } else {
        rooms = Rooms.find({$or: [{visibility: "public"}, {editors: Meteor.userId()}]}) 
      }
    }
    var elements = elementsForRooms(rooms.fetch())
    console.log(elements)
    
    // assemble network diagram
    var cy = cytoscape({
      container: document.getElementById('cy'),
      boxSelectionEnabled: false,
      autounselectify: true,
      elements: elements,
      layout: {
        name: 'cose-bilkent'
      },
      ready: function(){
        window.cy = this;
      },
      style: cytoscape.stylesheet()
        .selector('node')
          .css({
            'shape': 'circle',
            'background-color': '#fff',
            'border-color': 'data(color)',
            'border-style': 'solid',
            'border-width': '1.0',
            'width': '25',
            'height': '25',
            'text-valign': "top",
            'color': '#444',
            'text-margin-y': "-5",
            'font-family': "times",
            'font-weight': "100",
            'font-size': "16",
            'content': 'data(displayName)'
          })
        .selector('edge')
          .css({
              'curve-style': 'bezier',
              'width': '0.6',
              'target-arrow-shape': 'triangle',
              'line-color': 'data(color)',
              'source-arrow-color': '#000',
              'target-arrow-color': 'data(color)'
          })
    })
  
    // add tooltips to nodes
    cy.elements().forEach(function(element) {
      element.qtip({
        content: tooltipContent(element.data("id")),
        position: {
          my: 'top center',
          at: 'bottom center',
          adjust: { y: 5 }
        },
        show: { effect: false },
        events: {
          render: function(event, api) {
            $(".enter-room").off("click")
            $(".enter-room").on("click", function() {
              api.hide()
              Session.set("displayMode", "play")
              Session.set("editorDisplay", false)
              movePlayerToRoom(element.data("name"), true)              
            })
          }
        },
        style: {
          classes: 'qtip-light qtip-rounded',
          width: 180,
          tip: {
            width: 10,
            height: 5
          }
        }
      })
    })
  })
}

elementsForRooms = function(rooms) {
  var elements = {nodes: [], edges: []}
  for(var i=0;i<rooms.length;i++) {
    var color = "#000"
    if(rooms[i].editors) {
      if(rooms[i].editors.length == 0) {
        color = "#008000"
      }
    }
    if(rooms[i].visibility != "public") {
       color = "#ccc"
    } 
    if(editAuthorized(rooms[i])) {
      color = "#FFA500"
      if(rooms[i].visibility != "public") {
         color = "#AAD8E6"
      } 
    }
    elements.nodes.push({
      data: {
        id: rooms[i]._id, 
        name: rooms[i].name,
        displayName: rooms[i].name,
        color: color
      }
    })
    if(rooms[i].exits) {
      rooms[i].exits.forEach(function(exit) {
        var exitRoom = Rooms.findOne({_id: exit})
        if(findRoom(rooms, exitRoom)) {
          elements.edges.push({
            data: {
              source: rooms[i]._id,
              target: exit,
              color: color
            }
          })
        }          
      })
    }    
  }
  return elements
}

findRoom = function(rooms, one) {
  for(var i=0;i<rooms.length;i++) {
    if(rooms[i]._id == one._id) {
      return true
    }
  }
  return false
}

tooltipContent = function(roomId) {
  var room = Rooms.findOne({_id: roomId})
  if(!room) { return "error: room not found" }
  var content = ""
  content += room.name? "<h3>"+room.name+"</h3>" : ""
  content += room.description? "<p>"+room.description+"</p>" : ""
  content += room.author? "<p>by "+room.author+"</p>" : ""
  content += '<input class="enter-room" type="button" value="> enter">'
  return content
}

Template.newRoomForm.events({  
  'click .autogenerate'(event) {
    Meteor.call('rooms.autogenerate', getRouteTags(), function(error, roomId) {
      if(error) {
        console.log(error)
      } else {
        if(roomId) {
          var room = Rooms.findOne({_id: roomId})
          if(room) {
            Session.set("displayMode", "play")
            Session.set("editorDisplay", true)
            movePlayerToRoom(room.name, true)      
          }
        }
      }
    })
  },
  'submit .new-room'(event) {
    event.preventDefault()
    var roomName = event.target.name.value
    if(roomName) {
      // case insensitive search for slug of name
      if(Rooms.findOne({"slug": {$regex: new RegExp(slugify(roomName), "i")}})) {         
        alert("Place name already taken, try another!")
      } else {
        Meteor.call('rooms.create', roomName, getRouteTags(), function(error, result) {
          if(error) {
            console.log(error)
          } else {
            Session.set("displayMode", "play")
            Session.set("editorDisplay", true)
            movePlayerToRoom(roomName, true)      
          }
        })
        event.target.name.value = ''
      }
    }
  }
})
