const EventEmitter = require('events');


class Instrument extends EventEmitter {

  constructor (config) {
    super();
    if (config) {
      this.initialize(config);
    }
  }

  initialize (config) {
    this.sensors.forEach((sensor) => {
      this.use(sensor);
    });
  }

  use (sensor) {
    if (typeof sensor === 'string') {
      try {
        sensor = require(sensor);
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
          console.error('[ERROR] Cloud9Metrics sensor is not installed. Run `npm install ' + sensor + ' --save`');
        } else {
          throw error;
        }
        return;
      }
    }

    sensor.initialize({
      global: this.global
    });

    console.info('[INFO] Cloud9Metrics sensor', sensor.name, 'loaded');

    sensor.subscribe((message) => {
      this.emit('value', sensor.name, message, sensor.static);
    });
  }

  subscribe (listener) {
    this.on('value', listener);
  }
}

module.exports = Instrument;