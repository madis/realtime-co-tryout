
window.Audience = class Audience
  constructor: ->
    @connection = 
      id: 'seminar'
      appKey: 'vBwwz0'
      authToken: 'ab6c4a31aff34644b892b435fabb3e6c'
      url: 'http://ortc-developers.realtime.co/server/2.1'
      channels: [{name: 'statistics'}, {name: 'chat'}]
      onMessage: (messageEvent) ->
        console.log 'audience got', messageEvent.channel
        if messageEvent.channel is 'chat'
          data = (xRTML.JSON.parse messageEvent.message).xrtml.d
          console.log 'got title, content', data
          $('#title').text data.title
          $('#content').text data.text
        else if messageEvent.channel is 'statistics'
          console.log 'there is the data for plot', messageEvent
          window.plot.setData JSON.parse(messageEvent.message)
    xRTML.ready =>
      xRTML.ConnectionManager.create @connection  
      console.log 'The audience is listening'

xdata = ->
  # ({y: letter, x: 0} for letter in [0..'abcdefghijklmnopqrstuvwxyz'.length])
  # ({y: letter, x: 0} for letter in 'abcdefghijklmnopqrstuvwxyz')
  ({y: letter, x: 0} for letter in [1..'abcdefghijklmnopqrstuvwxyz'.length])

jQuery ->
  window.audience = new Audience
  window.plot = Morris.Bar
    element: 'statistics'
    data: xdata()
    xkey: 'y'
    ykeys: ['x']
    labels: ['Series y']


  