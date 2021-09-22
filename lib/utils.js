const {consts} = require('@jambonz/node-smpp');

const getUdh = (pdu) => {
  if (pdu.esm_class & consts.ESM_CLASS.UDH_INDICATOR) {
    if (pdu.short_message && pdu.short_message.udh && pdu.short_message.udh.length > 0) {
      const data = [...pdu.short_message.udh[0]];
      if (data.length > 4) {
        return {
          ref: data[2],
          totalParts: data[3],
          part: data[4]
        };
      }
    }
  }
};

const decimalToHex = (d, padding) => {
  var hex = Number(d).toString(16).toUpperCase();
  padding = typeof (padding) === 'undefined' || padding === null ? padding = 2 : padding;

  while (hex.length < padding) {
    hex = '0' + hex;
  }
  return hex;
};


module.exports = {
  getUdh,
  decimalToHex
};
