var WebSocket = require('ws');
var request = require('request');
var strings = require('./strings');
var IbtRealtimeRestServices = require('./IbtRealtimeRestServices');

/**********************************************************
* API IbtRealTimeSJNode.js
***********************************************************/

exports = module.exports = IbtRealTimeSJNode;

/*
* Initializes a new instance of the IbtRealTimeSJNode class.
*/
function IbtRealTimeSJNode() {

    /***********************************************************
    * @attributes 
    ***********************************************************/

    var appKey;                     // application key
    var authToken;                  // authentication token
    var clusterUrl;                 // cluster URL to connect
    var connectionTimeout;          // connection timeout in milliseconds
    var messageMaxSize;             // message maximum size in bytes
    var channelMaxSize;             // channel maximum size in bytes
    var messagesBuffer;             // buffer to hold the message parts
    var id;                         // object identifier
    var isConnected;                // indicates whether the client object is connected
    var isConnecting;               // indicates whether the client object is connecting
    var alreadyConnectedFirstTime;  // indicates whether the client already connected for the first time
    var stopReconnecting;           // indicates whether the user disconnected (stop the reconnecting proccess)
    var ortc;                       // represents the object itself
    var reconnectIntervalId;        // id used for the reconnect interval
    var sockjs;                     // socket connected to
    var url;                        // URL to connect
    var userPerms;                  // user permissions
    var connectionMetadata;         // connection metadata used to identify the client
    var announcementSubChannel;     // announcement subchannel
    var subscribedChannels;         // subscribed/subscribing channels
    var multiPartQueue;             // queue to send multi part messages
    var lastKeepAlive;              // holds the time of the last keep alive received
    var invalidConnection;          // indicates whether the connection is valid
    var reconnectStartedAt;         // the time which the reconnect started
    var eventEmitter;               // event emitter to send message

    /***********************************************************
    * @attributes initialization
    ***********************************************************/

    connectionTimeout = 5000;
    messageMaxSize = 800;
    channelMaxSize = 100;
    messagesBuffer = Object.create(null);
    subscribedChannels = Object.create(null);
    multiPartQueue = [];
    isConnected = false;
    isConnecting = false;
    alreadyConnectedFirstTime = false;
    invalidConnection = false;
    ortc = this;
    lastKeepAlive = null;
    userPerms = null;
    reconnectStartedAt = null;
    
    this.eventEmitter = new process.EventEmitter();

    /***********************************************************
    * @properties
    ***********************************************************/

    this.getId = function () { return id; };
    this.setId = function (newId) { id = newId; };

    this.getUrl = function () { return url; };
    this.setUrl = function (newUrl) { url = treatUrl(newUrl); clusterUrl = null; };

    this.getClusterUrl = function () { return clusterUrl; };
    this.setClusterUrl = function (newUrl) { clusterUrl = treatUrl(newUrl); url = null; };

    this.getConnectionTimeout = function () { return connectionTimeout; };
    this.setConnectionTimeout = function (newTimeout) { connectionTimeout = newTimeout; };

    this.getIsConnected = function () { return isConnected && ortc.sockjs != null; };

    this.getConnectionMetadata = function () { return connectionMetadata; };
    this.setConnectionMetadata = function (newConnectionMetadata) { connectionMetadata = newConnectionMetadata; };

    this.getAnnouncementSubChannel = function () { return announcementSubChannel; };
    this.setAnnouncementSubChannel = function (newAnnouncementSubChannel) { announcementSubChannel = newAnnouncementSubChannel; };

    /***********************************************************
    * @events
    ***********************************************************/

    this.onConnected = null;
    this.onDisconnected = null;
    this.onSubscribed = null;
    this.onUnsubscribed = null;
    this.onException = null;
    this.onReconnecting = null;
    this.onReconnected = null;

    /***********************************************************
    * @public methods
    ***********************************************************/

    /*
    * Connects to the gateway with the application key and authentication token.
    */
    this.connect = function (appKey, authToken) {
        /*
        Sanity Checks
        */
        if (!url && !clusterUrl) {
            delegateExceptionCallback(ortc, 'URL and Cluster URL are null or empty');
        }
        else if (!appKey) {
            delegateExceptionCallback(ortc, 'Application key is null or empty');
        }
        else if (!authToken) {
            delegateExceptionCallback(ortc, 'Authentication Token is null or empty');
        }
        else if (isConnected) {
            delegateExceptionCallback(ortc, 'The object is already connected');
        }
        else if (connectionMetadata != null && connectionMetadata.length > 256) {
            delegateExceptionCallback(ortc, 'Connection metadata max length is 256.');
        }
        else {
            ortc.appKey = appKey;
            ortc.authToken = authToken;

            isConnecting = true;
            stopReconnecting = false;

            if (clusterUrl && clusterUrl != null) {
                clusterConnection(clusterUrl);
            }
            else {
                ortc.sockjs = createSocketConnection(url);
            }

            if (!ortc.reconnectIntervalId) {
                // Interval to reconnect
                ortc.reconnectIntervalId = setInterval(function () {
                    if (stopReconnecting) {
                        // Clear the reconnecting interval
                        clearInterval(ortc.reconnectIntervalId);

                        ortc.reconnectIntervalId = null;
                    }
                    else {
                        var currentDateTime = new Date();

                        if (isConnecting) {
                            ortc.sockjs = null;
                            reconnectSocket();
                        }

                        // 35 seconds
                        if (lastKeepAlive != null && (lastKeepAlive + 35000 < new Date().getTime())) {
                            lastKeepAlive = null;

                            // Server went down
                            if (isConnected) {
                                disconnectSocket();
                            }
                        }
                    }
                }, ortc.getConnectionTimeout());
            }
        }
    };

    /*
    * Subscribes to the channel so the client object can receive all messages sent to it by other clients.
    */
    this.subscribe = function (channel, subscribeOnReconnected, onMessageCallback) {
        /*
        Sanity Checks
        */
        if (!channel) {
            delegateExceptionCallback(ortc, 'Channel is null or empty');
        }
        else if (!isConnected) {
            delegateExceptionCallback(ortc, 'The object is not connected');
        }
        else if (subscribedChannels[channel] && subscribedChannels[channel].isSubscribing) {
            delegateExceptionCallback(ortc, 'Already subscribing to the channel ' + channel);
        }
        else if (subscribedChannels[channel] && subscribedChannels[channel].isSubscribed) {
            delegateExceptionCallback(ortc, 'Already subscribed to the channel ' + channel);
        }
        else if (channel.length > channelMaxSize) {
            delegateExceptionCallback(ortc, 'Channel size exceeds the limit');
        }
        else {
            if (ortc.sockjs != null) {
                var domainChannelCharacterIndex = channel.indexOf(':');
                var channelToValidate = channel;
                var hashPerm = null;

                if (domainChannelCharacterIndex > 0) {
                    channelToValidate = channel.substring(0, domainChannelCharacterIndex + 1) + '*';
                }

                if (userPerms && userPerms != null) {
                    hashPerm = userPerms[channelToValidate] ? userPerms[channelToValidate] : userPerms[channel];
                }

                if (userPerms && userPerms != null && !hashPerm) {
                    delegateExceptionCallback(ortc, 'No permission found to subscribe to the channel');
                }
                else {
                    if (subscribedChannels[channel]) {
                        subscribedChannels[channel]['isSubscribing'] = true;
                        subscribedChannels[channel]['isSubscribed'] = false;
                        subscribedChannels[channel]['subscribeOnReconnected'] = subscribeOnReconnected;
                        subscribedChannels[channel]['onMessageCallback'] = onMessageCallback;
                    }
                    else {
                        subscribedChannels[channel] = { 'isSubscribing': true, 'isSubscribed': false, 'subscribeOnReconnected': subscribeOnReconnected, 'onMessageCallback': onMessageCallback };
                    }

                    sendToSocket({ 'op': 'subscribe', 'ak': ortc.appKey, 'at': ortc.authToken, 'ch': channel, 'p': hashPerm });
                }
            }
        }
    };

    /*
    * Unsubscribes from the channel so the client object stops receiving messages sent to it.
    */
    this.unsubscribe = function (channel) {
        /*
        Sanity Checks
        */
        if (!channel) {
            delegateExceptionCallback(ortc, 'Channel is null or empty');
        }
        else if (!isConnected) {
            delegateExceptionCallback(ortc, 'The object is not connected');
        }
        else if (!subscribedChannels[channel] || (subscribedChannels[channel] && !subscribedChannels[channel].isSubscribed)) {
            delegateExceptionCallback(ortc, 'The object is not subscribed to the channel ' + channel);
        }
        else if (channel.length > channelMaxSize) {
            delegateExceptionCallback(ortc, 'Channel size exceeds the limit');
        }
        else {
            if (ortc.sockjs != null) {
                sendToSocket({ 'op': 'unsubscribe', 'ak': ortc.appKey, 'ch': channel });
            }
        }
    };

    /*
    * Sends the message to the channel.
    */
    this.send = function (channel, message) {
        /*
        Sanity Checks
        */
        if (!channel) {
            delegateExceptionCallback(ortc, 'Channel is null or empty');
        }
        else if (!isConnected) {
            delegateExceptionCallback(ortc, 'The object is not connected');
        }
        else if (typeof (message) != 'string') {
            delegateExceptionCallback(ortc, 'The message to send must be a string');
        }
        else if (ortc.sockjs == null) {
            delegateExceptionCallback(ortc, 'The socket connection is null');
        }
        else if (channel.length > channelMaxSize) {
            delegateExceptionCallback(ortc, 'Channel size exceeds the limit');
        }
        else {
            var domainChannelCharacterIndex = channel.indexOf(':');
            var channelToValidate = channel;
            var hashPerm = null;

            if (domainChannelCharacterIndex > 0) {
                channelToValidate = channel.substring(0, domainChannelCharacterIndex + 1) + '*';
            }

            if (userPerms && userPerms != null) {
                hashPerm = userPerms[channelToValidate] ? userPerms[channelToValidate] : userPerms[channel];
            }

            if (userPerms && userPerms != null && !hashPerm) {
                delegateExceptionCallback(ortc, 'No permission found to send to the channel');
            }
            else {
                // Multi part
                var messageParts = [];
                var messageId = generateMessageId();
                var i;
                var allowedMaxSize = messageMaxSize - channel.length;

                for (i = 0; i < message.length; i = i + allowedMaxSize) {
                    // Just one part
                    if (message.length <= allowedMaxSize) {
                        messageParts.push(message);
                        break;
                    }

                    if (message.substring(i, i + allowedMaxSize)) {
                        messageParts.push(message.substring(i, i + allowedMaxSize));
                    }
                }

                if (messageParts.length == 1) {
                    sendToSocket({ 'op': 'send', 'ak': ortc.appKey, 'at': ortc.authToken, 'ch': channel, 'm': messageParts[0], 'p': hashPerm, 'i': messageId + '_1-' + messageParts.length });
                }
                else {
                    for (var i = 1; i <= messageParts.length; i++) {
                        // Emit event to send the message at process.nextTick
                        ortc.eventEmitter.emit('sendMultiPartMessage', { 'op': 'send', 'ak': ortc.appKey, 'at': ortc.authToken, 'ch': channel, 'm': messageParts[i - 1], 'p': hashPerm, 'i': messageId + '_' + i + '-' + messageParts.length });
                    }
                }
            }
        }
    };

    /*
    * Disconnects from the gateway.
    */
    this.disconnect = function () {
        // Clear the reconnecting interval
        if (ortc.reconnectIntervalId) {
            clearInterval(ortc.reconnectIntervalId);

            ortc.reconnectIntervalId = null;
        }

        // Stop the reconnecting process
        stopReconnecting = true;
        alreadyConnectedFirstTime = false;

        // Clear subscribed channels
        subscribedChannels = Object.create(null);

        /*
        Sanity Checks
        */
        if (!isConnected && !invalidConnection) {
            delegateExceptionCallback(ortc, 'The object is not connected');
        }
        else {
            disconnectSocket();
        }
    };

    /*
    * Gets a value indicating whether this client object is subscribed to the channel.
    */
    this.isSubscribed = function (channel) {
        if (subscribedChannels[channel] && subscribedChannels[channel].isSubscribed) {
            return subscribedChannels[channel].isSubscribed;
        }
        else {
            return false;
        }
    };   
	
    /*
    * Post the authentication data for a specified token
    */
    this.saveAuthentication = function (url, isCluster, authenticationToken, authenticationTokenIsPrivate, applicationKey, timeToLive, privateKey, permissions, callback) {
        var connectionUrl = url;

        if (isCluster) {
            getServerFromCluster(connectionUrl, function (error, body) {
                if (error != null) {
                    delegateExceptionCallback(ortc, 'Error getting server from Cluster');
                }
                else {
                    connectionUrl = body.substring(body.indexOf('=') + 3, body.length - 2);
                    IbtRealtimeRestServices.saveAuthentication(connectionUrl, authenticationToken, authenticationTokenIsPrivate, applicationKey, timeToLive, privateKey, permissions, callback);
                }
            });
        } else {
            IbtRealtimeRestServices.saveAuthentication(connectionUrl, authenticationToken, authenticationTokenIsPrivate, applicationKey, timeToLive, privateKey, permissions, callback);
        }
    };

    /***********************************************************
    * @private methods
    ***********************************************************/

    var treatUrl = function (url) {
        url = url.replace(/^\s+|\s+$/g, '');

        if (url.charAt(url.length - 1) == '/') {
            url = url.substring(0, url.length - 1);
        }

        return url;
    };

    var generateMessageId = function () {
        var S4 = function () {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        };

        return (S4() + S4());
    };

    var disconnectSocket = function () {
        reconnectStartedAt = null;
        isConnecting = false;

        if (ortc.sockjs != null) {
            ortc.sockjs.close();
            ortc.sockjs = null;
        }
    };

    var reconnectSocket = function () {
        if (isConnecting) {
            delegateExceptionCallback(ortc, 'Could not connect. Check if the server is running correctly.');
        }

        isConnecting = true;

        delegateReconnectingCallback(ortc);

        reconnectStartedAt = new Date().getTime();

        if (clusterUrl && clusterUrl != null) {
            clusterConnection(clusterUrl);
        }
        else {
            ortc.sockjs = createSocketConnection(url);
        }
    };

    /*
    * Tries a connection through the cluster gateway with the application key and authentication token.
    */
    var clusterConnection = function (clusterUrl) {
        var guid = strings.generateGuid();

        if (clusterUrl != null) {
            getServerFromCluster(clusterUrl, function (error, body) {
                if (error != null) {
                    delegateExceptionCallback(ortc, 'Error getting server from Cluster');
                }
                else {
                    if (body.indexOf('SOCKET_SERVER') >= 0) {
                        url = body.substring(body.indexOf('=') + 3, body.length - 2);
                        sockjs = createSocketConnection(ortc.getUrl());
                    }
                }
            });
        }
    };

    /*
    * Gets server from the cluster.
    */
    var getServerFromCluster = function (clusterUri, callback) {
        request({ uri: clusterUri }, function (error, response, body) {
            if (error != null) {
                callback(error, null);
            }
            else {
                callback(null, body);
            }
        });
    };

    /*
    * Validate connection.
    */
    var validateConnection = function (ortc, appKey, authToken) {
        sendToSocket({ 'op': 'validate', 'ak': appKey, 'at': authToken, 'cm': connectionMetadata, 'asc': announcementSubChannel });
    };

    /*
    * Creates a socket connection.
    */
    var createSocketConnection = function (connectionUrl) {
        if (ortc.sockjs == null) {
            var wsScheme = 'ws';
            var wsUrl = connectionUrl;

            if (connectionUrl.substring(0, 7) == 'http://') {
                wsUrl = wsUrl.substring(7);
            }
            else if (connectionUrl.substring(0, 8) == 'https://') {
                wsUrl = wsUrl.substring(8);
                wsScheme = 'wss';
            }

            var connid = strings.random_string(8);
            var serverId = strings.random_number_string(1000);
            ortc.sockjs = new WebSocket(wsScheme + '://' + wsUrl + '/broadcast/' + serverId + '/' + connid + '/websocket');

            // Connect handler
            ortc.sockjs.onopen = function () {
                // Update last keep alive time
                lastKeepAlive = new Date().getTime();

                validateConnection(ortc, ortc.appKey, ortc.authToken);
            };

            // Disconnect handler
            ortc.sockjs.onclose = function (e) {
                if (isConnected) {
                    isConnected = false;
                    isConnecting = false;

                    delegateDisconnectedCallback(ortc);
                }

                if (!stopReconnecting) {
                    if (!reconnectStartedAt || (reconnectStartedAt + connectionTimeout < new Date().getTime())) {
                        reconnectSocket();
                    }
                }
            };

            // Error handler (when connecting to an non existent server)
            ortc.sockjs.onerror = function () {
            };

            // Receive handler
            ortc.sockjs.onmessage = function (m) {
                // Update last keep alive time
                lastKeepAlive = new Date().getTime();

                var messageType = m.data[0];

                switch (messageType) {
                    case 'o': // open
                        break;
                    case 'a': // message
                        var data = JSON.parse(JSON.parse(m.data.substring(1))[0]);
                        var op = data.op;

                        switch (op) {
                            case 'ortc-validated':
                                if (data.up) {
                                    userPerms = data.up; // user permissions
                                }

                                isConnecting = false;
                                isConnected = true;
                                reconnectStartedAt = null;

                                if (alreadyConnectedFirstTime) {
                                    var channelsToRemove = Object.create(null);

                                    // Subscribe to the previously subscribed channels
                                    for (var key in subscribedChannels) {
                                        // Subscribe again
                                        if (subscribedChannels[key]['subscribeOnReconnected'] == true && (subscribedChannels[key]['isSubscribing'] || subscribedChannels[key]['isSubscribed'])) {
                                            subscribedChannels[key]['isSubscribing'] = false;
                                            subscribedChannels[key]['isSubscribed'] = false;

                                            ortc.subscribe(key, true, subscribedChannels[key]['onMessageCallback']);
                                        }
                                        else {
                                            channelsToRemove[key] = key;
                                        }
                                    }

                                    for (var key in channelsToRemove) {
                                        delete subscribedChannels[key];
                                    }

                                    // Clean messages buffer (can have lost message parts in memory)
                                    messagesBuffer = Object.create(null);

                                    delegateReconnectedCallback(ortc);
                                }
                                else {
                                    alreadyConnectedFirstTime = true;

                                    delegateConnectedCallback(ortc);
                                }
                                break;
                            case 'ortc-subscribed':
                                var channel = data.ch;

                                if (subscribedChannels[channel]) {
                                    subscribedChannels[channel].isSubscribing = false;
                                    subscribedChannels[channel].isSubscribed = true;
                                }

                                delegateSubscribedCallback(ortc, channel)
                                break;
                            case 'ortc-unsubscribed':
                                var channel = data.ch;

                                if (subscribedChannels[channel]) {
                                    subscribedChannels[channel].isSubscribed = false;
                                }

                                delegateUnsubscribedCallback(ortc, channel)
                                break;
                            case 'ortc-error':
                                var data = data.ex ? data.ex : data;
                                var operation = data.op;
                                var error = data.ex;

                                delegateExceptionCallback(ortc, error);

                                switch (operation) {
                                    case 'validate':
                                        invalidConnection = true;

                                        // Stop the reconnecting process
                                        stopReconnecting = true;
                                        alreadyConnectedFirstTime = false;
                                        break;
                                    case 'subscribe':
                                        if (channel && subscribedChannels[channel]) {
                                            subscribedChannels[channel]['isSubscribing'] = false;
                                        }
                                        break;
                                    case 'subscribe_maxsize':
                                    case 'unsubscribe_maxsize':
                                    case 'send_maxsize':
                                        if (channel && subscribedChannels[channel]) {
                                            subscribedChannels[channel]['isSubscribing'] = false;
                                        }

                                        // Stop the reconnecting process
                                        stopReconnecting = true;
                                        alreadyConnectedFirstTime = false;
                                        break;
                                    default:
                                        break;
                                }

                                if (stopReconnecting) {
                                    delegateDisconnectedCallback(ortc);
                                }
                                break;
                            default:
                                var channel = data.ch;
                                var message = data.m;

                                // Multi part
                                var regexPattern = /^([A-Za-z0-9]*)_{1}(\d*)-{1}(\d*)_{1}(.*)$/;
                                var match = regexPattern.exec(message);

                                var messageId = null;
                                var messageCurrentPart = 1;
                                var messageTotalPart = 1;
                                var lastPart = false;

                                if (match && match.length > 0) {
                                    if (match[1]) {
                                        messageId = match[1];
                                    }
                                    if (match[2]) {
                                        messageCurrentPart = match[2];
                                    }
                                    if (match[3]) {
                                        messageTotalPart = match[3];
                                    }
                                    if (match[4]) {
                                        message = match[4];
                                    }
                                }

                                // Is a message part
                                if (messageId) {
                                    if (!messagesBuffer[messageId]) {
                                        messagesBuffer[messageId] = Object.create(null);
                                    }

                                    messagesBuffer[messageId][messageCurrentPart] = message;

                                    // Last message part
                                    if (Object.keys(messagesBuffer[messageId]).length == messageTotalPart) {
                                        lastPart = true;
                                    }
                                }
                                // Message does not have multipart, like the messages received at announcement channels
                                else {
                                    lastPart = true;
                                }

                                if (lastPart) {
                                    if (messageId) {
                                        message = "";

                                        for (var i = 1; i <= messageTotalPart; i++) {
                                            message += messagesBuffer[messageId][i];

                                            // Delete from messages buffer
                                            delete messagesBuffer[messageId][i];
                                        }

                                        // Delete from messages buffer
                                        delete messagesBuffer[messageId];
                                    }
                                    
                                    delegateMessagesCallback(ortc, channel, message);
                                }
                                break;
                        }

                        break;
                    case 'h': // heartbeat
                        break;
                    default:
                        break;
                }
            };
        }

        return ortc.sockjs;
    };

    /*
    * Sends the message to the socket.
    */
    var sendToSocket = function (message) {
        try {
            ortc.sockjs.send(JSON.stringify(JSON.stringify(message)));
        } catch (e) {
            // Server went down
        }
    };

    /*
    * Event to send a message.
    */
    ortc.eventEmitter.on('sendMultiPartMessage', function (message) {
        multiPartQueue.push(message);
    });

    /*
    * Interval to send a message.
    */
    var sendIntervalId = setInterval(function () {
        if (Object.keys(multiPartQueue).length > 0) {
            sendToSocket(multiPartQueue.shift());
        }
    }, 10);

    /*
    * Calls the onConnected callback if defined.
    */
    var delegateConnectedCallback = function (ortc) {
        if (ortc != null && ortc.onConnected != null) {
            ortc.onConnected(ortc);
        }
    };

    /*
    * Calls the onDisconnected callback if defined.
    */
    var delegateDisconnectedCallback = function (ortc) {
        if (ortc != null && ortc.onDisconnected != null) {
            ortc.onDisconnected(ortc);
        }
    };

    /*
    * Calls the onSubscribed callback if defined.
    */
    var delegateSubscribedCallback = function (ortc, channel) {
        if (ortc != null && ortc.onSubscribed != null && channel != null) {
            ortc.onSubscribed(ortc, channel);
        }
    };

    /*
    * Calls the onUnsubscribed callback if defined.
    */
    var delegateUnsubscribedCallback = function (ortc, channel) {
        if (ortc != null && ortc.onUnsubscribed != null && channel != null) {
            ortc.onUnsubscribed(ortc, channel);
        }
    };

    /*
    * Calls the onMessages callbacks if defined.
    */
    var delegateMessagesCallback = function (ortc, channel, message) {
        if (ortc != null && subscribedChannels[channel] && subscribedChannels[channel].isSubscribed && subscribedChannels[channel].onMessageCallback != null) {
            subscribedChannels[channel].onMessageCallback(ortc, channel, message);
        }
    };

    /*
    * Calls the onException callback if defined.
    */
    var delegateExceptionCallback = function (ortc, event) {
        if (ortc != null && ortc.onException != null) {
            ortc.onException(ortc, event);
        }
    };

    /*
    * Calls the onReconnecting callback if defined.
    */
    var delegateReconnectingCallback = function (ortc) {
        if (ortc != null && ortc.onReconnecting != null) {
            ortc.onReconnecting(ortc);
        }
    };

    /*
    * Calls the onReconnected callback if defined.
    */
    var delegateReconnectedCallback = function (ortc) {
        if (ortc != null && ortc.onReconnected != null) {
            ortc.onReconnected(ortc);
        }
    };
};