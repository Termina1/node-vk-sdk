'use strict';

var Promise = require('promise');
var request = require('request');

var _delayed = [];
var _token;


module.exports.setToken = function (token) {
    _token = token;
    return this;
};


module.exports.serverAuth = function (params) {

    return new Promise(function (resolve, reject) {

        var url = 'https://oauth.vk.com/access_token?client_id=CLIENT_ID&client_secret=CLIENT_SECRET&v=5.1&grant_type=client_credentials'
            .replace('CLIENT_ID', params.client_id)
            .replace('CLIENT_SECRET', params.client_secret);

        getRequest(url, function (response) {
            var data = JSON.parse(response || null);
            if (data.access_token) {
                exports.setToken(data.access_token);
                resolve(data);
            } else {
                reject(data);
            }
        });

    });

};


module.exports.siteAuth = function (params) {

    return new Promise(function (resolve, reject) {

        var url = 'https://oauth.vk.com/access_token?client_id=CLIENT_ID&client_secret=CLIENT_SECRET&code=CODE&redirect_uri=REDIRECT_URI'
            .replace('CLIENT_ID', params.client_id)
            .replace('CLIENT_SECRET', params.client_secret)
            .replace('CODE', params.code)
            .replace('REDIRECT_URI', params.redirect_uri);

        getRequest(url, function (response) {
            var data = JSON.parse(response || null);
            if (data.access_token) {
                exports.setToken(data.access_token);
                resolve(data);
            } else {
                reject(data);
            }
        });

    });

};


module.exports.callMethod = function (method, params) {

    return new Promise(function (resolve, reject) {

        apiRequest(method, params, function (data) {
            if (data.response) {
                resolve(data.response);
            } else {
                reject(data.error)
            }

        });

    });



};


module.exports.appendCall = function (method, params) {

    return new Promise(function (resolve, reject) {
        _delayed.push({
            method: method,
            params: params,
            resolve: resolve,
            reject: reject
        });
    });

};


module.exports.execute = function (captcha) {

    return new Promise(function (resolve, reject) {

        var calls = _delayed;
        _delayed = [];

        var code = 'return [' + calls.map(function (item) {
            return 'API.METHOD(PARAMS)'
                .replace('METHOD', item.method)
                .replace('PARAMS', JSON.stringify(item.params) || '');
        }).join(',') + '];';

        var params = {
            code: code
        };

        if (captcha) {
            params.captcha_sid = captcha.sid;
            params.captcha_key = captcha.key;
        }

        apiRequest('execute', params, function onResponse (data) {

            var errorsHandled = 0;

            if (data.response) {

                resolve(data.response);
                data.response.forEach(function (response, i) {
                    var call = calls[i];
                    if (response) {
                        call.resolve(response);
                    } else {
                        call.reject(data.execute_errors[errorsHandled++]);
                    }
                });

            } else {

                reject(data.error);
                calls.forEach(function (item) {
                    item.reject(data.error);
                });

            }

        });

    });


};



function apiRequest (method, params, callback) {
  request({
    baseUrl: 'https://api.vk.com',
    uri: '/method/' + method,
    body: makeQueryString(params),
    method: 'POST',
    timeout: 10000
  }, function(error, response, body) {
    if (error) {
      callback({error: error});
    } else {
      callback(JSON.parse(body));
    }
  });

}


function getRequest (url, callback) {
    request(url, function(error, response, body) {
      if (!error) {
        callback(data);
      }
    });
}


function makeQueryString (params) {
    return Object.keys(params || {})
        .map(function (key) {
            var encodedKey = encodeURIComponent(key);
            var encodedValue = encodeURIComponent(params[key])
            return encodedKey + '=' + encodedValue;
        })
        .concat(_token ? 'access_token=' + _token : '')
        .join('&');
}
