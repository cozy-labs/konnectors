/** @jsx h */
import { h, Component } from 'preact'

export class AccountStore {
  constructor (accounts) {
    this.accounts = accounts
  }

  connectAccount (slug, values) {
    console.log(values)
  }
}

export class Provider extends Component {
  getChildContext () {
    return { store: this.store }
  }

  constructor (props, context) {
    super(props, context)
    this.store = props.store
  }

  render ({children}) {
    return children && children[0] || null
  }
}

export const connectToStore = () => {
  return (WrappedComponent) => {
    const _wrapped = (props, context) => (
      <WrappedComponent {...props} store={context.store} />
    )
    return _wrapped
  }
}
