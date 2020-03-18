const request = require('request');

async function get (url) {
    return new Promise((resolve, reject) => {
        request({ url, method: 'GET',json:1,rejectUnauthorized: false }, (error, response, body) => {
            return resolve({ error, body, response });


        })
    })
}

async function post (url, data) {
    var options = {
        method: 'post',
        body: data,
        json: true,
        url: url
    }
    return new Promise((resolve, reject) => {
        request({ url: url, method: 'POST', body: data, json: true}, (error, response, body) => {
            if (error) return reject(error);

            return resolve({ body, response });
        })
    })
}

module.exports = {
    get,
    post
};