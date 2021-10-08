const {decimalToHex} = require('./utils');
const errors = new Map([
  ['0x00000000', 'No Error'],
  ['0x00000001', 'Message length is invalid'],
  ['0x00000002', 'Command length is invalid'],
  ['0x00000003', 'Invalid Command ID'],
  ['0x00000004', 'Incorrect BIND Status for given command'],
  ['0x00000005', 'ESME Already in Bound State'],
  ['0x00000006', '0x00000006'],
  ['0x00000007', 'Invalid Registered Delivery Flag'],
  ['0x00000008', 'System Error'],
  ['0x00000009', 'Reserved'],
  ['0x0000000A', 'Invalid Source Address'],
  ['0x0000000B', 'Invalid Dest Addr'],
  ['0x0000000C', 'Message ID is invalid'],
  ['0x0000000D', 'Bind Failed'],
  ['0x0000000E', 'Invalid Password'],
  ['0x0000000F', 'Invalid System ID'],
  ['0x00000010', 'Reserved'],
  ['0x00000011', 'Cancel SM Failed'],
  ['0x00000012', 'Reserved'],
  ['0x00000013', 'Replace SM Failed'],
  ['0x00000014', 'Message Queue Full'],
  ['0x00000015', 'Invalid Service Type'],
  ['0x00000033', 'Invalid number of destinations'],
  ['0x00000034', 'Invalid Distribution List name'],
  ['0x00000040', 'Destination flag is invalid (submit_multi)'],
  ['0x00000042', 'Invalid submit with replace request; submit_sm with replace_if_present_flag set'],
  ['0x00000043', 'Invalid esm_class field data'],
  ['0x00000044', 'Cannot Submit to Distribution List'],
  ['0x00000045', 'submit_sm or submit_multi failed'],
  ['0x00000048', 'Invalid Source address TON'],
  ['0x00000049', 'Invalid Source address NPI'],
  ['0x00000050', 'Invalid Destination address TON'],
  ['0x00000051', 'Invalid Destination address NPI'],
  ['0x00000053', 'Invalid system_type field'],
  ['0x00000054', 'Invalid replace_if_present flag'],
  ['0x00000055', 'Invalid number of messages'],
  ['0x00000058', 'Throttling error; ESME has exceeded allowed message limits'],
  ['0x00000061', 'Invalid Scheduled Delivery Time'],
  ['0x00000062', 'Invalid message validity period (Expiry time)'],
  ['0x00000063', 'Predefined Message Invalid or Not Found'],
  ['0x00000064', 'ESME Receiver Temporary App Error Code'],
  ['0x00000065', 'ESME Receiver Permanent App Error Code'],
  ['0x00000066', 'ESME Receiver Reject Message Error Code'],
  ['0x00000067', 'query_sm request failed'],
  ['0x000000C0', 'Error in the optional part of the PDU Body'],
  ['0x000000C1', 'Optional Parameter not allowed'],
  ['0x000000C2', 'Invalid Parameter Length'],
  ['0x000000C3', 'Expected Optional Parameter missing'],
  ['0x000000C4', 'Invalid Optional Parameter Value'],
  ['0x000000FE', 'Delivery Failure'],
  ['0x000000FF', 'Unknown Error']
]);

class SmppError extends Error {
  constructor(command_status) {
    const hex = `0x${decimalToHex(command_status, 8)}`;
    const msg = `${errors.get(hex) || 'unknown or reserved error code'} (${hex})`;
    super(msg);
    this.code = hex;
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
