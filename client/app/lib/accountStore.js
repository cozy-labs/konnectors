/** @jsx h */
import { h, Component } from 'preact'

export class AccountStore {
  constructor (accounts) {
    this.listeners = []
    this.state = {
      working: false,
      accounts: accounts
    }
  }

  getState () {
    return this.state
  }

  setState (newState) {
    this.state = Object.assign({}, this.state, newState)
    this.notifyListeners(newState)
  }

  notifyListeners (newState) {
    this.listeners.forEach(listener => listener(newState))
  }

  subscribe (listener) {
    this.listeners.push(listener)
  }

  unsubscribe (listener) {

  }

  connectAccount (slug, values) {
    this.setState({working: true})
    fetch(`/konnectors/${slug}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'ContentType': 'application/json'
      },
      body: JSON.stringify(values)
    }).then(response => {
      this.setState({working: false})
      console.log(response)
    })
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

export const connectToStore = (mapStateToProps, mapStoreToProps) => {
  return (WrappedComponent) => {
    class Connected extends Component {
      constructor (props, context) {
        super(props, context)
        this.store = context.store
        this.state = Object.assign({}, mapStateToProps(this.store.getState()), mapStoreToProps(this.store, props))
        this.store.subscribe(newState => {
          this.setState(mapStateToProps(newState))
        })
      }

      render () {
        return (
          <WrappedComponent {...this.props} {...this.state} />
        )
      }
    }
    return Connected
  }
}
