ortcNodeclient = require('../real_time_node').IbtRealTimeSJNode

class RtsWrapper
  constructor: (subscriptions) ->    
    # Create ORTC client
    ortcClient = new ortcNodeclient()
    # Set ORTC client properties
    ortcClient.setId('clientId')
    ortcClient.setConnectionMetadata('clientConnMeta')
    ortcClient.setClusterUrl('http://ortc-developers.realtime.co/server/2.1/')
     
    ortcClient.onConnected = (ortc) ->
      # Connected
      console.log 'subscriptions : ', subscriptions
      for channel, handler of subscriptions 
        console.log 'doing', channel, handler
        do (channel, handler, ortcClient) ->
          ortcClient.subscribe channel, true, (ortc, channel, message) -> 
            try
              handler JSON.parse(message).xrtml.d
            catch error
              handler message
           
    ortcClient.onDisconnected = (ortc) -> console.log 'Disconnected'
     
    # ortcClient.onSubscribed = (ortc, channel) -> 
    #   # Subscribed to the channel 'channel')
    #   ortcClient.send(channel, 'Message to the channel')
     
    ortcClient.onUnsubscribed = (ortc, channel) ->
        #Unsubscribed from the channel 'channel')
        ortcClient.disconnect()
     
    ortcClient.onException = (ortc, exception) -> 
        # Exception occurred: 'exception'
     
    ortcClient.onReconnecting = (ortc) ->
        # Trying to reconnect
     
    ortcClient.onReconnected = (ortc) ->
        # Reconnected
     
    # Post permissions
    ortcClient.saveAuthentication 'http://ortc-developers.realtime.co/server/2.1/', true, 'ab6c4a31aff34644b892b435fabb3e6c', 0, 'vBwwz0', 1400, 'VyCuXBy2wK7k', { "channel1": "r", "channel2": "w" }, (error, success) ->
      if (error)
        console.log('Error saving authentication: ' + error)
      else if (success)
        console.log('Successfully authenticated');
        # client.connect('myApplicationKey', 'myAuthenticationToken');
        ortcClient.connect 'vBwwz0', 'ab6c4a31aff34644b892b435fabb3e6c'
      else
        console.log('Not authenticated');

module.exports = RtsWrapper
