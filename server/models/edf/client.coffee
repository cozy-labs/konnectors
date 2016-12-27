cozydb = require 'cozydb'

module.exports = EDFClient = cozydb.getModel 'Client',
    clientId: String # Client Id in EDF.
    vendor: String # EDF
    numeroAcc: String # Another client Id from EDF.
    address: Object # Client postal address
    name: Object # CLiet name
    email: String # client Email
    cellPhone: String # Client cell phone number
    homePhone: String # Client home phone number
    loginEmail: String # Client email used as login
    coHolder: Object # Name of the co-holder of the contract
    commercialContact: Object # Commercial contact information.
    docTypeVersion: String
