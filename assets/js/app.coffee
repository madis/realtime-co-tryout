#= require bootstrap.js
#= require xrtml-custom-3.0-dev.js

xRTML.Config.debug = true
window.Sender = class Sender
  constructor: ->
    console.log 'Creating new Sender'
    connection = 
      id: 'seminar'
      appKey: 'vBwwz0'
      authToken: 'ab6c4a31aff34644b892b435fabb3e6c'
      url: 'http://ortc-developers.realtime.co/server/2.1'
      channels: [{name: 'JohnnyBeGood'}]
    
    xRTML.ready ->
      xRTML.ConnectionManager.create connection

  send: (message) ->
    messageTemplate = 
      trigger: 'myTrigger'
      action: ''
      data: 
        title: 'Great news everybody'
        text: message
    
    rtmlMessage = xRTML.MessageManager.create messageTemplate
    xRTML.ConnectionManager.sendMessage 
      connections: ['seminar']
      channel: 'JohnnyBeGood'
      content: rtmlMessage

    $('#console').prepend "Sent: #{message}<br/>"
