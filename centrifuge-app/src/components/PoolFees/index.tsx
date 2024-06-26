import { addressToHex, CurrencyBalance, Rate, TokenBalance } from '@centrifuge/centrifuge-js'
import { useAddress, useCentrifugeQuery, useCentrifugeTransaction } from '@centrifuge/centrifuge-react'
import { Box, Button, IconCheckInCircle, IconSwitch, Shelf, Text } from '@centrifuge/fabric'
import { BN } from 'bn.js'
import * as React from 'react'
import { useHistory, useLocation, useParams } from 'react-router'
import { CopyToClipboard } from '../../utils/copyToClipboard'
import { formatBalance, formatPercentage } from '../../utils/formatting'
import { usePoolAdmin } from '../../utils/usePermissions'
import { usePool, usePoolMetadata } from '../../utils/usePools'
import { DataTable } from '../DataTable'
import { PageSection } from '../PageSection'
import { PageSummary } from '../PageSummary'
import { RouterLinkButton } from '../RouterLinkButton'
import { Tooltips } from '../Tooltips'
import { ChargeFeesDrawer } from './ChargeFeesDrawer'
import { EditFeesDrawer } from './EditFeesDrawer'

type Row = {
  name: string
  type?: string
  percentOfNav?: Rate
  pendingFees?: TokenBalance
  receivingAddress?: string
  action: null | React.ReactNode
  poolCurrency?: string
  index: number
  feePosition: 'Top of waterfall'
}

export function PoolFees() {
  const { pid: poolId } = useParams<{ pid: string }>()
  const pool = usePool(poolId)
  const { data: poolMetadata } = usePoolMetadata(pool)
  const { search, pathname } = useLocation()
  const { push } = useHistory()
  const params = new URLSearchParams(search)
  const [isChargeDrawerOpen, setIsChargeDrawerOpen] = React.useState(false)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = React.useState(false)
  const drawer = params.get('charge')
  const changes = useProposedFeeChanges(poolId)
  const poolAdmin = usePoolAdmin(poolId)
  const address = useAddress()
  const { execute: applyNewFee } = useCentrifugeTransaction('Apply new fee', (cent) => cent.pools.applyNewFee)

  const columns = [
    {
      align: 'left',
      header: 'Name',
      cell: (row: Row) => {
        return (
          <Shelf gap={1}>
            <Box
              borderRadius="50%"
              height="16px"
              width="16px"
              backgroundColor="backgroundSecondary"
              display="flex"
              justifyContent="center"
              alignItems="center"
            >
              <Text variant="body3">{row.index + 1}</Text>
            </Box>
            <Text variant="body3">{row.name}</Text>
          </Shelf>
        )
      },
    },
    {
      align: 'left',
      header: 'Type',
      cell: (row: Row) => {
        return <Text variant="body3">{row.type === 'fixed' ? 'Fixed % of NAV' : 'Direct charge'}</Text>
      },
    },
    {
      align: 'left',
      header: 'Fee position',
      cell: (row: Row) => {
        return <Text variant="body3">{row.feePosition}</Text>
      },
    },
    {
      align: 'left',
      header: 'Percentage/Limit',
      cell: (row: Row) => {
        return row.percentOfNav ? (
          <Text variant="body3">
            {row.type === 'fixed'
              ? `${formatPercentage(row.percentOfNav.toPercent(), true, {}, 3)} of NAV`
              : `<${formatPercentage(row.percentOfNav.toPercent(), true, {}, 3)} of non-cash NAV`}
          </Text>
        ) : null
      },
    },
    {
      align: 'left',
      header: 'Pending fees',
      cell: (row: Row) => {
        return row?.pendingFees ? (
          <Text variant="body3">{formatBalance(row.pendingFees, row.poolCurrency, 4)}</Text>
        ) : null
      },
    },
    {
      align: 'left',
      header: 'Receiving address',
      cell: (row: Row) => {
        return (
          <Text variant="body3">
            <CopyToClipboard variant="body3" address={row.receivingAddress || ''} />
          </Text>
        )
      },
    },
    ...(!!poolAdmin || pool?.poolFees?.map((fee) => addressToHex(fee.destination)).includes(address! as `0x${string}`)
      ? [
          {
            align: 'left',
            header: 'Action',
            cell: (row: Row) => row.action,
          },
        ]
      : []),
  ]

  const data = React.useMemo(() => {
    const activeFees =
      pool.poolFees
        ?.filter((feeChainData) => poolMetadata?.pool?.poolFees?.find((f) => f.id === feeChainData.id))
        ?.map((feeChainData, index) => {
          const feeMetadata = poolMetadata?.pool?.poolFees?.find((f) => f.id === feeChainData.id)
          const fixedFee = feeChainData?.type === 'fixed'
          const isAllowedToCharge = feeChainData?.destination && addressToHex(feeChainData.destination) === address

          return {
            index,
            name: feeMetadata?.name,
            type: feeChainData?.type,
            percentOfNav: feeChainData?.amounts?.percentOfNav,
            pendingFees: feeChainData?.amounts.pending,
            receivingAddress: feeChainData?.destination,
            feePosition: feeMetadata?.feePosition,
            action:
              (isAllowedToCharge || poolAdmin) && !fixedFee ? (
                <RouterLinkButton
                  small
                  variant="tertiary"
                  icon={<IconSwitch size="20px" />}
                  to={`?charge=${feeChainData?.id}`}
                >
                  Charge
                </RouterLinkButton>
              ) : (
                <Box height="32px"></Box>
              ),
            poolCurrency: pool.currency.symbol,
          }
        })
        .sort((a, b) => {
          if (a.type === 'fixed' && b.type !== 'fixed') return -1
          if (a.type !== 'fixed' && b.type === 'fixed') return 1
          return 0
        }) || []

    if (changes?.length) {
      return [
        ...activeFees,
        ...changes.map(({ change, hash }, index) => {
          return {
            index: activeFees.length + index,
            name: poolMetadata?.pool?.poolFees?.find((f) => f.id === change.feeId)?.name,
            type: change.type,
            percentOfNav: change.amounts.percentOfNav,
            pendingFees: undefined,
            receivingAddress: change.destination,
            action: poolAdmin ? (
              <Button
                variant="tertiary"
                icon={<IconCheckInCircle size="20px" />}
                onClick={() => {
                  applyNewFee([poolId, hash])
                }}
                small
              >
                Apply changes
              </Button>
            ) : (
              <Box height="32px"></Box>
            ),
            poolCurrency: pool.currency.symbol,
          }
        }),
      ]
    }

    return activeFees
  }, [poolMetadata, pool, poolId, changes, applyNewFee])

  React.useEffect(() => {
    if (drawer === 'edit') {
      setIsEditDrawerOpen(true)
    } else if (drawer) {
      setIsChargeDrawerOpen(true)
    }
  }, [drawer])

  const pageSummaryData: { label: React.ReactNode; value: React.ReactNode }[] = [
    {
      label: <Tooltips type="totalPendingFees" />,
      value: formatBalance(
        new CurrencyBalance(
          pool.poolFees?.reduce((acc, fee) => acc.add(fee.amounts.pending), new BN(0)) || new BN(0),
          pool.currency.decimals
        ) || 0,
        pool.currency.symbol,
        2
      ),
    },
  ]

  return (
    <>
      <ChargeFeesDrawer
        isOpen={isChargeDrawerOpen}
        onClose={() => {
          setIsChargeDrawerOpen(false)
          push(pathname)
        }}
      />
      <EditFeesDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => {
          setIsEditDrawerOpen(false)
          push(pathname)
        }}
      />
      <PageSummary data={pageSummaryData} />
      <PageSection
        title="Fee structure"
        headerRight={
          poolAdmin ? (
            <RouterLinkButton variant="secondary" to={`?charge=edit`}>
              Edit fee structure
            </RouterLinkButton>
          ) : null
        }
        subtitle="Fees are settled using available liquidity before investments or redemptions, prioritizing and paying the highest fees first"
      >
        {data?.length ? (
          <DataTable data={data || []} columns={columns} />
        ) : (
          <Shelf borderRadius="4px" backgroundColor="backgroundSecondary" justifyContent="center" p="10px">
            <Text color="textSecondary" variant="body2">
              No fees set yet
            </Text>
          </Shelf>
        )}
      </PageSection>
    </>
  )
}

export function useProposedFeeChanges(poolId: string) {
  const [result] = useCentrifugeQuery(['feeChanges', poolId], (cent) =>
    cent.pools.getProposedPoolSystemChanges([poolId])
  )

  const poolFeeChanges = React.useMemo(() => {
    return result
      ?.filter(({ change }) => !!change.poolFee?.appendFee?.length)
      .map(({ change, hash }) => {
        return {
          change: {
            destination: change.poolFee.appendFee[2].destination,
            type: Object.keys(change.poolFee.appendFee[2].feeType)[0],
            amounts: {
              percentOfNav: new Rate(change.poolFee.appendFee[2].feeType.chargedUpTo.limit.shareOfPortfolioValuation),
            },
            feeId: change.poolFee.appendFee[0],
          },
          hash,
        }
      })
  }, [result])

  return poolFeeChanges
}
