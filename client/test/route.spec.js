import { expect } from 'chai'
import { h, render, rerender } from 'preact'
import { route } from 'preact-router'
import App from '../app/app'

describe('App', () => {
    let scratch

    before( () => {
        scratch = document.createElement('div');
        (document.body || document.documentElement).appendChild(scratch)
    })

    beforeEach( () => {
        scratch.innerHTML = ''
    })

    after( () => {
        scratch.parentNode.removeChild(scratch)
        scratch = null
    })

    describe('routing', () => {
        it('should render the discovery page', () => {
            render(<App konnectors={[]}/>, scratch)
            route('/')
            expect(scratch.querySelector('main').innerHTML).to.contain('Discovery')
        })

        it('should render /category', () => {
            render(<App konnectors={[]}/>, scratch)
            route('/category')
            //rerender()
            expect(scratch.querySelector('main').innerHTML).to.contain('All accounts')
        })
    })
})