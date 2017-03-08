'use strict'

const baseKonnector = require('../lib/base_konnector')
const Bill = require('../models/bill')
const filterExisting = require('../lib/filter_existing')
const localization = require('../lib/localization_manager')
const saveDataAndFile = require('../lib/save_data_and_file')

const connector = module.exports = baseKonnector.createNew({
  name: 'Digiposte',
  vendorLink: 'https://secure.digiposte.fr/identification-plus',
  category: 'bills',
  color: {
    hex: '#FBC32C',
    css: 'linear-gradient(90deg, #EF0001 0%, #FBC32C 100%)'
  },
  fields: {
    email: {
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
  dataType: ['bill'],
  models: [Bill],
  fetchOperations: [fetchBills]
})

function fetchBills (requiredFields, bills, data, next) {
  let request = require('request-promise')
  const j = request.jar()
  // require('request-debug')(request)

  const moment = require('moment')
  const cheerio = require('cheerio')
  const bb = require('bluebird')
  request = request.defaults({
    jar: j,
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:36.0) ' +
                    'Gecko/20100101 Firefox/36.0'
    }
  })
  let xsrfToken = null
  let accessToken = null

  request('https://secure.digiposte.fr/identification-plus')
  .then(body => {
    // getting the login token in the login form
    const $ = cheerio.load(body)
    const loginToken = $('#credentials_recover_account__token').val()
    if (loginToken === undefined) {
      connector.logger.error('Could not get the login token')
      return Promise.reject('parsing error')
    }
    return loginToken
  })
  .then(loginToken => {
    connector.logger.info('The login token is ' + loginToken)
    // now posting login request
    return request({
      uri: 'https://secure.digiposte.fr/login_check',
      qs: {
        isLoginPlus: 1
      },
      method: 'POST',
      followAllRedirects: true,
      form: {
        'login_plus[userType]': 'part',
        'login_plus[login]': requiredFields.email,
        'login_plus[input]': requiredFields.password,
        'login_plus[registrationId]': '',
        'login_plus[trustedContactId]': '',
        'login_plus[tokenCustomization]': '',
        'login_plus[isLoginPlus]': 1,
        'login_plus[_token]': loginToken
      }
    })
  })
  .then(() => {
    // read the XSRF-TOKEN in the cookie jar and add it in the header
    connector.logger.info('Getting the XSRF token')
    const xsrfcookie = j.getCookies('https://secure.digiposte.fr/login_check')
      .find(cookie => cookie.key === 'XSRF-TOKEN')

    // if no xsrf token is found, then we have bad credential
    if (xsrfcookie) {
      xsrfToken = xsrfcookie.value
    } else {
      return Promise.reject('bad credentials')
    }

    xsrfToken = xsrfcookie.value
    connector.logger.info('XSRF token is ' + xsrfToken)
    if (xsrfcookie) return xsrfToken
    else {
      connector.logger.error('Problem fetching the xsrf-token')
      return Promise.reject('token not found')
    }
  })
  .then(() => {
    // Now get the access token
    connector.logger.info('Getting the app access token')
    return request({
      uri: 'https://secure.digiposte.fr/rest/security/tokens',
      headers: {
        'X-XSRF-TOKEN': xsrfToken
      },
      json: true
    })
  })
  .then(body => {
    if (body && body.access_token) {
      accessToken = body.access_token
      connector.logger.info('App access token is ' + accessToken)
      return accessToken
    } else {
      connector.logger.error('Problem fetching the access token')
      return Promise.reject('token not found')
    }
  })
  .then(() => {
    // Now get the list of folders
    connector.logger.info('Getting the list of folders on digiposte')
    return request({
      uri: 'https://secure.digiposte.fr/api/v3/folders/safe',
      headers: {
        'X-XSRF-TOKEN': xsrfToken,
        'Authorization': `Bearer ${accessToken}`
      },
      json: true
    })
  })
  .then(body => {
    // Then, for each folder, get the logo, list of files : name, url, amount, date
    let foldernames = body.folders.map(folder => folder.name)
    connector.logger.info('The list of folders is : ' + JSON.stringify(foldernames))
    connector.logger.info('Getting the list of documents for each folder')
    return bb.mapSeries(body.folders, folder => {
      let result = {
        id: folder.id,
        name: folder.name,
        logo: folder.sender_logo,
        url: folder.sender_url_selfcare
      }
      connector.logger.info(folder.name + '...')
      return request({
        uri: 'https://secure.digiposte.fr/api/v3/documents/search',
        qs: {
          direction: 'DESCENDING',
          max_results: 100,
          sort: 'CREATION_DATE'
        },
        body: {
          folder_id: result.id,
          locations: ['SAFE', 'INBOX']
        },
        method: 'POST',
        headers: {
          'X-XSRF-TOKEN': xsrfToken,
          'Authorization': `Bearer ${accessToken}`
        },
        json: true
      })
      .then(folder => {
        result.docs = folder.documents.filter(doc => doc.invoice).map(doc => {
          const resultDoc = {
            docid: doc.id,
            type: doc.category,
            date: moment(doc.creation_date),
            pdfurl: `https://secure.digiposte.fr/rest/content/document?_xsrf_token=${xsrfToken}`,
            amount: doc.invoice_data.chargeable_amount,
            vendor: doc.sender_name
          }
          return resultDoc
        })
        connector.logger.info('' + result.docs.length + ' bill(s)')
        return result
      })
    })
  })
  .then(folders => {
    // Then, for each folder, filter existing documents
    connector.logger.info('Filtering existing documents')
    return bb.each(folders, folder => {
      return new Promise((resolve, reject) => {
        let entries = {fetched: folder.docs}
        filterExisting(connector.logger, Bill)(requiredFields, entries, {}, err => {
          if (err) {
            connector.logger.error(err)
          } else {
            folder.docs = entries
          }
          resolve()
        })
      })
    }).then(() => Promise.resolve(folders))
  })
  .then(folders => {
    return bb.each(folders, folder => {
      connector.logger.info('Getting vendor ' + folder.name)
      return new Promise((resolve, reject) => {
        saveDataAndFile(connector.logger, Bill, {
          vendor: folder.name,
          dateFormat: 'YYYYMMDD',
          requestoptions: {
            jar: j,
            headers: {
              'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:36.0) ' +
                            'Gecko/20100101 Firefox/36.0'
            },
            method: 'POST',
            form: function (doc) {
              return {
                'document_ids[]': doc.docid
              }
            }
          }
        }, ['bill'])({folderPath: (requiredFields.folderPath + '/' + folder.name)}, folder.docs, {}, err => {
          if (err) {
            connector.logger.error('Error getting one of ' + JSON.stringify(folder.docs))
          }
          resolve()
        })
      })
    }).then(() => Promise.resolve(folders))
  })
  .then(folders => {
    // generation of the notification content
    let nb = folders.reduce((memo, folder) => {
      if (folder.docs.filtered) memo += folder.docs.filtered.length
      return memo
    }, 0)
    connector.logger.info('Number of fetched documents : ' + nb)
    if (nb > 0) {
      const localizationKey = 'notification bills'
      const options = {
        smart_count: nb
      }
      next(null, localization.t(localizationKey, options))
    }
  })
  .catch(err => {
    connector.logger.error(err)
    next(err)
  })
}
