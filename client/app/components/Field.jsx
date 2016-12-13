/** @jsx h */
import { h, cloneElement } from 'preact'
import classNames from 'classnames'

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
