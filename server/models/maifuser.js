'use strict';

const cozydb = require('cozydb');


module.exports = cozydb.getModel('MaifUser', {
  password: String, // The refresh token. TODO: move it in a konnector field

  // All the Maif data ( http://mesinfos.fing.org/cartographies/datapilote/ ).
  // TODO: split it in multiples documents. But it  should be synchronized with
  // one update of mes infos maif app.
  profile: Object,
  date: String, // last update date TODO: use the one from konnector.
});
