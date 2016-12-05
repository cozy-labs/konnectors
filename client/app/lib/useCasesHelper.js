// Library related to use cases

export default function useCasesHelper (context) {
  this.helper = require(`../contexts/${context}/index`)
  this.useCases = this.helper.useCases

  this.getUseCases = function () {
    return this.useCases
  }
}
