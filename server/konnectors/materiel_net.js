'use strict'

const request = require('request')
const cheerio = require('cheerio')
const moment = require('moment')

const filterExisting = require('../lib/filter_existing')
const saveDataAndFile = require('../lib/save_data_and_file')
const localization = require('../lib/localization_manager')
const linkBankOperation = require('../lib/link_bank_operation')
const factory = require('../lib/base_konnector')

const Bill = require('../models/bill')

const logger = require('printit')({
  prefix: 'Materiel.net',
  date: true
})

const baseURL = 'https://www.materiel.net/'

const billsTableSelector = '#client table.EpCmdList'

const fileOptions = {
  vendor: 'Materiel.net',
  dateFormat: 'YYYYMMDD'
}

/**
 * @param {string} html
 * @return cheerio[]
 */
function extractBillsRows (html) {
  const $ = cheerio.load(html)
  const container = $(billsTableSelector)
  return container.find('tr[class^="Line"]').toArray().map(r => $(r))
}

function fetchBillPageBillsList (options, cb) {
  request(options, (err, res, body) => {
    if (err) {
      logger.info(`Could not fetch bills list from ${options.url}`)
      return cb(null)
    }

    cb(extractBillsRows(body))
  })
}

// Login layer
function login (requiredFields, billInfos, data, next) {
  const signInOptions = {
    method: 'POST',
    jar: true,
    url: `${baseURL}pm/client/logincheck.nt.html`,
    form: {
      login: requiredFields.login,
      pass: requiredFields.password
    }
  }

  const billsOptions = {
    method: 'GET',
    jar: true,
    url: `${baseURL}pm/client/commande.html`
  }

  logger.info('Signing in')
  request(signInOptions, (err) => {
    if (err) {
      logger.error('Signin failed')
      return next('bad credentials')
    }

    // Download bill information page.
    logger.info('Fetching bills list')
    request(billsOptions, (err, res, body) => {
      if (err) {
        logger.error('An error occured while fetching bills list')
        return next('no bills retrieved')
      }

      // Check if there are several pages
      const $ = cheerio.load(body)
      const otherPages = $(`${billsTableSelector} tr.EpListBLine td:first-child`).text()
      const nbPagesPos = otherPages.lastIndexOf(' ') + 1
      let nbPages = 1
      if (nbPagesPos) {
        nbPages = parseInt(otherPages.substr(nbPagesPos), 10)
        if (isNaN(nbPages)) {
          nbPages = 1
        }
      }

      // If there are are several pages, parse all the pages to retrieve all the
      // bills
      if (nbPages > 1) {
        let totalPagesParsed = 0
        const billsList = $(billsTableSelector)
        const _fetchPageFromIndex = idx => {
          const pageOptions = Object.create(billsOptions)
          pageOptions.url += `?page=${idx}`
          logger.info(`Fetching page ${idx} of ${nbPages}…`)
          fetchBillPageBillsList(pageOptions, rows => {
            // We now reinsert the rows in the first page's list
            if (rows) {
              billsList.append(rows)
            }

            if (++totalPagesParsed === (nbPages - 1)) {
              logger.info('All bills pages fetched')
              data.html = $.html()
              next()
            }
          })
        }

        for (let pageIndex = 2; pageIndex <= nbPages; ++pageIndex) {
          _fetchPageFromIndex(pageIndex)
        }
      } else {
        data.html = body
        next()
      }
    })
  })
}

function parsePage (requiredFields, bills, data, next) {
  bills.fetched = []

  const rows = extractBillsRows(data.html)
  for (const row of rows) {
    const cells = row.find('td')
    const ref = cells.eq(0).text().trim()
    const date = cells.eq(1).text().trim()
    const price = cells.eq(2).text().trim()
                           .replace(' €', '')
                           .replace(',', '.')
    const status = cells.eq(3).text()
                            .trim()
                            .toLowerCase()

    if ((status === 'terminée') || (status === 'commande expédiée')) {
      const bill = {
        date: moment(date, 'DD/MM/YYYY'),
        amount: parseFloat(price),
        pdfurl: `${baseURL}pm/client/facture.nt.html?ref=${ref}`
      }

      bills.fetched.push(bill)
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
  name: 'Materiel.net',
  description: 'konnector description materiel_net',
  vendorLink: baseURL,

  category: 'others',
  color: {
    hex: '#D2312D',
    css: '#D2312D'
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
      identifier: ['materiel.net']
    }),
    buildNotifContent
  ]
})
