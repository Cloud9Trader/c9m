const async = require('async');
const request = require('request');
const awsIotDeviceSDK = require('aws-iot-device-sdk');

const caCertificateUrl = 'https://www.symantec.com/content/en/us/enterprise/verisign/roots/VeriSign-Class%203-Public-Primary-Certification-Authority-G5.pem';
const authUrl = 'https://df0iwh0kgj.execute-api.us-east-1.amazonaws.com/prod/token';
const host = 'a3nu9lygzcllw4.iot.us-east-1.amazonaws.com';

class Device {

  constructor (config) {

    const { accessKey } = config;

    async.parallel({
      caCert: this.getCACert(caCertificateUrl),
      authTokens: this.getAuthTokens(accessKey)
    }, (error, result) => {
      if (error) {
        return console.error(error);
      } 
      const { caCert, authTokens } = result;
      this.start(caCert, authTokens);
    });
  }

  getCACert (caCertificateUrl) {
    return (callback) => {
      request({
        url: caCertificateUrl
      }, (error, response) => {
        if (error) return callback(error);
        callback(null, new Buffer(response.body));
      });
    };
  }

  getAuthTokens (accessKey) {
    console.log('>>', accessKey)
    return (callback) => {
      request({
        url: authUrl,
        headers: {
          'Content-Type': 'text/plain',
          'Key': accessKey
        }
      }, (error, response) => {
        if (error) {
          return callback('Error authenticating Cloud9Metrics access key');
        }
        if (response.statusCode !== 200) {
          console.log(accessKey, response.body)
          return callback(response.statusCode + ' Cloud9Metrics access key was not valid');
        }
        const hash = new Buffer(response.body, 'base64').toString('utf8').split('#');
        const version = hash[0];
        if (version !== '1') {
          return callback('Your Cloud9Metrics version is out of date. Please update to latest `npm install c9m@latest --save`');
        }
        callback(null, {
          clientId: hash[1],
          clientCert: new Buffer(hash[2]),
          privateKey: new Buffer(hash[3])
        })
      });
    }
  }

  start (caCert, authTokens) {

    const { clientId, clientCert, privateKey } = authTokens;

    const device = awsIotDeviceSDK.device({
      clientId,
      privateKey,
      clientCert,
      caCert,
      host
    });


    device.on('connect', () => {
      console.log('connect');
    });

    device.on('close', () => {
      console.log('close');
    });

    device.on('reconnect', () => {
      console.log('reconnect');
    });

    device.on('offline', () => {
      console.log('offline');
    });

    device.on('error', (error) => {
      console.log('error', error);
    });

    device.on('message', (topic, payload) => {
      console.log('message', topic, payload.toString());
    });
  }
}

module.exports = Device;
