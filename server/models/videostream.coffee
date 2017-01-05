cozydb = require 'cozydb'

module.exports = cozydb.getModel 'VideoStream',
    docTypeVersion: String
    timestamp: String # Viewing start datetime.
    content: Object # Details about the viewed content: title, subtitle, type,
    # duration, quality, publicationYear, country, id, longId, adultLevel,
    # csaCode.
    price: Number # Price of the video content (often 0)
    viewingDuration: Number # Duration in seconds.
    details: Object # Details about the stream: offer, service, network, techno,
    # device and platform.
    action: String # Action logged by this data: visualisation or command
    clientId: String # Identifier of the user on the operator.