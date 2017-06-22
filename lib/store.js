const ipc = require('./ipc');


class Store {

  constructor () {
    this.updated = {};
    this.static = {};
    this.values = {};
    ipc.on('values', this.onIPCValues.bind(this));
  }

  set (instrument, topic, data, _static) {
    if (ipc.isMaster) {
      this._set(instrument.global ? 'global' : ipc.index, process.pid, instrument.name, topic, data, _static);
    } else {
      ipc.send(instrument.name, topic, data, _static);
    }
  }

  onIPCValues (index, values) {
    const { pid, instrument, topic, data, _static } = values;
    this._set(index, pid, instrument, topic, data, _static);
  }

  _set (index, pid, instrumentName, topic, data, _static) {
    let store = this[_static ? 'static' : 'values'];

    this.updated[_static ? 'static' : 'values'] = true;

    store[index] = store[index] || {};
    store[index].pid = pid;

    if (instrumentName === 'pid') {
      return console.warn('[WARN] Cloud9Metrics instrument name cannot be reserved word \'pid\'');
    }

    store[index][instrumentName] = store[index][instrumentName] || {};
    store[index][instrumentName][topic] = data;
  }

  getStatic () {
    this.updated.static = false;
    return {
      t: Date.now(),
      v: this.static
    };
  }

  getValues () {
    this.updated.values = false;
    let values = this.values;
    this.values = {};
    return values;
  }
}

module.exports = new Store();
