const async = require('async');
const request = require('request');
const awsIotDeviceSDK = require('aws-iot-device-sdk');

const caCertificateUrl = 'https://www.symantec.com/content/en/us/enterprise/verisign/roots/VeriSign-Class%203-Public-Primary-Certification-Authority-G5.pem';
const authUrl = 'https://df0iwh0kgj.execute-api.us-east-1.amazonaws.com/prod/token';
const host = 'a3nu9lygzcllw4.iot.us-east-1.amazonaws.com';


const id = Math.random().toString(34).substr(-5);

class Device {

  constructor (config) {
    if (config) {
      this.initialize(config);
    }
  }

  initialize (config) {

    const accessKey = config.accessKey || process.env.C9M_ACCESS_KEY;
    if (!accessKey) {
      console.error('[ERROR] Cloud9Metrics access key must be set on environment as C9M_ACCESS_KEY or supplied as config.accessKey');
      return;
    }

    async.parallel({
      caCert: this.getCACert(caCertificateUrl),
      authTokens: this.getAuthTokens(accessKey)
    }, (error, result) => {
      if (error) {
        return console.error('[ERROR]', error);
      } 
      const { caCert, authTokens } = result;
      this.start(caCert, authTokens);
    });
    this.initializeInstruments(config.instruments);
  }

  initializeInstruments (instruments) {
    if (instruments) {
      instruments.forEach((instrument) => {
        this.use(instrument);
      });
    }
  }

  use (instrument) {
    if (typeof instrument === 'string') {
      try {
        instrument = require(instrument);
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
          console.error('[ERROR] Cloud9Metrics instrument is not installed. Run `npm install ' + instrument + ' --save`');
        } else {
          throw error;
        }
        return;
      }
    }
    const name = instrument.name;
    instrument.initialize();
    instrument.subscribe((topic, message) => {
      this.publish(name + '/' + topic, message);
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
        console.log(JSON.parse(new Buffer(response.body, 'base64').toString('utf8')))
        const { version, identityId, deviceName, clientCert, privateKey } = JSON.parse(new Buffer(response.body, 'base64').toString('utf8'));
        if (version < 2) {
          return callback('[ERROR] Your Cloud9Metrics version is out of date. Please upgrade to latest `npm install c9m@latest --save`');
        }
        this.connectionId = identityId + '/' + deviceName;

        callback(null, {
          clientCert: new Buffer(clientCert),
          privateKey: new Buffer(privateKey)
        })
      });
    }
  }

  start (caCert, authTokens) {

    const { clientId, clientCert, privateKey } = authTokens;

    const device = awsIotDeviceSDK.device({
      clientId: this.connectionId,
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

    this.device = device;
  }

  publish (topic, message) {
    if (!this.device) {
      return;
    }
    console.log(this.connectionId + '/' + topic, JSON.stringify(message))
    this.device.publish(this.connectionId + '/' + topic, JSON.stringify(message));
  }
}

module.exports = Device;
