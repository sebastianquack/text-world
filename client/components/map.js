cy = null

Template.roomOverview.rendered = function() {
  console.log("initial places subscription")
  this.subscribe('Rooms', function() {
    Session.set("roomsSubscribed", true)
    updatePlacesGraph()
  })    

}

updatePlacesGraph = function(callback = false) {  
  // do not proceed if database is not ready
  if(!Session.get("roomsSubscribed")) {
    return
  }

  var rooms = []
  if(FlowRouter.getRouteName() == "admin") {
    rooms = Rooms.find()
  } else {
    if(FlowRouter.getRouteName() == "tag") {
      rooms = Rooms.find({$or: [{tags: FlowRouter.getParam("tag")}]})   
    } else {
      if(Meteor.user()) {
        if(Meteor.user().profile.playerRoomVariables) {
          rooms = Rooms.find({$or: [{visibility: "public"}, {editors: Meteor.userId()}, {name: { $in: Object.keys(Meteor.user().profile.playerRoomVariables) }}]})   
        }
      } else {
        rooms = Rooms.find({$or: [{visibility: "public"}, {editors: Meteor.userId()}]})  
      }
    }
  }
  var elements = elementsForRooms(rooms.fetch())
  console.log(elements)

  loading_container = document.getElementById('cy_loading')
  $(loading_container).show()
  
  // assemble network diagram
  cy = cytoscape({
    container: document.getElementById('cy'),
    boxSelectionEnabled: false,
    autounselectify: true,
    autoungrabify: true,
    elements: elements,
    layout: {
      name: 'cose-bilkent',
      fit: false
    },
    zoom: 1,
    ready: function(){
      cy.center()
      window.cy = this;
      $(loading_container).hide()
      if (callback) callback()
    },
    style: cytoscape.stylesheet()
      .selector('node')
        .css({
          'shape': 'circle',
          'background-color': '#fff',
          'border-color': 'data(color)',
          'border-style': 'solid',
          'border-width': '1.0',
          'width': '8',
          'height': '8',
          'text-valign': "top",
          'color': '#fff',
          'text-margin-y': "-8",
          'font-family': "Roboto",
          'font-weight': "100",
          'font-size': "12",
          'content': 'data(displayName)',
          'text-events': 'yes'
        })
      .selector('.activeNode')
        .css({"color": "#ffff00", 'font-size': "19"})          
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
  cy.nodes().forEach(function(element) {
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
          console.log(element)
          $(".enter-room[data-room-id=\""+element.data("id")+"\"]").off("click")
          $(".enter-room[data-room-id=\""+element.data("id")+"\"]").on("click", function() {
            api.hide()
            Session.set("displayMode", "play")
            Session.set("editorDisplay", false)
            console.log(element.data("name"))
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

  cy.on('mouseover', 'node', { foo: 'bar' }, function(evt){
    $("#cy").addClass("clickable")
  });  
  cy.on('mouseout', 'node', { foo: 'bar' }, function(evt){
    $("#cy").removeClass("clickable")
  });  

}


elementsForRooms = function(rooms) {
  var elements = {nodes: [], edges: []}
  for(var i=0;i<rooms.length;i++) {
    var color = "#fff"
    if(rooms[i].editors) {
      if(rooms[i].editors.length == 0) {
        color = "#fff"
      }
    }
    if(rooms[i].visibility != "public") {
       color = "#fff"
    } 
    if(editAuthorized(rooms[i])) {
      color = "#fff"
      if(rooms[i].visibility != "public") {
         color = "#fff"
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
        if(exitRoom) {
          if(findRoom(rooms, exitRoom)) {
            elements.edges.push({
              data: {
                source: rooms[i]._id,
                target: exit,
                color: color
              }
            })
          }
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
  var buttonCode = '<input class="enter-room" data-room-id="'+roomId+'" type="button" value="> jump here">'
  if(room) {
    if(room.visibility == "public") {
      content += buttonCode
    } else {
      if(Meteor.userId() != undefined && room.editors.length) {
        if(room.editors.indexOf(Meteor.userId()) > -1)
        content += buttonCode
      } else {
        content += '<p><i>This is an unlisted place. You cannot jump here.</i></p>'  
      } 
      
    }
  }
  return content
}

panMapToPlace = function(place) {
  
  cy.ready(function() {

    cy.$("node").removeClass("activeNode")
    cy.$("#" + place._id).addClass("activeNode")
  
    console.log("panning to...")
    var element = cy.getElementById(place._id)
    console.log(element)

    var offsetX = $("#cy").width() / 10.0
    var offsetY = $("#cy").height() / 2.0
    cy.pan()
  
    cy.animate({
      pan: {x: -element.position().x + offsetX, y: -element.position().y + offsetY},
      zoom: 1
    }, {
      duration: 500
    })
    
  })
    
}
