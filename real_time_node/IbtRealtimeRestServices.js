var querystring = require('querystring'); 
var urlApi = require('url');

this.channelPermissions = {
		Read : 'r',
		Write : 'w'
};	 
	
 /**
 * Saves authentication for the specified token with the specified authentication key
 * @param {int} Max value
 */
this.saveAuthentication = function(connectionUrl,authenticationToken,authenticationTokenIsPrivate,applicationKey,timeToLive,privateKey,permissions,callback) {
	var saveAuthenticationData = {
			'AT' : authenticationToken,
			'PVT' : authenticationTokenIsPrivate,
			'AK' : applicationKey,
			'TTL' : timeToLive,
			'PK' : privateKey,
			'TP' : Object.size(permissions)
	}
	
	for(var permission in permissions){
		saveAuthenticationData[permission] = permissions[permission];
	}
	
	var postContent = querystring.stringify(saveAuthenticationData);
	
	var url = urlApi.parse(connectionUrl);

	var headers = {
			'host': url.hostname,
            'port': url.port,
            'path': '/authenticate',
            'method': 'POST',
            'content-length': postContent.length,
            'content-type': 'application/x-www-forum-urlencoded'
	};
	
	var http = url.port === '443' ? require('https') : require('http');
	
	var httpRequest = http.request(headers, function (response) {
		var statusCode = response.statusCode;

		response.on('data', function (data) {
		    switch (statusCode) {
		        case 201:
		            if(callback) callback(null, true);
		            break;
		        case 401:
		        	if(callback) callback(data.toString("binary"), false);
		            break;
		        default:
		        	if(callback) callback(data.toString("binary"), false);
		            break;
		    }
		});
	});
	 
	 httpRequest.write(postContent);
	 httpRequest.end();

     httpRequest.on('error', function (error) {
    	 if(callback) callback(error, false);
     }); 
};

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};
















