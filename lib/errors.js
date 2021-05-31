class SmppError extends Error {
  constructor(command_status) {
    super(`smpp command returned ${command_status}`);
    this.code = command_status;
  }
}
class NoGatewaysError extends Error {
  constructor(command_status) {
    super('no configured or available gateways');
  }
}

module.exports = {
  SmppError,
  NoGatewaysError
};
