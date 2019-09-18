import { call, put } from 'redux-saga/effects'
import * as Action from './constants'

import { thorify } from 'thorify'
import { extend } from 'thorify/dist/extend'

var Web3 = require('web3')

/*
 * Initialization
 */

export function * initializeWeb3 ({ options }) {
  try {
    var web3 = {}

    if (options && options.vechain) {
      console.warn('Try to connect to Thor network with options', options)

      // Checking if Thor has been injected by the browser
      if (typeof thor !== 'undefined' && typeof options.thorify === 'undefined') {
        // Use thor provider
        // eslint-disable-next-line no-undef
        web3 = new Web3(thor)
        // Extend web3 to connect to VeChain Blockchain
        extend(web3)
      } else {
        // Fall back to default thorified construction to main net
        web3 = thorify(new Web3(), options.vechain)
      }

      console.warn('Thorified web3 instance', web3)

      yield put({ type: Action.WEB3_INITIALIZED })
      return web3
    }

    if (options && options.web3 && options.web3.customProvider) {
      web3 = new Web3(options.web3.customProvider)
      yield put({ type: Action.WEB3_INITIALIZED })
      return web3
    }

    if (window.ethereum) {
      const { ethereum } = window
      web3 = new Web3(ethereum)
      try {
        yield call(ethereum.enable)
        yield put({ type: Action.WEB3_INITIALIZED })
        return web3
      } catch (error) {
        // User denied account access...
        console.log(error)
      }
    } else if (typeof window.web3 !== 'undefined') {
      // Checking if Web3 has been injected by the browser (Mist/MetaMask)
      // Use Mist/MetaMask's provider.
      web3 = new Web3(window.web3.currentProvider)
      yield put({ type: Action.WEB3_INITIALIZED })

      return web3
    } else if (options.fallback) {
      // Attempt fallback if no web3 injection.
      switch (options.fallback.type) {
        case 'ws':
          var provider = new Web3.providers.WebsocketProvider(
            options.fallback.url
          )
          web3 = new Web3(provider)
          yield put({ type: Action.WEB3_INITIALIZED })
          return web3

        default:
          // Invalid options; throw.
          throw new Error('Invalid web3 fallback provided.')
      }
    } else {
      // Out of web3 options; throw.
      throw new Error('Cannot find injected web3 or valid fallback.')
    }
  } catch (error) {
    yield put({ type: Action.WEB3_FAILED, error })
    console.error('Error intializing web3:')
    console.error(error)
  }
}

/*
 * Network ID
 */

export function * getNetworkId ({ web3, options }) {
  // Mask VeChain as Ethereum network
  if (typeof options.vechain !== 'undefined' && options.vechain) {
    if (options.vechain === true || options.vechain.indexOf('mainnet') > -1) {
      yield put({ type: Action.NETWORK_ID_FETCHED, networkId: 1 })
      console.warn('Connected to Mainnet')
    } else if (options.vechain.indexOf('testnet') > -1) {
      // TODO: add testnet handler properly
      yield put({ type: Action.NETWORK_ID_FETCHED, networkId: 3 })
      console.warn('Connected to Testnet')
    } else if (options.vechain.indexOf('localhost') > -1) {
      yield put({ type: Action.NETWORK_ID_FETCHED, networkId: 5777 })
      console.warn('Connected to Devnet')
    }

  } else {
    try {
      const networkId = yield call(web3.eth.net.getId)

      yield put({ type: Action.NETWORK_ID_FETCHED, networkId })

      return networkId
    } catch (error) {
      yield put({ type: Action.NETWORK_ID_FAILED, error })

      console.error('Error fetching network ID:')
      console.error(error)
    }
  }
}