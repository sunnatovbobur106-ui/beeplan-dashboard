// Turns each snapshot block into labelled rows for display.
import type { CellularInfo, ConnectivityInfo, DeviceContext, LocationInfo } from './types'
import { clock, fmt, yesNo } from './format'
import { rsrpGrade, rsrqGrade, sinrGrade, type Grade } from './quality'

export interface Row { key: string; label: string; value: string; grade?: Grade }

export const locationRows = (l: LocationInfo): Row[] => [
  { key: 'latitude, longitude', label: 'Coordinates', value: `${l.latitude.toFixed(5)}, ${l.longitude.toFixed(5)}` },
  { key: 'accuracyM', label: 'Accuracy', value: fmt(l.accuracyM, 0, ' m'), grade: l.accuracyM > 50 ? 'fair' : undefined },
  { key: 'altitudeM', label: 'Altitude', value: fmt(l.altitudeM, 0, ' m') },
  {
    key: 'speedMps', label: 'Speed',
    value: l.speedMps === null ? '—' : `${l.speedMps.toFixed(1)} m/s (${(l.speedMps * 3.6).toFixed(0)} km/h)`,
  },
  { key: 'bearingDeg', label: 'Direction', value: fmt(l.bearingDeg, 0, '°') },
  { key: 'isMocked', label: 'Mock location', value: yesNo(l.isMocked), grade: l.isMocked ? 'poor' : undefined },
  { key: 'fixTime', label: 'Fix time', value: clock(l.fixTime) },
]

export const connectivityRows = (c: ConnectivityInfo): Row[] => [
  { key: 'connectionType', label: 'Connection', value: c.connectionType },
  { key: 'operatorName', label: 'Operator', value: c.operatorName ?? '—' },
  { key: 'mcc / mnc', label: 'MCC / MNC', value: `${c.mcc ?? '—'} / ${c.mnc ?? '—'}` },
  { key: 'networkGeneration', label: 'Generation', value: c.networkGeneration },
  { key: 'networkType', label: 'Network type', value: c.networkType },
  { key: 'isVpn', label: 'VPN', value: yesNo(c.isVpn) },
  { key: 'isMetered', label: 'Metered', value: yesNo(c.isMetered) },
  { key: 'isAirplaneMode', label: 'Airplane mode', value: yesNo(c.isAirplaneMode) },
  { key: 'isRoaming', label: 'Roaming', value: yesNo(c.isRoaming) },
]

export function cellularRows(c: CellularInfo | null): Row[] {
  if (!c) return [{ key: 'cellularInfo', label: 'Cellular data', value: 'Not reported' }]
  const ta = c.timingAdvance
  return [
    { key: 'rsrp', label: 'RSRP', value: fmt(c.rsrp, 0, ' dBm'), grade: rsrpGrade(c.rsrp) },
    { key: 'rsrq', label: 'RSRQ', value: fmt(c.rsrq, 0, ' dB'), grade: rsrqGrade(c.rsrq) },
    { key: 'rssnr', label: 'RSSNR', value: fmt(c.rssnr, 1, ' dB'), grade: sinrGrade(c.rssnr) },
    { key: 'rssi', label: 'RSSI', value: fmt(c.rssi, 0, ' dBm') },
    { key: 'cqi', label: 'CQI', value: c.cqi === null ? '—' : `${c.cqi} of 15` },
    { key: 'asu', label: 'ASU', value: fmt(c.asu) },
    { key: 'signalLevel', label: 'Signal level', value: `${c.signalLevel} of 4` },
    { key: 'cellId', label: 'Cell ID', value: c.cellId?.toString() ?? '—' },
    { key: 'pci', label: 'PCI', value: c.pci?.toString() ?? '—' },
    { key: 'lac / tac', label: 'LAC / TAC', value: `${c.lac ?? '—'} / ${c.tac ?? '—'}` },
    { key: 'timingAdvance', label: 'Timing advance', value: ta === null ? '—' : `${ta} (about ${((ta * 78.12) / 1000).toFixed(1)} km)` },
    {
      key: 'registrationStatus', label: 'Registration', value: c.registrationStatus,
      grade: c.registrationStatus === 'REGISTERED' ? undefined : 'poor',
    },
  ]
}

export const deviceRows = (d: DeviceContext): Row[] => [
  { key: 'batteryLevel', label: 'Battery', value: `${d.batteryLevel}%`, grade: d.batteryLevel < 15 ? 'poor' : undefined },
  { key: 'isCharging', label: 'Charging', value: yesNo(d.isCharging) },
  { key: 'deviceModel', label: 'Model', value: d.deviceModel },
  { key: 'osVersion', label: 'OS version', value: d.osVersion },
  { key: 'appState', label: 'App state', value: d.appState === 'FOREGROUND' ? 'Foreground' : 'Background' },
]
