import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  // code to run on server at startup  
  AccountsGuest.anonymous = true
  
})

// default player setup
Accounts.onCreateUser(function(options, user) {
  // we keep the default hook's 'profile' behavior.
  if (options.profile) {
    user.profile = options.profile;
  }
  
  // todo: add initial settings of user.profile here
  user.profile.currentRoom = null

  return user;
});

