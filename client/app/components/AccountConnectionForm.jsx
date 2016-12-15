/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'

import statefulForm from '../lib/statefulForm'
import Field, { PasswordField } from './Field'

const formConfig = ({ t, fields, connectorName }) => {
  let values = {}
  Object.keys(fields).forEach(name => {
    if (fields[name].default) {
      values[name] = fields[name].default.replace(/<my_accounts>/gi, t('my_accounts title'))
                                         .replace(/<account>/gi, connectorName)
    }
  })
  return {
    fields,
    values
  }
}

const AccountConnectionForm = ({ t, fields, dirty, error, submit, submitting }) => (
  <div class={'account-form' + (error ? ' error' : '')}>
    {Object.keys(fields)
      .filter(name => !fields[name].advanced)
      .map(name => {
        if (fields[name].type === 'password') {
          return <PasswordField label={t(name)} {...fields[name]} />
        }
        return <Field label={t(name)} {...fields[name]} />
      }
    )}
    <div class='account-form-controls'>
      <button
        disabled={!dirty}
        aria-busy={submitting ? 'true' : 'false'}
        onClick={submit}
      >
        {t('my_accounts account config button')}
      </button>
      {error === 'bad credentials' &&
        <p class='errors'>{t('my_accounts account config bad credentials')}</p>
      }
    </div>
  </div>
)

export default translate()(
  statefulForm(props => formConfig(props))(AccountConnectionForm)
)
