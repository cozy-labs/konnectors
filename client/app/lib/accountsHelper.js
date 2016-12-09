// Library related to accounts

export default {

  // check konnectors properties and use fallbacks if necessary
  checkProperties (accounts) {
    accounts.map(a => {
      const fields = a.fields // reference
      if (fields) {
        // check calendar field
        if (fields.calendar && !fields.calendar.default) {
          fields.calendar.default = a.name
        }

        // check folderPath field
        if (fields.folderPath && !fields.folderPath.default) {
          // <my_accounts> will be replaced by the localized app name
          fields.folderPath.default = `<my_accounts>/${a.name}`
        }

        // check frequency field
        if (fields.frequency && !fields.frequency.default) {
          fields.frequency.default = 'weekly'
        }
      }
    })
    return accounts
  }
}
