const EventEmitter = require('events');
const ipc = require('./ipc');


class Sensor extends EventEmitter {

  constructor (config) {
    super();
    this.interval = 1000;
    if (config) {
      this.initialize(config);
    }
  }

  initialize (config) {
    this.global = config.global;
  }

  subscribe (listener) {
    this.on('value', listener);
    this.activate();
  }

  activate () {
    if (this.interval) {
      return;
    }
    this.interval = setInterval(() => {
      if (this.global && !ipc.isMaster) return;
      this.measure();
    }, this.interval);
  }

  deactivate () {
    clearInterval(this.interval);
    delete this.interval;
  }
}

module.exports = Sensor;
