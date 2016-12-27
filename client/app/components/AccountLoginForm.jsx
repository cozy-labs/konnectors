/** @jsx h */
import { h } from 'preact'

import Field, { PasswordField, DropdownField } from './Field'

const AccountLoginForm = ({ t, customView, connectUrl, fields }) => (
  <div class='account-form-login'>
    {customView &&
      <div class='coz-custom-view'
        dangerouslySetInnerHTML={{
          __html: customView.replace(/<%t (.*) %>/gi, (match, $1) => t($1))
        }} />
    }
    {connectUrl &&
      <div class='coz-connect-url'>
        <a href={connectUrl} role='button'>{t('oauth connect')}</a>
      </div>
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

export default AccountLoginForm
