import type { CellularInfo, StoredTestResult, Thresholds } from './types'

export type Grade = 'excellent' | 'good' | 'fair' | 'poor' | 'none'

export const gradeColor: Record<Grade, string> = {
  excellent: '#0F8A5F',
  good: '#74A72E',
  fair: '#D9971A',
  poor: '#C8432F',
  none: '#A3ADB8',
}
export const gradeLabel: Record<Grade, string> = {
  excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor', none: 'No data',
}

export function rsrpGrade(rsrp: number | null): Grade {
  if (rsrp === null) return 'none'
  if (rsrp >= -85) return 'excellent'
  if (rsrp >= -100) return 'good'
  if (rsrp >= -110) return 'fair'
  return 'poor'
}
export function rsrqGrade(v: number | null): Grade {
  if (v === null) return 'none'
  if (v >= -9) return 'excellent'
  if (v >= -12) return 'good'
  if (v >= -15) return 'fair'
  return 'poor'
}
export function sinrGrade(v: number | null): Grade {
  if (v === null) return 'none'
  if (v >= 20) return 'excellent'
  if (v >= 10) return 'good'
  if (v >= 0) return 'fair'
  return 'poor'
}
/** RSRP when available (LTE/NR), otherwise estimated from RSSI (3G). */
export function signalGrade(c: CellularInfo | null): Grade {
  if (!c) return 'none'
  if (c.rsrp !== null) return rsrpGrade(c.rsrp)
  if (c.rssi !== null) return rsrpGrade(c.rssi - 22)
  return 'none'
}
export function downloadGrade(dl: number | null, th: Thresholds): Grade {
  if (dl === null) return 'none'
  if (dl >= th.minDownloadMbps * 4) return 'excellent'
  if (dl >= th.minDownloadMbps) return 'good'
  if (dl >= th.minDownloadMbps / 2) return 'fair'
  return 'poor'
}
export function latencyGrade(ms: number | null, th: Thresholds): Grade {
  if (ms === null) return 'none'
  if (ms <= th.maxLatencyMs * 0.4) return 'excellent'
  if (ms <= th.maxLatencyMs) return 'good'
  if (ms <= th.maxLatencyMs * 1.5) return 'fair'
  return 'poor'
}
/** Overall test grade: how many thresholds the test breaks. */
export function testGrade(t: StoredTestResult | null, th: Thresholds): Grade {
  if (!t || t.skipReason || t.downloadMbps === null) return 'none'
  const fails = [
    t.downloadMbps < th.minDownloadMbps,
    (t.latencyMs ?? 0) > th.maxLatencyMs,
    (t.packetLossPercent ?? 0) > th.maxPacketLossPercent,
  ].filter(Boolean).length
  if (fails === 0) return t.downloadMbps >= th.minDownloadMbps * 4 ? 'excellent' : 'good'
  return fails === 1 ? 'fair' : 'poor'
}
