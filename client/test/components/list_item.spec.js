/* eslint-env mocha */
// Import Vue and the component being tested
// import { expect } from 'chai'
// import Vue from 'vue'
// import listItem from '../../app/components/list_item.vue'

// describe('list_item component', () => {
//   let component;
//   let vm;

//   // required component props to prevent Vue validation errors
//   listItem.props.title = 'A component title'
//   listItem.props.link = '#'

//   afterEach(function() {
//     if (vm && vm._isMounted) vm.$destroy()
//   })

//   describe('data property', () => {
//     it('sets the correct default data', () => {
//       expect(listItem.data).to.be.a('function')

//       // arrange
//       const componentCreated = new Vue(listItem)
//       const expectedData = {
//         headerBackground: {
//           background: 'white'
//         }
//       }

//       // expect
//       expect(componentCreated.$data)
//         .to.deep.equal(expectedData)
//     })

//     it('sets the correct data if backgroundCSS provided', () => {
//       expect(listItem.data).to.be.a('function')

//       // arrange
//       listItem.backgroundCSS = 'rgba(0, 35, 185, 0.9)'
//       const expectedData = {
//         headerBackground: {
//           background: 'rgba(0, 35, 185, 0.9)'
//         }
//       }

//       // act
//       const resultData = listItem.data()

//       // expect
//       expect(resultData)
//         .to.deep.equal(expectedData)

//       // clean
//       delete listItem.backgroundCSS
//     })
//   })

//   describe('computed property', () => {
//     it('sets no icon by default', () => {
//       expect(listItem.computed.icon).to.be.a('function')

//       // arrange
//       const componentCreated = new Vue(listItem)

//       // expect
//       expect(componentCreated.icon)
//         .to.deep.equal('')
//     })

//     it('sets default icon if enableDefaultIcon is true and no iconName is provided', () => {
//       expect(listItem.computed.icon).to.be.a('function')

//       // arrange
//       listItem.computed.enableDefaultIcon = true
//       const expectedIcon =
//         '/_karma_webpack_/img/default_myaccount.svg'

//       // act
//       const resultIcon = listItem.computed.icon()

//       // expect
//       expect(resultIcon)
//         .to.equal(expectedIcon)

//       // clean
//       delete listItem.computed.enableDefaultIcon
//     })

//     it('sets correct icon if existing icon name is provided', () => {
//       expect(listItem.computed.icon).to.be.a('function')

//       // arrange
//       listItem.computed.iconName = 'ameli'
//       const expectedIcon =
//         '/_karma_webpack_/img/ameli.svg'

//       // act
//       const resultIcon = listItem.computed.icon()

//       // expect
//       expect(resultIcon)
//         .to.equal(expectedIcon)

//       // clean
//       delete listItem.computed.iconName
//     })
//   })

//   describe('properties', () => {
//     it('sets the correct default properties', () => {
//       // arrange
//       const componentCreated = new Vue(listItem)

//       // expect
//       expect(componentCreated.enableDefaultIcon)
//         .to.equal(false)
//       expect(componentCreated.backgroundCSS)
//         .to.equal('white')
//     })
//   })
// })
