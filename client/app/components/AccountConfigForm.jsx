/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'

import statefulForm from '../lib/statefulForm'
import Field from './Field'

const mapObject = (obj, cb) => Object.keys(obj).map(k => cb(obj[k], k))

const formConfig = ({ fields, slug }) => {
  let type
  let newFields = {}
  let values = {}
  Object.keys(fields).forEach(name => {
    type = fields[name]
    if (type === 'folder') {
      newFields[name] = { type: 'hidden' }
      values[name] = `Administration/${slug}`
    } else if (name === 'calendar') {
      newFields[name] = { type: 'hidden' }
      values[name] = `Mes Comptes/${slug}`
    } else {
      newFields[name] = { type: type }
    }
  })
  return {
    fields: newFields,
    values
  }
}

const AccountConfigForm = ({ t, fields, dirty, submit, submitting }) => (
  <div class='account-form'>
    {mapObject(fields, (field, name) => <Field label={t(name)} {...field} />)}
    <div class='account-form-controls'>
      <button aria-busy={submitting ? 'true': 'false'} onClick={submit}>{t('my_accounts account config button')}</button>
    </div>
  </div>
)

export default translate()(
  statefulForm(props => formConfig(props))(AccountConfigForm)
)
