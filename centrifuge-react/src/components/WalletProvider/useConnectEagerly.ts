import { getWalletBySource } from '@subwallet/wallet-connect/dotsama/wallets'
import { Wallet } from '@subwallet/wallet-connect/types'
import * as React from 'react'
import { EvmConnectorMeta } from './evm/connectors'
import { Action, getPersisted } from './useWalletState'

let triedEager = false

export function useConnectEagerly(
  connect: (wallet: EvmConnectorMeta | Wallet) => void,
  dispatch: (action: Action) => void,
  evmConnectors: EvmConnectorMeta[]
) {
  async function tryReconnect() {
    const { wallet: source, type } = getPersisted()
    if (!source || !type) return
    if (type === 'substrate') {
      // This script might have loaded quicker than the wallet extension,
      // so we'll wait up to 2 seconds for it to load
      let i = 8
      while (i--) {
        const wallet = getWalletBySource(source)
        if (wallet?.installed) {
          connect(wallet)
          break
        }
        await new Promise((res) => setTimeout(res, 250))
      }
    } else {
      const wallet = evmConnectors.find((c) => c.id === source)
      if (wallet?.connector) {
        if (wallet.connector.connectEagerly) {
          await wallet.connector.connectEagerly()
        } else {
          await wallet.connector.activate()
        }
        dispatch({ type: 'evmSetState', payload: { selectedWallet: wallet } })
        dispatch({ type: 'setConnectedType', payload: 'evm' })
      }
    }
  }

  React.useEffect(() => {
    if (!triedEager && getPersisted().wallet) {
      tryReconnect()
    }
    triedEager = true
  }, [])
}