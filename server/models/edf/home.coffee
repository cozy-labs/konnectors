cozydb = require 'cozydb'

module.exports = EDFHome = cozydb.getModel 'Home',
    pdl: String # "Point de livraison" : id of the electric counter
    beginTs: String # Creation of the profil.
    isProfileValidated: Boolean # If the user as re-read and validated this.
    housingType: String # Flat, house, ...
    residenceType: String # first, secondary ...
    occupationType: String # Rent, owned
    constructionDate: String # Date of construction of the building.
    isBBC: Boolean # Low consumption building.
    surface: Number # Living surface.
    occupantsCount: Number # How much people leaves in.
    principalHeatingSystemType: String # What kind of heating system.
    sanitoryHotWaterType: String # What king of water heating system.
    docTypeVersion: String
