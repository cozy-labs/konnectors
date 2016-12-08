// Library related to accounts

export default {

  // check konnectors properties and use fallbacks if necessary
  checkProperties (accounts) {
    accounts.map(a => {
      const fields = a.fields // reference
      if (fields) {
        // check calendar field
        if (fields.calendar && !fields.calendar.default) {
          if (typeof fields.calendar !== 'object') {
            fields.calendar = {}
          }
          fields.calendar.default = a.name
          if (!fields.calendar.type) fields.calendar.type = 'text'
        }

        // check folderPath field
        if (fields.folderPath && !fields.folderPath.default) {
          if (typeof fields.folderPath !== 'object') {
            fields.folderPath = {}
          }
          // <my_accounts> will be replaced by the localized app name
          fields.folderPath.default = `<my_accounts>/${a.name}`
          if (!fields.folderPath.type) fields.folderPath.type = 'text'
        }

        // check frequency field
        if (fields.frequency && !fields.frequency.default) {
          if (typeof fields.frequency !== 'object') {
            fields.frequency = {}
          }
          fields.frequency.default = 'weekly'
          if (!fields.frequency.type) fields.frequency.type = 'text'
        }
      }
    })
    return accounts
  }
}
