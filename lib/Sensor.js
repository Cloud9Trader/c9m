const EventEmitter = require('events');

const interval = 1000;

class Sensor extends EventEmitter {

  constructor (config) {
    super();
    if (config) {
      this.initialize(config);
    }
  }

  initialize (config) {

  }

  subscribe (listener) {
    console.log('SUBS')
    this.on('value', listener);
    this.activate();
  }

  activate () {
    if (this.interval) {
      return;
    }
    this.interval = setInterval(() => {
      this.measure();
    }, interval);
  }

  deactivate () {
    clearInterval(this.interval);
    delete this.interval;
  }
}

module.exports = Sensor;
