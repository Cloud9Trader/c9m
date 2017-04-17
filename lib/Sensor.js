const EventEmitter = require('events');
const ipc = require('./ipc');

const interval = 1000;


class Sensor extends EventEmitter {

  constructor (config) {
    super();
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
    }, interval);
  }

  deactivate () {
    clearInterval(this.interval);
    delete this.interval;
  }
}

module.exports = Sensor;
