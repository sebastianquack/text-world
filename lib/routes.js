FlowRouter.route('/', {
  name: 'home',
  action: function() {
    BlazeLayout.render('welcome');
  }
});

FlowRouter.route('/:placeName', {
    name: 'place',
    action: function(params) {
      if(params.placeName == "edit") {
        FlowRouter.go("edit", {uuid: params.placeName})
      }
      else if(params.placeName == "enter") {
        FlowRouter.go("enter", {uuid: params.placeName})
      }
      BlazeLayout.render('play', params);          
    }
});

FlowRouter.route('/edit/:uuid', {
    name: 'edit',
    action: function(params) {
        BlazeLayout.render('roomEditor', params);
    }
});

FlowRouter.route('/enter/:uuid', {
    name: 'enter',
    action: function(params) {
        BlazeLayout.render('play', params);
    }
});
