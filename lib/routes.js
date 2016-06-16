FlowRouter.route('/', {
    name: 'home',
    action: function() {
      BlazeLayout.render('welcome');
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
