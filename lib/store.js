const ipc = require('./ipc');


class Store {

  constructor () {
    this.data = {};
    ipc.on('values', this.onIPCValues.bind(this));
  }

  set (instrument, topic, data) {
    if (ipc.isMaster) {
      this._set(process.pid, instrument.name, topic, data);
    } else {
      ipc.send(instrument.name, topic, data);
    }
  }

  onIPCValues (values) {
    const { pid, instrument, topic, data } = values;
    this._set(pid, instrument, topic, data);
  }

  _set (pid, instrumentName, topic, data) {
    this.updated = true;
    this.data[pid] = this.data[pid] || {};
    this.data[pid][instrumentName] = this.data[pid][instrumentName] || {};
    this.data[pid][instrumentName][topic] = data;
  }

  getData () {
    this.updated = false;
    return this.data;
  }
}

module.exports = new Store();
