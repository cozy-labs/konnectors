/** @jsx h */
import { h } from 'preact'
import statefulForm from '../lib/statefulForm'

import AccountConfigForm from './AccountConfigForm'

const AccountManagement = (props) => {
  const { t, name, accounts, selectedAccount, dirty, submit, submitting } = props
  return (
    <div>
      <div class='account-management'>
        <div class='account-list'>
          <ul>
            {accounts.map((account, key) => (
              <li>
                <a
                  class={selectedAccount === key ? 'selected' : ''}
                  onClick={() => selectAccount(key)}
                >
                  {account.hasOwnProperty('login')
                    ? account.login
                    : t('my_accounts account index', {index: key})}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <AccountConfigForm {...props}
        />
      </div>
      <div class='account-management-controls'>
        <button
          disabled={!dirty}
          aria-busy={submitting ? 'true' : 'false'}
          onClick={submit}
        >
          {t('my_accounts account config button')}
        </button>
      </div>
    </div>
  )
}

export default statefulForm()(AccountManagement)
