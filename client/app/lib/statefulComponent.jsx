/** @jsx h */
import { h, Component } from 'preact'

/**
 * Higher Order Component that wraps functional components into stateful components.
 * Defining a stateful component becomes a matter of setting its initial state
 * and writing a handful of reducers on that state. The state and the reducers will
 * be passed as props to the wrapped functional component.
 * Example:
 * const ToggleButton = statefulComponent(initialState = {
 *   on: false
 * }, eventHandlers = {
 *   toggle: (e, state) => {
 *     return { on: !state.on }
 *   }
 * })(
 *   ({ on, toggle }) => (
 *     <button class={on ? 'on' : 'off'} onClick={toggle}>Go!</button>
 *   )
 * )
 */
const statefulComponent = (initialState, eventHandlers) => {
  return WrappedComponent => {
    return class StatefulComponent extends Component {
      constructor (props) {
        super(props)
        this.state = initialState
        this.handlers = this.setupHandlers(eventHandlers)
      }

      setupHandlers (eventHandlers) {
        let fn
        let handlers = {}
        Object.keys(eventHandlers).forEach(propName => {
          fn = e => {
            this.setState(eventHandlers[propName](e, this.state))
          }
          handlers[propName] = fn.bind(this)
        })
        return handlers
      }

      render () {
        return (
          <WrappedComponent {...this.props} {...this.state} {...this.handlers} />
        )
      }
    }
  }
}

export default statefulComponent
