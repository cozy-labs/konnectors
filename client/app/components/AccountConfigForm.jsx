/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'

import statefulForm from '../lib/statefulForm'
import Field, { DropdownField } from './Field'
import { AccountFields } from './AccountConnectionForm'

const formConfig = ({ t, fields, values = {}, connectorName }) => {
  fields.importInterval = {
    type: 'text',
    advanced: true
  }
  return {
    fields,
    values
  }
}

const AccountConfigForm = ({ t, fields, folders, dirty, error, submit, submitting }) => (
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
        <DropdownField label={false} {...fields.folderPath} options={folders} />
      </div>
    }
    <h3>{t('my_accounts interval')}</h3>
    <Field label={false} {...fields.importInterval}>
      <select className='account-field-dropdown'>
        <option value='none'>{t('none')}</option>
        <option value='hour'>{t('every hour')}</option>
        <option value='day'>{t('every day')}</option>
        <option value='week'>{t('every week')}</option>
        <option value='month'>{t('every month')}</option>
      </select>
    </Field>
    <h3>{t('my_accounts account')}</h3>
    <AccountFields t={t} fields={fields} />
  </div>
)

export default translate()(
  statefulForm(props => formConfig(props))(AccountConfigForm)
)
