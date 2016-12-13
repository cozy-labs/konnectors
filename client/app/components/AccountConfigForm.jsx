/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'

import statefulForm from '../lib/statefulForm'
import Field from './Field'

const formConfig = ({ t, fields, accountName }) => {
  let values = {}
  Object.keys(fields).forEach(name => {
    if (fields[name].default) {
      values[name] = fields[name].default.replace(/<my_accounts>/gi, t('my_accounts title'))
                                         .replace(/<account>/gi, accountName)
    }
  })
  return {
    fields,
    values
  }
}

const AccountConfigForm = ({ t, fields, dirty, submit, submitting }) => (
  <div class='account-form'>
    {Object.keys(fields)
      .filter(name => !fields[name].advanced)
      .map(name => (
        <Field label={t(name)} {...fields[name]} />
      )
    )}
    <div class='account-form-controls'>
      <button
        aria-busy={submitting ? 'true' : 'false'}
        onClick={submit}
      >
        {t('my_accounts account config button')}
      </button>
    </div>
  </div>
)

export default translate()(
  statefulForm(props => formConfig(props))(AccountConfigForm)
)
