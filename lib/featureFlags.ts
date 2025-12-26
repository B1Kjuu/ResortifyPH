export const paymentsEnabled: boolean = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true'

export const featureFlags = {
  paymentsEnabled,
}
