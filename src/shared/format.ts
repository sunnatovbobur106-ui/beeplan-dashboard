import type { SkipReason } from './types'

export const fmt = (v: number | null | undefined, digits = 0, unit = '') =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : `${v.toFixed(digits)}${unit}`
export const yesNo = (b: boolean) => (b ? 'Yes' : 'No')
export const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
export function avg(xs: (number | null | undefined)[]): number | null {
  const v = xs.filter((x): x is number => typeof x === 'number')
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}
export function duration(fromIso: string, toIso: string) {
  const min = Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 60000)
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`
}
export const skipReasonText: Record<SkipReason, string> = {
  LOW_BATTERY: 'Battery was below 15% and the phone was not charging.',
  NO_CONNECTIVITY: 'The device was not registered on the mobile network.',
  APP_IN_BACKGROUND: 'The app was in the background and background collection is turned off.',
  METERED_NETWORK: 'The connection is metered and tests on metered networks are not allowed.',
  USER_CANCELLED: 'The user cancelled the test.',
}
