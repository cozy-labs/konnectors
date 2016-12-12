if (!Array.prototype.find) {
  // eslint-disable-next-line
  Object.defineProperty(Array.prototype, 'find', {
    value: function (predicate) {
      'use strict'
      if (this == null) {
        throw new TypeError('Array.prototype.find called on null or undefined')
      }
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function')
      }
      const list = Object(this)
      const length = list.length >>> 0
      const thisArg = arguments[1]
      let value

      for (let i = 0; i < length; i++) {
        value = list[i]
        if (predicate.call(thisArg, value, i, list)) {
          return value
        }
      }
      return undefined
    }
  })
}

if (!Array.prototype.findIndex) {
// eslint-disable-next-line
  Object.defineProperty(Array.prototype, 'findIndex', {
    value: function (predicate) {
      'use strict'
      if (this == null) {
        throw new TypeError('Array.prototype.findIndex called on null or undefined')
      }
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function')
      }
      var list = Object(this)
      var length = list.length >>> 0
      var thisArg = arguments[1]
      var value

      for (var i = 0; i < length; i++) {
        value = list[i]
        if (predicate.call(thisArg, value, i, list)) {
          return i
        }
      }
      return -1
    },
    enumerable: false,
    configurable: false,
    writable: false
  })
}
