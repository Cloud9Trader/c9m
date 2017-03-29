const Device = require('./lib/Device');

const initialize = (config) => {
  const accessKey = config.accessKey || process.env.C9M_ACCESS_KEY;
  if (!accessKey) {
    console.error('Cloud9Metrics access key must be set on environment as C9M_ACCESS_KEY or supplied as config.accessKey');
    return;
  }
  return new Device({
    accessKey
  });
};

initialize.Device = Device;

module.exports = initialize;