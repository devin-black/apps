import { Request } from 'express'
import * as functions from 'firebase-functions'
import fetch from 'node-fetch'
import { businessAmlMockResponse } from '../mocks/businessAmlResponse'
import { kybMockResponse } from '../mocks/kybResponse'

export const shuftiProRequest = async (_req: Request, payload: any, options?: { dryRun: boolean }) => {
  if (options?.dryRun) {
    if (payload.reference.startsWith('BUSINESS_AML_REQUEST')) {
      return businessAmlMockResponse
    } else if (payload.reference.startsWith('KYB_REQUEST')) {
      return kybMockResponse
    }
    return { event: 'failed', reference: payload.reference }
  }

  try {
    // TODO: check if possible to use Buf.from()
    const token = btoa(`${process.env.SHUFTI_PRO_CLIENT_ID}:${process.env.SHUFTI_PRO_SECRET_KEY}`)
    const shuftiRes = await fetch('https://api.shuftipro.com/', {
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await shuftiRes.json()
    if (data.error) {
      functions.logger.log(data.error.message)
    }
    return data
  } catch (error) {
    // @ts-expect-error error typing
    functions.logger.log(error.message)
  }
}