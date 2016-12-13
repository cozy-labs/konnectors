/** @jsx h */
/* global fetch */
import { h, Component } from 'preact'

export class AccountStore {
  constructor (accounts) {
    this.listeners = []
    this.state = {
      working: false,
      connectors: accounts // TODO: rename accounts to connectors
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
    this.listeners.splice(this.listeners.indexOf(listener), 1)
  }

  startAccountPoll (connectorId, timeout = 10000, interval = 500) {
    let endTime = Number(new Date()) + timeout

    let checkCondition = function (resolve, reject) {
      return this.fetch('GET', `konnectors/${connectorId}`)
        .then(response => response.text()).then(body => {
          let connector = JSON.parse(body)
          if (!connector.isImporting) {
            if (!connector.importErrorMessage) {
              resolve(connector)
            } else {
              reject(new Error(connector.importErrorMessage))
            }
          } else if (Number(new Date()) < endTime) {
            setTimeout(checkCondition, interval, resolve, reject)
          } else {
            reject(new Error('polling timed out'))
          }
        })
    }.bind(this)
    return new Promise((resolve, reject) => {
      setTimeout(checkCondition, 500, resolve, reject)
    })
  }

  connectAccount (connectorId, values) {
    let connector = this.state.connectors.find(c => c.id === connectorId)
    connector.accounts.push(values)
    this.setState({working: true})
    return this.fetch('PUT', `konnectors/${connectorId}`, connector)
      .then(response => {
        if (response.status === 200) {
          return this.startAccountPoll(connectorId)
        } else {
          this.setState({working: false})
          return Promise.reject(response)
        }
      }).then(() => {
        this.setState({working: false})
        return Promise.resolve()
      }).catch(error => {
        this.setState({working: false})
        return Promise.reject(error)
      })
  }

  fetch (method, url, body) {
    let params = {
      method: method,
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }
    if (body) {
      params.body = JSON.stringify(body)
    }
    return fetch(url, params)
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
        this.state = Object.assign(
          {},
          mapStateToProps(this.store.getState()),
          mapStoreToProps(this.store, props)
        )
        this.handleStoreUpdate = this.handleStoreUpdate.bind(this)
        this.store.subscribe(this.handleStoreUpdate)
      }

      componentDidUnmount () {
        this.store.unsubscribe(this.handleStoreUpdate)
      }

      handleStoreUpdate (newState) {
        this.setState(mapStateToProps(newState))
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
