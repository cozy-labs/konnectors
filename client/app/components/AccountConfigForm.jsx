/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'

import statefulForm from '../lib/statefulForm'
import Field from './Field'

const mapObject = (obj, cb) => Object.keys(obj).map(k => cb(obj[k], k))

const formConfig = ({ t, fields, slug }) => {
  let values = {}
  Object.keys(fields).forEach(name => {
    if (fields[name].advanced) {
      fields[name].type = 'hidden'
      if (fields[name].default) {
        values[name] = fields[name].default.replace(/<my_accounts>/gi, t('my_accounts title'))
      }
    }
  })
  return {
    fields,
    values
  }
}

const AccountConfigForm = ({ t, fields, dirty, submit, submitting }) => (
  <div class='account-form'>
    {mapObject(fields, (field, name) => <Field label={t(name)} {...field} />)}
    <div class='account-form-controls'>
      <button aria-busy={submitting ? 'true' : 'false'} onClick={submit}>{t('my_accounts account config button')}</button>
    </div>
  </div>
)

export default translate()(
  statefulForm(props => formConfig(props))(AccountConfigForm)
)
