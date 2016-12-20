// Library related to accounts

export default {

  // check konnectors properties and use fallbacks if necessary
  checkProperties (accounts) {
    accounts.map(a => {
      const fields = a.fields // reference
      if (fields) {
        // check calendar field
        if (fields.calendar && !fields.calendar.default) {
          // <account> will be replaced by the matching account name
          fields.calendar.default = '<account>'
        }

        // check folderPath field
        if (fields.folderPath && !fields.folderPath.default) {
          // <my_accounts> will be replaced by the localized app name
          fields.folderPath.default = `<my_accounts>/<account>`
        }

        // check frequency field
        if (fields.frequency && !fields.frequency.default) {
          fields.frequency.default = 'weekly'
        }
        if (fields.frequency &&
          (!fields.frequency.options || !fields.frequency.options.length)) {
          fields.frequency.options = ['hourly', 'daily', 'weekly', 'monthly']
        }
      }
    })
    return accounts
  }
}
