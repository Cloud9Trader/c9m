const net = require('net');
const fs = require('fs');
const EventEmitter = require('events');


class IPC extends EventEmitter {

  constructor () {
    super();
    this.path = process.platform === 'win32' ? '\\\\.\\pipe\\tmp-c9m.master' : '/tmp/c9m.master';
    this.initializeMaster();
  }

  initializeMaster () {

    console.log('INITING  MASTER');

    const sockets = [];

    const server = net.createServer((socket) => {

      // const slot = sockets.some((slot, index) => {
      //   if (!slot) {
      //     sockets[index] = socket;
      //     console.info('SOCKET INSERTED TO EMPTY SLOT', index);
      //     return true;
      //   }
      // });
      // if (!slot) {
      //   sockets.push(socket);
      //   console.info('SOCKET PUSHED TO END', sockets.length - 1);
      // }

      console.log('SOCKET CONNECTED')
      

      socket.on('data', (message) => {
        console.log('DATA', message.toString());
        this.emit('message', JSON.parse(message));
      });

      socket.on('close', () => {
        // const index = sockets.indexOf(socket);
        // sockets[index] = null;
        console.log('DISCONNECT (CLOSE)');
      });
    })

    server.listen('/tmp/c9m.master', () => {
      console.log('MASTER LISTENING');

      this.isMaster = true;
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE' || error.code === 'EEXIST') {
        this.initializeClient();
      }
    });

    server.on('connection', (socket) => {
      console.log('CONNECTION');
    });

    server.on('close', (socket) => {
      console.log('DISCONNECT');
    });
  }

  initializeClient () {
    const client = new net.Socket();

    client.connect(this.path, () => {
      console.log('CONNECTED')
      this.client = client;

      client.on('close', () => {
        delete this.client;
        console.log('DISCONNECTED FROM MASTER')
        this.initializeClient();
      });

      client.on('data', (data) => {
        console.log('DATA', data.toString())
      });
 
    });

    client.on('error', (error) => {
      delete this.client;
      // console.log('ERROR', error)
      if (error.code === 'ENOENT') {
        

        this.initializeMaster();
      }
      if (error.code === 'ECONNREFUSED') {
        console.log('ECONNREFUSED I AM NOT MASTER');
        fs.unlink(this.path, () => {
          this.initializeClient();
        });
      }
    });
  }

  send (instrument, topic, data) {
    if (this.client) {
      this.client.write(JSON.stringify({
        pid: process.pid,
        instrument,
        topic,
        data
      }));
    }
  }
}

module.exports = new IPC();
