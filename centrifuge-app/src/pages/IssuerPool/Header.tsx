import { useCentrifuge, useCentrifugeTransaction } from '@centrifuge/centrifuge-react'
import { Box, Button, Shelf, Text, TextWithPlaceholder } from '@centrifuge/fabric'
import * as React from 'react'
import { useParams, useRouteMatch } from 'react-router'
import { useTheme } from 'styled-components'
import { NavigationTabs, NavigationTabsItem } from '../../components/NavigationTabs'
import { PageHeader } from '../../components/PageHeader'
import { PAGE_GUTTER } from '../../components/PageWithSideBar'
import { usePoolPermissions, useSuitableAccounts } from '../../utils/usePermissions'
import { usePool, usePoolMetadata } from '../../utils/usePools'

type Props = {
  actions?: React.ReactNode
}

export const IssuerPoolHeader: React.FC<Props> = ({ actions }) => {
  const { pid } = useParams<{ pid: string }>()
  const pool = usePool(pid)
  const { data: metadata, isLoading } = usePoolMetadata(pool)
  const theme = useTheme()
  const cent = useCentrifuge()
  const basePath = useRouteMatch(['/pools', '/issuer'])?.path || ''

  const [poolAdmin] = useSuitableAccounts({ poolId: pid, poolRole: ['PoolAdmin'] })
  const permissions = usePoolPermissions(pid)
  const shouldInitialise = !permissions?.[poolAdmin?.actingAddress]?.roles.includes('LoanAdmin')

  const { execute: executeInitialise, isLoading: isInitialiseLoading } = useCentrifugeTransaction(
    'Initialise pool',
    (cent) => cent.pools.initialisePool
  )

  if (!pool || !permissions) return null

  async function initialisePool() {
    if (!metadata) return
    executeInitialise([pid, poolAdmin.actingAddress, metadata!], { account: poolAdmin })
  }

  return (
    <>
      <PageHeader
        title={
          <TextWithPlaceholder isLoading={isLoading}>{metadata?.pool?.name ?? 'Unnamed pool'}</TextWithPlaceholder>
        }
        subtitle={
          <TextWithPlaceholder isLoading={isLoading}>by {metadata?.pool?.issuer.name ?? 'Unknown'}</TextWithPlaceholder>
        }
        icon={
          metadata?.pool?.icon ? (
            <Box
              as="img"
              width="iconLarge"
              height="iconLarge"
              src={cent.metadata.parseMetadataUrl(metadata?.pool?.icon?.uri)}
            />
          ) : (
            <Shelf
              width="iconLarge"
              height="iconLarge"
              borderRadius="card"
              backgroundColor={isLoading ? 'borderSecondary' : 'backgroundThumbnail'}
              justifyContent="center"
            >
              <Text variant="body1">{(isLoading ? '' : metadata?.pool?.name ?? 'U')[0]}</Text>
            </Shelf>
          )
        }
        border={false}
        actions={
          poolAdmin && shouldInitialise ? (
            <>
              <Text variant="body2">Pool is not yet initialised</Text>
              <Button small onClick={initialisePool} loading={isInitialiseLoading}>
                Initialise Pool
              </Button>
            </>
          ) : (
            actions
          )
        }
      >
        <Shelf
          px={PAGE_GUTTER}
          bg="backgroundPage"
          style={{
            boxShadow: `0 1px 0 ${theme.colors.borderSecondary}`,
          }}
        >
          <NavigationTabs basePath={`${basePath}/${pid}`}>
            <NavigationTabsItem to={`${basePath}/${pid}`}>Overview</NavigationTabsItem>
            <NavigationTabsItem to={`${basePath}/${pid}/assets`}>Assets</NavigationTabsItem>
            <NavigationTabsItem to={`${basePath}/${pid}/liquidity`}>Liquidity</NavigationTabsItem>
            <NavigationTabsItem to={`${basePath}/${pid}/investors`}>Investors</NavigationTabsItem>
            <NavigationTabsItem to={`${basePath}/${pid}/configuration`}>Configuration</NavigationTabsItem>
            <NavigationTabsItem to={`${basePath}/${pid}/access`}>Access</NavigationTabsItem>
          </NavigationTabs>
        </Shelf>
      </PageHeader>
    </>
  )
}
