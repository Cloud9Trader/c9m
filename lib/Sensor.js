const EventEmitter = require('events');


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
    }, 1000);
  }

  deactivate () {
    clearInterval(this.interval);
    delete this.interval;
  }
}

module.exports = Sensor;
