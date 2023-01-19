import { useWallet, WalletMenu } from '@centrifuge/centrifuge-react'
import { Box, Flex, Grid, IconX, Shelf, Stack, Step, Stepper, SubStep } from '@centrifuge/fabric'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../components/AuthProvider'
import { Spinner } from '../../components/Spinner'
import { config } from '../../config'
import { InvestorTypes, ultimateBeneficialOwner } from '../../types'
import { BusinessInformation } from './BusinessInformation'
import { BusinessOwnership } from './BusinessOwnership'
import { InvestorType } from './InvestorType'
import { KnowYourCustomer } from './KnowYourCustomer'
import { LinkWallet } from './LinkWallet'

const [_, WordMark] = config.logo

const AUTHORIZED_ONBOARDING_PROXY_TYPES = ['Any', 'Invest', 'NonTransfer', 'NonProxy']

export const OnboardingPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0)
  const [activeKnowYourCustomerStep, setActiveKnowYourCustomerStep] = useState<number>(0)

  const { isConnecting, selectedAccount } = useWallet()
  const [investorType, setInvestorType] = useState<InvestorTypes>()
  const { isAuth, refetchAuth } = useAuth(AUTHORIZED_ONBOARDING_PROXY_TYPES)
  const [ultimateBeneficialOwners, setUltimateBeneficialOwners] = useState<ultimateBeneficialOwner[]>([])

  const nextStep = () => setActiveStep((current) => current + 1)

  const nextKnowYourCustomerStep = () => setActiveKnowYourCustomerStep((current) => current + 1)

  useEffect(() => {
    if (!isConnecting) {
      if (!selectedAccount || isAuth === false) {
        setActiveStep(1)
      } else if (isAuth && activeStep === 0) {
        setActiveStep(2)
      }
    }
  }, [activeStep, isAuth, selectedAccount, isConnecting])

  return (
    <Flex backgroundColor="backgroundSecondary" minHeight="100vh" flexDirection="column">
      <Shelf as="header" justifyContent="space-between" gap={2} p={3}>
        <Shelf alignItems="center" gap={3}>
          <Box as={Link} to="/" width={110}>
            <WordMark />
          </Box>

          <Box pt={1}>Pool</Box>
        </Shelf>
        <Box width="300px">
          <WalletMenu />
        </Box>
      </Shelf>
      {activeStep === 0 || isConnecting ? (
        <Box
          mx="150px"
          my={5}
          height="520px"
          borderRadius="18px"
          backgroundColor="backgroundPrimary"
          alignItems="flex-start"
        >
          <Flex height="100%" alignItems="center" justifyContent="center">
            <Spinner />
          </Flex>
        </Box>
      ) : (
        <Grid
          columns={4}
          mx="150px"
          my={5}
          height="100%"
          borderRadius="18px"
          backgroundColor="backgroundPrimary"
          alignItems="flex-start"
          gridTemplateColumns="350px 1px 1fr min-content"
        >
          <Box paddingTop={10} paddingLeft={7} paddingRight={7} paddingBottom={6}>
            <Stepper activeStep={activeStep} setActiveStep={setActiveStep}>
              <Step label="Link wallet" />
              <Step label="Selector investor type" />
              {investorType === 'individual' && (
                <>
                  <Step label="Identity verification" />
                  <Step label="Sign subscription agreement" />
                </>
              )}
              {investorType === 'entity' && (
                <>
                  <Step label="Business information" />
                  <Step label="Business ownership" />
                  <Step label="Authorized signer verification" activeSubStep={activeKnowYourCustomerStep}>
                    <SubStep label="Country of issuance" />
                    <SubStep label="Photo ID" />
                    <SubStep label="Liveliness check" />
                  </Step>
                  <Step label="Tax information" />
                  <Step label="Sign subscription agreement" />
                </>
              )}
              {investorType === undefined && <Step empty />}
            </Stepper>
          </Box>
          <Box height="100%" backgroundColor="borderPrimary" />
          <Stack
            paddingTop={10}
            paddingLeft={7}
            paddingRight={7}
            paddingBottom={6}
            justifyContent="space-between"
            minHeight="520px"
          >
            {activeStep === 1 && <LinkWallet nextStep={nextStep} refetchAuth={refetchAuth} />}
            {activeStep === 2 && (
              <InvestorType investorType={investorType} nextStep={nextStep} setInvestorType={setInvestorType} />
            )}
            {activeStep === 3 && (
              <BusinessInformation nextStep={nextStep} setUltimateBeneficialOwners={setUltimateBeneficialOwners} />
            )}
            {activeStep === 4 && (
              <BusinessOwnership nextStep={nextStep} ultimateBeneficialOwners={ultimateBeneficialOwners} />
            )}
            {activeStep === 5 && (
              <KnowYourCustomer
                nextStep={nextStep}
                nextKnowYourCustomerStep={nextKnowYourCustomerStep}
                activeKnowYourCustomerStep={activeKnowYourCustomerStep}
              />
            )}
          </Stack>
          <Box paddingTop={4} paddingRight={4} justifyContent="flex-end">
            <Link to="/">
              <IconX color="textPrimary" />
            </Link>
          </Box>
        </Grid>
      )}
    </Flex>
  )
}
