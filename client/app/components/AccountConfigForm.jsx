/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'

import statefulForm from '../lib/statefulForm'
import Field from './Field'

const mapObject = (obj, cb) => Object.keys(obj).map(k => cb(obj[k], k))

const formConfig = ({ fields, slug }) => {
  let type
  let values = {}
  // Object.keys(fields).forEach(name => {
  //   if (name === 'folderPath') {
  //     fields[name].type = 'hidden'
  //     values[name] = `Administration/${slug}`
  //   } else if (name === 'calendar') {
  //     fields[name].type = 'hidden'
  //     values[name] = `Mes Comptes/${slug}`
  //   }
  // })
  return {
    fields,
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
