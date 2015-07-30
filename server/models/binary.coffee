# Placeholder model to be able to manipulate binaries directly.
# (see models/file::destroyWithBinary)

americano = require 'cozydb'
module.exports = Binary = americano.getModel 'Binary', {}
