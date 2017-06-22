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
    this[this.static ? 'once' : 'on']('value', listener);
    this.activate();
  }

  activate () {
    if (this.intervalId) {
      return;
    }
    if (!this.global || ipc.isMaster) {
      this.measure();
    }
    if (this.global) {
      ipc.on('master', (isMaster) => {
        if (isMaster) this.measure();
      });
    }
    if (!this.static) {
      this.intervalId = setInterval(() => {
        if (this.global && !ipc.isMaster) return;
        this.measure();
      }, this.interval);
    }
  }

  deactivate () {
    clearInterval(this.intervalId);
    delete this.intervalId;
  }
}

module.exports = Sensor;
