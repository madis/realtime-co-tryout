
class Audience
  constructor: ->
    connection = 
      id: 'seminar'
      appKey: 'vBwwz0'
      authToken: 'ab6c4a31aff34644b892b435fabb3e6c'
      url: 'http://ortc-developers.realtime.co/server/2.1'
      channels: ['JohnnyBeGood']
      onMessage: (messageEvent) ->
        data = (xRTML.JSON.parse messageEvent.message).xrtml.d
        $('#title').text data.title
        $('#content').text data.content
        console.log 'WTF message = ', message