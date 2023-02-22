import { useWallet } from '@centrifuge/centrifuge-react'
import { useQuery } from 'react-query'
import { useAuth } from '../../../components/AuthProvider'
import { useOnboarding } from '../../../components/OnboardingProvider'

export const useTaxInfo = () => {
  const { authToken } = useAuth()
  const { selectedAccount } = useWallet()
  const { onboardingUser } = useOnboarding()

  const query = useQuery(
    ['tax-info', selectedAccount?.address],
    async () => {
      const response = await fetch(`${import.meta.env.REACT_APP_ONBOARDING_API_URL}/getTaxInfo`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      const json = await response.json()

      const documentBlob = new Blob([Uint8Array.from(json.taxInfo.data).buffer], {
        type: 'application/pdf',
      })

      return URL.createObjectURL(documentBlob)
    },
    {
      refetchOnWindowFocus: false,
      enabled: !!onboardingUser?.steps?.verifyTaxInfo?.completed,
    }
  )

  return query
}