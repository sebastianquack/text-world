import { Template } from 'meteor/templating'
import './main.html'

// general template helpers

Template.registerHelper( 'overviewDisplay', () => { return !Session.get("displayMode") || Session.get("displayMode") == "overview" })
Template.registerHelper( 'adminRoute', () => { return FlowRouter.getRouteName() == "admin" })

Template.registerHelper( 'currentRoom', () => { return Session.get("currentRoomObject")})
Template.registerHelper( 'editAuthorized', () => { return editAuthorized(currentRoom()) || onSecretEditRoute() })
Template.registerHelper( 'unclaimed', () => { return unclaimedRoom(currentRoom()) || onSecretEditRoute() })
Template.registerHelper( 'claimable', () => { return currentRoom() ? currentRoom().editors.length == 0 : false })
Template.registerHelper( 'editAuthorizedOrUnclaimed', () => { return editAuthorizedOrUnclaimed(currentRoom()) || onSecretEditRoute() })

Template.registerHelper( 'editorDisplay', () => { return Session.get("editorDisplay") })
Template.registerHelper( 'showReEnterButton', () => { return Session.get("editorDisplay") && (editAuthorized(currentRoom()) || onSecretEditRoute()) })

// general subscriptions

Template.body.onCreated(function() {
  Meteor.subscribe('Log')
  Meteor.subscribe('Users')
})