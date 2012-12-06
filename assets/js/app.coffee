#= require bootstrap.js
#= require xrtml-custom-3.0-dev.js

xRTML.Config.debug = true
class Sender
  constructor: ->
    console.log 'Creating new Sender'
    connection = 
      id: 'seminar'
      appKey: 'vBwwz0'
      authToken: 'ab6c4a31aff34644b892b435fabb3e6c'
      url: 'http://localhost:3000/'
      channels: [{name: 'JohnnyBeGood'}]
    
    xRTML.ready ->
      xRTML.ConnectionManager.create connection

jQuery ->
  sender = new Sender
  $('#message').keyup (event) ->
    if event.keyCode == 13 # Enter was released
      message = $(@).val()
      $('#console').prepend "Sent: #{message}<br/>"
      $(@).val('')