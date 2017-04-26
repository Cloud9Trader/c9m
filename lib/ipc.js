const net = require('net');
const fs = require('fs');
const split = require('split');
const EventEmitter = require('events');

class Master extends EventEmitter {

  constructor (path, sequence) {
    super();

    this.sequence = sequence;

    if (sequence) {
      this.sockets = new Array(sequence.length).fill(null);
    } else {
      this.sockets = [];
    }

    this.index = this.allocateSlot({
      pid: process.pid
    });

    const server = net.createServer(this.onClientConnection.bind(this));

    server.listen(path, () => {
      this.emit('alive');
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE' || error.code === 'EEXIST') {
        this.emit('dead');
      }
    });
  }

  onClientConnection (socket) {

    let index = null;

    this.sendToClient(socket, 'set-master-pid', process.pid);

    socket
      .pipe(split('##\n##'))
      .on('data', (message) => {
        if (!message.length) return;

        const [ command, value ] = JSON.parse(message);

        if (command === 'notify-pid') {
          socket.pid = value;
          index = this.allocateSlot(socket);
          let sequence = this.sockets.map((socket) => socket ? socket.pid : null);
          this.sendToAllClients('set-sequence', sequence);
        }

        else if (command === 'values' && index !== null) {
          this.emit('values', index, value);
        }
      })
      .on('error', (error) => {
        console.error('[ERROR] Cloud9Metrics error parsing IPC message', error);
      });

    socket.on('close', () => {
      this.sockets[index] = null;
    });
  }

  allocateSlot(socket) {
    if (this.sequence && this.sequence.includes(socket.pid)) {
      let index = this.sequence.indexOf(socket.pid);
      if (this.sockets[index]) {
        this.allocateSlot(this.sockets[index]);
      }
      this.sockets[index] = socket;
      return index;
    }
    const slot = this.sockets.some((slot, index) => {
      if (!slot) {
        this.sockets[index] = socket;
        return true;
      }
    });
    if (!slot) {
      this.sockets.push(socket);
    }
    return this.sockets.indexOf(socket);
  }

  sendToClient (socket, command, value) {
    socket.write(JSON.stringify([command, value]) + '##\n##');
  }

  sendToAllClients (command, value) {
    this.sockets.forEach((socket) => {
      if (socket && socket.write) {
        this.sendToClient(socket, command, value);
      }
    });
  }
}


class Client extends EventEmitter {

  constructor (path) {
    super();

    this.path = path;
    this.sequence = [];

    const socket = new net.Socket();

    socket.connect(path, () => {

      this.socket = socket;

      this.emit('alive');

      this.send('notify-pid', process.pid);

      socket
        .pipe(split('##\n##'))
        .on('data', (message) => {
          if (!message.length)  return;

          const [ command, value ] = JSON.parse(message);

          if (command === 'set-master-pid') {
            this.masterPid = value;
          }

          else if (command === 'set-sequence') {
            this.sequence = value;
            this.emit('sequence', value);
          }
        })

        .on('error', (error) => {
          console.error('[ERROR] Cloud9Metrics error parsing IPC message', error);
        });


      socket.once('close', () => {
        delete this.socket;
        this.emit('dead', this.masterPid);
      });
    });

    socket.on('error', this.onErrored.bind(this));
  }


  onErrored (error) {
    if (error.code === 'ENOENT') {
      delete this.socket;
      this.emit('dead');
    }
    else if (error.code === 'ECONNREFUSED') {
      fs.unlink(this.path, () => {
        delete this.socket;
        this.emit('dead');
      });
    }
  }

  send (command, value) {
    if (this.socket) {
      this.socket.write(JSON.stringify([command, value]) + '##\n##');
    }
  }

  sendValues (values) {
    this.send('values', values);
  }
}


class IPC extends EventEmitter {

  constructor () {
    super();
    this.path = process.platform === 'win32' ? '\\\\.\\pipe\\tmp-c9m.master' : '/tmp/c9m.master';
    this.sequence = [];
    this.initializeMaster();
  }

  initializeMaster () {

    const master = new Master(this.path, this.sequence);

    master.once('alive', () => {
      this.isMaster = true;
      this.emit('master', true);
      this.index = master.index;
    });

    master.on('values', (index, values) => {
      this.emit('values', index, values);
    });

    master.once('dead', () => {
      this.isMaster = false;
      this.emit('master', false);
      delete this.index;
      master.removeAllListeners();
      this.initializeClient();
    });
  }

  initializeClient () {

    const client = new Client(this.path);

    client.once('alive', () => {
      this.client = client;
    });

    client.on('sequence', (sequence) => {
      this.sequence = sequence;
    });

    client.once('dead', (masterPid) => {
      if (masterPid) {
        this.sequence[this.sequence.indexOf(masterPid)] = null;
      }
      client.removeAllListeners();
      delete this.client;
      this.initializeMaster();
    });
  }

  send (instrument, topic, data) {
    if (this.client) {
      this.client.sendValues({
        pid: process.pid,
        instrument,
        topic,
        data
      });
    }
  }
}

module.exports = new IPC();
