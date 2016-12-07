/** @jsx h */
import { h, cloneElement } from 'preact'
import classNames from 'classnames'

const Field = (props) => {
  let inputs
  if (props.children.length !== 0) {
    inputs = props.children.map(
      child => cloneElement(child, Object.assign(props, {selected: props.value, className: 'ui-Field-input'}))
    )
  } else {
    const { type, value, onChange, onBlur } = props
    inputs = (<input type={type} placeholder='' className='ui-Field-input' value={value} onChange={onChange} onBlur={onBlur} />)
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
      {errors.length !== 0 && errors.map((err, i) => <small key={i} className='ui-Field-error'>{err}</small>)}
    </div>
  )
}
