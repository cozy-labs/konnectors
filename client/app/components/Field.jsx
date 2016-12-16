/** @jsx h */
import { h, cloneElement, Component } from 'preact'
import classNames from 'classnames'
import { translate } from '../plugins/preact-polyglot'

const Field = (props) => {
  let inputs
  if (props.children.length !== 0) {
    inputs = props.children.map(
      child => cloneElement(child,
        Object.assign(props, {
          selected: props.value,
          className: 'account-field-input'
        })
      )
    )
  } else {
    const { type, placeholder, value, onChange, onBlur } = props
    inputs = (
      <input
        type={type}
        placeholder={placeholder}
        className='account-field-input'
        value={value}
        onChange={onChange}
        onBlur={onBlur}
      />
    )
  }
  return props.type === 'hidden' ? inputs : (
    <FieldWrapper {...props}>
      {inputs}
    </FieldWrapper>
  )
}

export default Field

export const FieldWrapper = ({ required, label, dirty, touched, errors, children }) => {
  var classes = classNames('account-field', {
    'account-field--required': required === true,
    'account-field--error': errors.length !== 0,
    'account-field--dirty': dirty === true || touched === true
  })
  return (
    <div className={classes}>
      <label>{label}</label>
      {children}
      {errors.length !== 0 && errors.map((err, i) => (
        <small key={i} className='account-field-error'>{err}</small>
      ))}
    </div>
  )
}

class Password extends Component {
  constructor (props) {
    super(props)
    this.state = {
      visible: false
    }
    this.toggleVisibility = this.toggleVisibility.bind(this)
  }

  toggleVisibility () {
    this.setState({
      visible: !this.state.visible
    })
  }

  render (props, { visible }) {
    const { t, placeholder, value, onChange, onBlur } = props
    return (
      <FieldWrapper {...props}>
        <button
          type='button'
          title={t('my_accounts account config show password')}
          class='icon password-visibility'
          onClick={this.toggleVisibility}
        >
          {visible
            ? <svg><use xlinkHref={require('../assets/sprites/icon-eye-closed.svg')} /></svg>
            : <svg><use xlinkHref={require('../assets/sprites/icon-eye-open.svg')} /></svg>
          }
        </button>
        <input
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          className='account-field-input'
          value={value}
          onChange={onChange}
          onBlur={onBlur}
        />
      </FieldWrapper>
    )
  }
}

export const PasswordField = translate()(Password)
