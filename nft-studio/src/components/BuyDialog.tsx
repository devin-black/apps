import { Button, Shelf, Stack, Text } from '@centrifuge/fabric'
import BN from 'bn.js'
import * as React from 'react'
import { useQueryClient } from 'react-query'
import { Dec } from '../utils/Decimal'
import { useAddress } from '../utils/useAddress'
import { useBalance } from '../utils/useBalance'
import { useCentrifugeTransaction } from '../utils/useCentrifugeTransaction'
import { useNFT } from '../utils/useNFTs'
import { ButtonGroup } from './ButtonGroup'
import { Dialog } from './Dialog'

type Props = {
  open: boolean
  onClose: () => void
  collectionId: string
  nftId: string
}
// TODO: replace with better fee estimate
const TRANSFER_FEE_ESTIMATE = 0.1

export const BuyDialog: React.FC<Props> = ({ open, onClose, collectionId, nftId }) => {
  const queryClient = useQueryClient()
  const address = useAddress()
  const { data: balance } = useBalance()
  const nft = useNFT(collectionId, nftId)

  const isConnected = !!address

  const {
    execute: doTransaction,
    reset: resetLastTransaction,
    isLoading: transactionIsPending,
  } = useCentrifugeTransaction('Buy NFT', (cent) => cent.nfts.buyNft, {
    onSuccess: () => {
      queryClient.invalidateQueries(['nfts', collectionId])
      queryClient.invalidateQueries(['accountNfts', address])
      close()
    },
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!isConnected || !nft || nft.sellPrice === null) return

    doTransaction([collectionId, nftId, new BN(nft.sellPrice)])
  }

  function reset() {
    resetLastTransaction()
  }

  function close() {
    reset()
    onClose()
  }

  const priceDec = Dec(nft?.sellPrice ?? 0).div('1e18')
  const balanceDec = Dec(balance ?? 0)

  const balanceLow = balanceDec.lt(priceDec.add(Dec(TRANSFER_FEE_ESTIMATE)))

  const disabled = balanceLow || !nft

  function getMessage() {
    if (balance == null) return
    if (balanceDec.lt(priceDec)) return 'Insufficient funds to purchase this NFT'
    if (balanceLow) return 'Insufficient funds to pay for transaction costs'
  }

  const message = getMessage()

  return (
    <Dialog isOpen={open} onClose={close}>
      <form onSubmit={submit}>
        <Stack gap={3}>
          <Text variant="heading2" as="h2">
            Buy NFT
          </Text>
          <Stack>
            <Shelf gap={1} alignItems="baseline">
              <Stack>
                <Text variant="heading1" fontWeight={400}>
                  {nft?.sellPrice && `${formatPrice(priceDec.toNumber())} AIR`}
                </Text>
                {balance != null && <Text variant="label2">{formatPrice(balance)} AIR balance</Text>}
              </Stack>
            </Shelf>
          </Stack>
          <Shelf justifyContent="space-between">
            {message && <Text variant="label2">{message}</Text>}
            <ButtonGroup ml="auto">
              <Button variant="outlined" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={disabled} loading={transactionIsPending}>
                Buy NFT
              </Button>
            </ButtonGroup>
          </Shelf>
        </Stack>
      </form>
    </Dialog>
  )
}

function formatPrice(number: number) {
  return number.toLocaleString('en', { maximumSignificantDigits: 2 })
}