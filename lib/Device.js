const EventEmitter = require('events');
const iot = require('./iot');
const store = require('./store');


class Device extends EventEmitter {

  constructor (config) {
    super();
    if (config) {
      this.initialize(config);
    }
  }

  initialize (config) {
    iot.initialize(config);
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

    console.info('[INFO] Cloud9Metrics instrument', instrument.name, 'loaded');

    instrument.initialize();

    instrument.subscribe((topic, data, _static) => {
      this.publishStream(instrument, topic, data, _static);
    });
  }

  publishStream (instrument, topic, data, _static) {
    this.emit('value', instrument.name + '/' + topic, data, _static);
    this.emit(instrument.name, topic, data, _static);
    store.set(instrument, topic, data, _static);
  }
}

module.exports = Device;
