const ipc = require('./ipc');


class Store {

  constructor () {
    this.data = {};
    ipc.on('values', this.onIPCValues.bind(this));
  }

  set (instrument, topic, data) {
    if (ipc.isMaster) {
      this._set(instrument.global ? 'global' : ipc.index, process.pid, instrument.name, topic, data);
    } else {
      ipc.send(instrument.name, topic, data);
    }
  }

  onIPCValues (index, values) {
    const { pid, instrument, topic, data } = values;
    this._set(index, pid, instrument, topic, data);
  }

  _set (index, pid, instrumentName, topic, data) {
    this.updated = true;
    this.data[index] = this.data[index] || {};
    this.data[index].pid = pid;

    if (instrumentName === 'pid') {
      return console.warn('[WARN] Cloud9Metrics instrument name cannot be reserved word \'pid\'');
    }

    this.data[index][instrumentName] = this.data[index][instrumentName] || {};
    this.data[index][instrumentName][topic] = data;
  }

  getData () {
    this.updated = false;
    return this.data;
  }
}

module.exports = new Store();
