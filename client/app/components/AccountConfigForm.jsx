/** @jsx h */
import { h } from 'preact'

import Field, { DropdownField } from './Field'
import AccountLoginForm from './AccountLoginForm'

const AccountConfigForm = ({ t, customView, fields, dirty, error, submit, submitting }) => (
  <div class={'account-form' + (error ? ' error' : '')}>
    {fields.calendar &&
      <div>
        <h3>{t('my_accounts calendar')}</h3>
        <Field label={false} {...fields.calendar} />
      </div>
    }
    {fields.folderPath &&
      <div>
        <h3>{t('my_accounts folder')}</h3>
        <DropdownField label={false} {...fields.folderPath} />
      </div>
    }
    <h3>{t('my_accounts interval')}</h3>
    <Field label={false} {...fields.frequency}>
      <select className='account-field-dropdown'>
        <option value='none'>{t('none')}</option>
        <option value='hour'>{t('every hour')}</option>
        <option value='day'>{t('every day')}</option>
        <option value='week'>{t('every week')}</option>
        <option value='month'>{t('every month')}</option>
      </select>
    </Field>
    <h3>{t('my_accounts account')}</h3>
    <AccountLoginForm t={t} customView={customView} fields={fields} />
  </div>
)

export default AccountConfigForm
