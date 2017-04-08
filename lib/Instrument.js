const EventEmitter = require('events');


class Instrument extends EventEmitter {

  constructor (config) {
    super();
    if (config) {
      this.initialize(config);
    }
  }

  initialize (config) {
    console.log('INITITIT', this.sensors)
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

    console.log('>>>>>>SENS', sensor)
    const name = sensor.name;
    sensor.subscribe((message) => {
      this.emit('value', name, message);
    });
  }

  subscribe (listener) {
    this.on('value', listener);
  }
}

module.exports = Instrument;