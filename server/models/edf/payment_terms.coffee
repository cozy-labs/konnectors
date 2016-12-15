cozydb = require 'cozydb'

module.exports = EDFPaymentTerms = cozydb.getModel 'PaymentTerms',
    vendor: String # EDF
    clientId: String # Client Id in EDF
    encryptedBankDetails: String #  JSON.stringify of iban, holder, bank, ...
    balance: Number # Amount due to EDF.
    paymentMeans: String # Way of paiement.
    lastPayment: Object # Last payment occured.
    billFrequency: String # Duration between each bills.
    nextBillDate: String # Date of the next bill.
    paymentSchedules: [Object] # Accounts payment agenda.
    modifBankDetailsAllowed: Boolean # Is client allowed to change the
                                     # bankdetails.
    idPayer: String # Client Id of the client which pay the bills.
    payerDivergent: Boolean # True if clientId isent idPayer.
    docTypeVersion: String
