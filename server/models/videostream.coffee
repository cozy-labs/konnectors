cozydb = require 'cozydb'

module.exports = cozydb.getModel 'VideoStream',
    docTypeVersion: String
    timestamp: String # Viewing start datetime.
    title: String # Title of the video content
    subTitle: String # Subtitle of the video content
    price: Number # Price of the video content (often 0)
    viewingDuration: Number # Duration in seconds.
    fromOffer: String # Subscription.
    quality: String # Video quality: empty, HD or SD.
    action: String # Action logged by this data: visualisation or command
    clientId: String # User email  or user adsl phone number
