
window.Audience = class Audience
  constructor: ->
    @connection = 
      id: 'seminar'
      appKey: 'vBwwz0'
      authToken: 'ab6c4a31aff34644b892b435fabb3e6c'
      url: 'http://ortc-developers.realtime.co/server/2.1'
      channels: [{name: 'JohnnyBeGood'}]
      onMessage: (messageEvent) ->
        data = (xRTML.JSON.parse messageEvent.message).xrtml.d
        console.log 'got title, content', data
        $('#title').text data.title
        $('#content').text data.text
    xRTML.ready =>
      xRTML.ConnectionManager.create @connection  
      console.log 'The audience is listening'
    
jQuery ->
  window.audience = new Audience
  
  