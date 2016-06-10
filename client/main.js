import { Template } from 'meteor/templating'
import './main.html'

Template.rooms.onCreated(function() {
  Meteor.subscribe('Rooms')
})

Template.rooms.helpers({
  rooms() { return Rooms.find() }
})

Template.rooms.events({  
  'submit .new-room'(event) {
    event.preventDefault()
    Meteor.call('rooms.create', event.target.name.value)
    event.target.name.value = ''
  }
})

Template.room.helpers({
  formDisplay() { return Session.get("formDisplay") == this._id ? "" : "display-none" },
  optionsDisplay() { return Session.get("formDisplay") ? "hidden" : "" },
  editorOptions() { return {lineNumbers: true, mode: "javascript"} }
})

Template.room.rendered = function() {
  this.editor = CodeMirror.fromTextArea(this.find(".room-script"), {
    lineNumbers: true,
  	mode: "javascript" // set any of supported language modes here
  });
}
  
Template.room.events({
  'click .open-form-button'(event, template) {
    template.find(".test-input").value = ""
    template.find(".room-script").value = this.script
    $(template.find(".test-log")).html("")
    Session.set("formDisplay", this._id)
  },
  
  'click .cancel-button'(event, template) {
    Session.set("formDisplay", undefined)
  },

  'click .save-script-button'(event, template) {
    Meteor.call('rooms.updateScript', this._id, template.editor.getValue())
    Session.set("formDisplay", undefined)
  },
  
  'submit .test-room'(event, template) {
    event.preventDefault()
    var input = template.find(".test-input").value    
    template.find(".test-input").value = ""
    var testLog = $(template.find(".test-log"))
    testLog.append("<li>input: " + input + "</li>")
    testLog.scrollTop(testLog[0].scrollHeight)
    
    // setup untrusted code to be processed as jailed plugin
    var code = 
      "var api = {processInput: function(input, output) {" 
      + template.editor.getValue() +
      "}}; application.setInterface(api);"

    // create plugin
    var plugin = new jailed.DynamicPlugin(code)
    
    // called after the plugin is loaded
    plugin.whenConnected(function() {
      plugin.remote.processInput(input, function(output) {
        testLog.append("<li>output: " + output + "</li>")
        testLog.scrollTop(testLog[0].scrollHeight)
      })    
    })
  },

  'click .remove-room-button'(event) {
    if(confirm("permanently remove room?")) {
      Meteor.call('rooms.remove', this._id)
    }
  }
})


