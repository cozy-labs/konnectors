/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'

import statefulForm from '../lib/statefulForm'
import Field, { PasswordField, DropdownField } from './Field'

const formConfig = ({ t, customView, fields, connectorName }) => {
  let values = {}
  Object.keys(fields).forEach(name => {
    if (fields[name].default) {
      values[name] = fields[name].default.replace(/<my_accounts>/gi, t('my_accounts title'))
                                         .replace(/<account>/gi, connectorName)
    }
  })
  return {
    customView,
    fields,
    values
  }
}

export const AccountFields = ({ t, customView, fields }) => (
  <div class='account-form-login'>
    {customView &&
      <div class='coz-custom-view'
        dangerouslySetInnerHTML={{
          __html: customView.replace(/<%t (.*) %>/gi, (match, $1) => t($1))
        }} />
    }
    {Object.keys(fields)
      .filter(name => !fields[name].advanced)
      .map(name => {
        if (fields[name].type === 'password') {
          return <PasswordField label={t(name)} {...fields[name]} />
        }
        if (fields[name].type === 'dropdown') {
          return <DropdownField label={t(name)} {...fields[name]} />
        }
        return <Field label={t(name)} {...fields[name]} />
      }
    )}
  </div>
)

const AccountConnectionForm = ({ t, customView, fields, dirty, error, submit, submitting }) => (
  <div class={'account-form' + (error ? ' error' : '')}>
    <AccountFields t={t} customView={customView} fields={fields} />
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
