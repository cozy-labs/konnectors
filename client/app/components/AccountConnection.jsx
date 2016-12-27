/** @jsx h */
import { h } from 'preact'
import statefulForm from '../lib/statefulForm'

import AccountLoginForm from './AccountLoginForm'

const AccountConnection = ({ t, name, customView, connectUrl, fields, dirty, error, submit, submitting }) => (
  <div class='account-connection'>
    <div>
      <h3>Lorem ipsum</h3>
    </div>
    <div>
      <h3>{t('my_accounts account config title', {name: name})}</h3>
      <div class={'account-form' + (error ? ' error' : '')}>
        <AccountLoginForm
          t={t}
          customView={customView}
          connectUrl={connectUrl}
          fields={fields}
        />
        {!connectUrl &&
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
        }
      </div>
    </div>
  </div>
)

export default statefulForm()(AccountConnection)
