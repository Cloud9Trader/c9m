const Device = require('./lib/Device');
const Instrument = require('./lib/Instrument');
const Sensor = require('./lib/Sensor');

const instance = new Device();

instance.Device = Device;
instance.Instrument = Instrument;
instance.Sensor = Sensor;

module.exports = instance; 