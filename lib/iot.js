const async = require('async');
const request = require('request');
const awsIotDeviceSDK = require('aws-iot-device-sdk');

const store = require('./store');
const ipc = require('./ipc');

const caCertificateUrl = 'https://www.symantec.com/content/en/us/enterprise/verisign/roots/VeriSign-Class%203-Public-Primary-Certification-Authority-G5.pem';
const authUrl = 'https://df0iwh0kgj.execute-api.us-east-1.amazonaws.com/prod/token';
const host = 'a3nu9lygzcllw4.iot.us-east-1.amazonaws.com';

class IoT {

  initialize (config) {

    const accessKey = config.accessKey || process.env.C9M_ACCESS_KEY;
    if (!accessKey) {
      console.error('[ERROR] Cloud9Metrics access key must be set on environment as C9M_ACCESS_KEY or supplied as config.accessKey');
      return;
    }

    if (this.initialized) {
      if (accessKey !== this.accessKey) {
        console.error('[ERROR] Cloud9Metrics has already been initialized with another access key. Several processes on the same host can share a C9M_ACCESS_KEY');
      }
      return;
    }

    this.initialized = true;
    this.accessKey = accessKey;

    async.parallel({
      caCert: this.getCACert(caCertificateUrl),
      authTokens: this.getAuthTokens(accessKey)
    }, (error, result) => {
      if (error) {
        return console.error('[ERROR]', error);
      } 
      const { caCert, authTokens } = result;
      this.caCert = caCert;
      this.authTokens = authTokens;

      if (ipc.isMaster) {
        this.start();
      }
      ipc.on('master', (isMaster) => {
        if (isMaster) {
          this.start();
        } else {
          this.stop();
        }
      });
    });
  }

  start () {

    const { clientCert, privateKey } = this.authTokens;

    this.device = awsIotDeviceSDK.device({
      clientId: this.connectionId,
      privateKey,
      clientCert,
      caCert: this.caCert,
      host
    });

    this.device.on('connect', () => {
      console.info('[INFO] Cloud9Metrics device connected');
    });

    this.device.on('close', () => {
      console.info('[INFO] Cloud9Metrics device connection closed');
    });

    this.device.on('reconnect', () => {
      console.info('[INFO] Cloud9Metrics device connection reconnected');
    });

    this.device.on('offline', () => {
      console.info('[INFO] Cloud9Metrics device connection offline');
    });

    this.device.on('error', (error) => {
      console.error('[ERROR] Cloud9Metrics device connection error', error);
    });

    this.device.on('message', (topic, payload) => {
      // console.debug('message', topic, payload.toString());
    });

    setInterval(() => {
      this.send();
    }, 1000);
  }

  stop () {
    if (this.device) {
      this.device.end();
      delete this.device;
    }
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
          return callback(response.statusCode + ' Cloud9Metrics access key was not valid');
        }
        const { version, identityId, deviceName, clientCert, privateKey } = JSON.parse(new Buffer(response.body, 'base64').toString('utf8'));
        if (version < 2) {
          return callback('[ERROR] Your Cloud9Metrics version is out of date. Please upgrade to latest `npm install c9m@latest --save`');
        }
        this.connectionId = identityId + '/' + deviceName;

        callback(null, {
          clientCert: new Buffer(clientCert),
          privateKey: new Buffer(privateKey)
        });
      });
    };
  }

  send () {
    if (store.updated.values) {
      let values = store.getValues();
      console.log(this.connectionId + '/data', JSON.stringify(values, null, 4 ))
      this.device.publish(this.connectionId + '/data', JSON.stringify(values));
    }
    if (store.updated.static) {
      console.log(this.connectionId + '/static', JSON.stringify(store.getStatic(), null, 4 ))
      this.device.publish(this.connectionId + '/static', JSON.stringify(store.getStatic()));
    }
  }
}




module.exports = new IoT();