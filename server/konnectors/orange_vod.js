'use strict'

const request = require('request')

const localization = require('../lib/localization_manager')
const baseKonnector = require('../lib/base_konnector')
const updateOrCreate = require('../lib/update_or_create')

const VideoStream = require('../models/videostream')

const API_ROOT = 'https://mesinfos.orange-labs.fr'

const logger = require('printit')({
  prefix: 'Orange VOD',
  date: true
})

/*
 * The goal of this connector is to fetch event from facebook and store them
 * in the Cozy
 */
const connector = module.exports = baseKonnector.createNew({
  name: 'Orange VOD',
  customView: '<%t konnector customview orange_vod %>',

  connectUrl: 'https://mesinfos.orange-labs.fr/auth?redirect_url=',

  color: {
    hex: '#FF7900',
    css: '#FF7900'
  },

  fields: {
    access_token: {
      type: 'hidden'
    },
    lastVideoStream: {
      type: 'hidden'
    }
  },
  dataType: ['clientId', 'timestamp'],
  models: [VideoStream],

  fetchOperations: [
    checkToken,
    downloadVod,
    updateOrCreate(logger, VideoStream, ['clientId', 'timestamp']),
    saveFieldsInKonnector,
    buildNotifContent
  ]

})

function checkToken (requiredFields, entries, data, next) {
  const token = requiredFields.access_token
  if (!token) { return next('token not found') }

  try {
    let payload = token.split('.')[1]
    payload = JSON.parse(new Buffer(payload, 'base64').toString())

    if (payload.token_type !== 'fixe') {
      connector.logger.error(`Wronk token_type for this konnector: ${payload.token_type}`)
      return next('not fixe token')
    }

    next()
  } catch (e) {
    connector.logger.error(`Unexpected token format: ${e}`)
    next('token not found')
  }
}

function requestOrange (uri, token, callback) {
  connector.logger.info(uri)

  request.get(uri, { auth: { bearer: token }, json: true }, (err, res, body) => {
    if (res.statusCode.toString() !== '200') {
      err = `${res.statusCode} - ${res.statusMessage} ${err || ''}`
      connector.logger.error(body)
    }

    if (err) {
      connector.logger.error(`Download failed: ${err}`)
      return callback(err)
    }
    callback(null, body)
  })
}

function downloadVod (requiredFields, entries, data, next) {
  connector.logger.info('Downloading vod data from Orange...')
  let uri = `${API_ROOT}/data/vod`
  if (requiredFields.lastGeoPoint) {
    uri += `?start=${requiredFields.lastVideoStream.slice(0, 19)}`
  }

  requestOrange(uri, requiredFields.access_token, (err, body) => {
    if (err) { return next(err) }
    entries.videostreams = []
    body.forEach((vod) => {
      if (vod.ts && requiredFields.lastVideoStream < vod.ts) {
        requiredFields.lastVideoStream = vod.ts
      }
      if (vod.err) { return }

      entries.videostreams.push({
        docType: 'VideoStream',
        docTypeVersion: connector.docTypeypeVersion,
        content: {
          type: vod.cont_type,
          title: vod.cont_title,
          subTitle: vod.cont_subtitle,
          duration: vod.cont_duration,
          quality: vod.cont_format,
          publicationYear: vod.prod_dt,
          country: vod.prod_nat,
          id: vod.cont_id,
          longId: vod.src_id,
          adultLevel: vod.adult_level === 'none' ? undefined : vod.adult_level,
          csaCode: vod.csa_code
        },
        price: vod.price,
        timestamp: vod.ts,
        viewingDuration: vod.use_duration ? Math.round(Number(vod.use_duration) * 60) : undefined,
        details: {
          offer: vod.offer,
          offerName: vod.offer_name,
          service: vod.service,
          network: vod.net,
          techno: vod.techno,
          device: vod.device,
          platform: vod.platf
        },
        action: vod.action,  // visualisation or command
        clientId: vod.line_id
      })
    })

    next()
  })
}

// Save konnector's fieldValues during fetch process.
function saveFieldsInKonnector (requiredFields, entries, data, next) {
  connector.logger.info('saveFieldsInKonnector')

  // Disable eslint because we can't require models/konnector at the top
  // of this file (or Konnector will be empty). It's because in the require
  // tree of models/konnector, there is the current file.
  //eslint-disable-next-line
  const Konnector = require('../models/konnector');

  Konnector.get(connector.slug, (err, konnector) => {
    if (err) {
      connector.logger.error(err)
      return next('internal error')
    }

    const accounts = konnector.accounts
    const index = accounts.findIndex(account =>
        account.access_token === requiredFields.access_token)
    accounts[index] = requiredFields
    konnector.updateFieldValues({ accounts }, next)
  })
}

function buildNotifContent (requiredFields, entries, data, next) {
  // data.updated: we don't sepak about update, beacause we don't now if the
  // update actually changes the data or not.

  // Signal all add of document.
  const addedList = []
  Object.keys(data.created).forEach((docsName) => {
    const count = data.created[docsName]
    if (count > 0) {
      addedList.push(localization.t(
        `notification ${docsName}`, { smart_count: count }))
    }
  })

  entries.notifContent = addedList.join(', ')
  next()
}
