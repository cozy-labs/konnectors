'use strict'

const request = require('request')
const requestJSON = require('request-json')
const moment = require('moment')

const filterExisting = require('../lib/filter_existing')
const saveDataAndFile = require('../lib/save_data_and_file')
const localization = require('../lib/localization_manager')
const linkBankOperation = require('../lib/link_bank_operation')
const factory = require('../lib/base_konnector')

const Bill = require('../models/bill')

const logger = require('printit')({
  prefix: 'Virginmobile',
  date: true
})

const baseURL = 'https://espaceclient.virginmobile.fr/'

const fileOptions = {
  vendor: 'Virgin mobile',
  dateFormat: 'YYYYMMDD'
}

// Login layer
function login (requiredFields, billInfos, data, next) {
  const signInOptions = {
    method: 'POST',
    jar: true,
    url: `${baseURL}login_check`,
    form: {
      login: requiredFields.login,
      password: requiredFields.password,
      _target_path: 'factures-echeances'
    }
  }

  const client = requestJSON.createClient(baseURL)

  logger.info('Signing in')
  request(signInOptions, (err, res) => {
    if (err) {
      logger.error('Signin failed')
      return next('bad credentials')
    }

    client.headers.Cookie = res.headers['set-cookie']

    // Download bill information page.
    logger.info('Fetching bills list')
    client.get('api/getFacturesData', (err, res, body) => {
      if (err || !body.success) {
        logger.error('An error occured while fetching bills list')
        return next('no bills retrieved')
      }

      data.content = body.data
      next()
    })
  })
}

function parsePage (requiredFields, bills, data, next) {
  bills.fetched = []

  const invoices = data.content.infoFacturation.invoices

  for (const inv of invoices) {
    if (inv.pdfDispo) {
      const bill = {
        date: moment(inv.invoiceDate, 'DD/MM/YYYY'),
        amount: parseFloat(`${inv.amount.unite}.${inv.amount.centimes}`),
        pdfurl: `${baseURL}api/getFacturePdf/${inv.invoiceNumber}`
      }

      if (bill.date && bill.amount && bill.pdfurl) {
        bills.fetched.push(bill)
      }
    }
  }

  logger.info(`${bills.fetched.length} bill(s) retrieved`)
  next()
}

function customFilterExisting (requiredFields, entries, data, next) {
  filterExisting(logger, Bill)(requiredFields, entries, data, next)
}

function customSaveDataAndFile (requiredFields, entries, data, next) {
  saveDataAndFile(logger, Bill, fileOptions, ['bill'])(
      requiredFields, entries, data, next)
}

function buildNotifContent (requiredFields, entries, data, next) {
  if (entries.filtered && (entries.filtered.length > 0)) {
    entries.notifContent = localization.t('notification bills', {
      smart_count: entries.filtered.length
    })
  }

  next()
}

module.exports = factory.createNew({
  name: 'Virgin mobile',
  description: 'konnector description virginmobile',
  vendorLink: 'https://www.virginmobile.fr/',

  category: 'telecom',
  color: {
    hex: '#D72938',
    css: '#D72938'
  },

  fields: {
    login: {
      type: 'text'
    },
    password: {
      type: 'password'
    },
    folderPath: {
      type: 'folder',
      advanced: true
    }
  },

  dataType: [
    'bill'
  ],

  models: [Bill],

  fetchOperations: [
    login,
    parsePage,
    customFilterExisting,
    customSaveDataAndFile,
    linkBankOperation({
      log: logger,
      minDateDelta: 1,
      maxDateDelta: 1,
      model: Bill,
      amountDelta: 0.1,
      identifier: ['virgin mobile']
    }),
    buildNotifContent
  ]
})
