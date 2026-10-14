// Deterministic mock data: devices moving around the city, each attached to the nearest
// cell of its operator. Signal depends on distance to the cell; test results depend on signal.
import type {
  AppState, CellularInfo, CollectionSettings, ConnectionType, NetworkGeneration,
  SkipReason, Snapshot, TestResult,
} from './types'

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20261006)
const between = (a: number, b: number) => a + rand() * (b - a)
const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)]
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round = (v: number, d = 0) => { const f = 10 ** d; return Math.round(v * f) / f }

export const MAP_CENTER = { lat: 41.3111, lng: 69.2797 }

export const OPERATORS = [
  { name: 'Beeline', mcc: '434', mnc: '04' },
  { name: 'Ucell', mcc: '434', mnc: '05' },
  { name: 'Mobiuz', mcc: '434', mnc: '07' },
  { name: 'Uzmobile', mcc: '434', mnc: '03' },
] as const
type Operator = (typeof OPERATORS)[number]

const DEVICES = [
  { model: 'Samsung Galaxy A54', os: 'Android 14' },
  { model: 'Xiaomi Redmi Note 13', os: 'Android 14' },
  { model: 'Google Pixel 8', os: 'Android 15' },
  { model: 'Samsung Galaxy S23', os: 'Android 15' },
  { model: 'Honor X8b', os: 'Android 13' },
] as const
type Device = (typeof DEVICES)[number]

interface Tower { lat: number; lng: number; operator: string; cellId: number; pci: number; tac: number; lac: number }
const towers: Tower[] = Array.from({ length: 40 }, (_, i) => ({
  lat: MAP_CENTER.lat + between(-0.075, 0.075),
  lng: MAP_CENTER.lng + between(-0.1, 0.1),
  operator: OPERATORS[i % OPERATORS.length].name,
  cellId: Math.floor(between(1e6, 2.6e8)),
  pci: Math.floor(between(0, 504)),
  tac: Math.floor(between(1000, 65000)),
  lac: Math.floor(between(100, 65000)),
}))

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dy = (aLat - bLat) * 111
  const dx = (aLng - bLng) * 111 * Math.cos((aLat * Math.PI) / 180)
  return Math.hypot(dx, dy)
}

export interface Walker {
  sessionId: string
  operator: Operator
  device: Device
  lat: number
  lng: number
  bearing: number
  speedMps: number
  battery: number
  charging: boolean
  clock: number
}

let sessionCounter = 0
function newSessionId() {
  sessionCounter++
  return `ses_${(1000 + sessionCounter).toString(36)}${Math.floor(between(1e5, 1e6)).toString(36)}`
}

export function createWalker(startTime: number): Walker {
  return {
    sessionId: newSessionId(),
    operator: pick(OPERATORS),
    device: pick(DEVICES),
    lat: MAP_CENTER.lat + between(-0.05, 0.05),
    lng: MAP_CENTER.lng + between(-0.07, 0.07),
    bearing: between(0, 360),
    speedMps: between(0, 12),
    battery: Math.round(between(18, 100)),
    charging: rand() < 0.2,
    clock: startTime,
  }
}

export function advance(w: Walker, intervalSec: number) {
  w.clock += intervalSec * 1000
  w.speedMps = clamp(w.speedMps + between(-3, 3), 0, 16)
  w.bearing = (w.bearing + between(-35, 35) + 360) % 360
  if (distanceKm(w.lat, w.lng, MAP_CENTER.lat, MAP_CENTER.lng) > 8) {
    const toCenter = (Math.atan2(MAP_CENTER.lng - w.lng, MAP_CENTER.lat - w.lat) * 180) / Math.PI
    w.bearing = (toCenter + 360) % 360
  }
  const meters = Math.min(w.speedMps * intervalSec, 450)
  const rad = (w.bearing * Math.PI) / 180
  w.lat += (meters * Math.cos(rad)) / 111000
  w.lng += (meters * Math.sin(rad)) / (111000 * Math.cos((w.lat * Math.PI) / 180))
  const drain = (intervalSec / 60) * between(0.2, 0.9)
  w.battery = w.charging ? Math.min(100, w.battery + drain * 2) : Math.max(1, w.battery - drain)
  if (rand() < 0.03) w.charging = !w.charging
}

function levelFromRsrp(rsrp: number): CellularInfo['signalLevel'] {
  if (rsrp >= -85) return 4
  if (rsrp >= -95) return 3
  if (rsrp >= -105) return 2
  if (rsrp >= -115) return 1
  return 0
}

export function captureSnapshot(w: Walker, appState?: AppState): Snapshot {
  const serving = towers
    .filter((t) => t.operator === w.operator.name)
    .map((t) => ({ t, d: distanceKm(w.lat, w.lng, t.lat, t.lng) }))
    .sort((a, b) => a.d - b.d)[0]
  const d = serving.d
  const rsrpRaw = clamp(-64 - d * 13 + between(-7, 7), -140, -44)

  let generation: NetworkGeneration = '4G'
  let networkType = 'LTE'
  if (rsrpRaw > -95 && rand() < 0.35) { generation = '5G'; networkType = 'NR_NSA' }
  else if (rsrpRaw < -114 && rand() < 0.6) { generation = '3G'; networkType = 'HSPA+' }

  const connectionType: ConnectionType = rand() < 0.08 ? 'WIFI' : 'CELLULAR'
  const lte = generation !== '3G'
  const rssi = round(rsrpRaw + between(20, 28))
  const rssnr = lte ? Math.round(clamp(28 - (-rsrpRaw - 70) * 0.55 + between(-4, 4), -10, 30)) : null

  return {
    sessionId: w.sessionId,
    capturedAt: new Date(w.clock).toISOString(),
    locationInfo: {
      latitude: round(w.lat, 6),
      longitude: round(w.lng, 6),
      accuracyM: round(rand() < 0.85 ? between(3, 18) : between(25, 90), 1),
      altitudeM: round(between(425, 480), 1),
      speedMps: round(w.speedMps, 1),
      bearingDeg: Math.round(w.bearing),
      isMocked: rand() < 0.01,
      fixTime: new Date(w.clock - between(200, 4000)).toISOString(),
    },
    connectivityInfo: {
      connectionType,
      isVpn: rand() < 0.06,
      isMetered: connectionType === 'CELLULAR',
      isAirplaneMode: false,
      isRoaming: false,
      operatorName: w.operator.name,
      mcc: w.operator.mcc,
      mnc: w.operator.mnc,
      networkGeneration: generation,
      networkType,
    },
    cellularInfo: {
      rssi,
      rsrp: lte ? round(rsrpRaw) : null,
      rsrq: lte ? round(clamp(-4 - (-rsrpRaw - 70) * 0.22 + between(-2, 2), -20, -3)) : null,
      rssnr,
      cqi: rssnr === null ? null : clamp(Math.round(((rssnr + 10) / 40) * 15), 1, 15),
      asu: lte ? clamp(Math.round(rsrpRaw + 140), 0, 97) : clamp(Math.round((rssi + 113) / 2), 0, 31),
      signalLevel: levelFromRsrp(rsrpRaw),
      cellId: serving.t.cellId,
      pci: lte ? serving.t.pci : null,
      lac: lte ? null : serving.t.lac,
      tac: lte ? serving.t.tac : null,
      timingAdvance: lte ? Math.round((d * 1000) / 78.12) : null,
      registrationStatus: rsrpRaw < -128 ? 'SEARCHING' : 'REGISTERED',
    },
    deviceContext: {
      batteryLevel: Math.round(w.battery),
      isCharging: w.charging,
      deviceModel: w.device.model,
      osVersion: w.device.os,
      appState: appState ?? (rand() < 0.18 ? 'BACKGROUND' : 'FOREGROUND'),
    },
  }
}

export function runSpeedTest(snap: Snapshot, opts: Pick<CollectionSettings, 'collectInBackground'>): TestResult {
  const base = {
    sessionId: snap.sessionId,
    startedAt: new Date(Date.parse(snap.capturedAt) + between(2000, 8000)).toISOString(),
  }
  const c = snap.cellularInfo
  const conn = snap.connectivityInfo
  const dev = snap.deviceContext

  let skip: SkipReason | null = null
  if (dev.batteryLevel < 15 && !dev.isCharging) skip = 'LOW_BATTERY'
  else if (c?.registrationStatus === 'SEARCHING' && conn.connectionType === 'CELLULAR') skip = 'NO_CONNECTIVITY'
  else if (dev.appState === 'BACKGROUND' && !opts.collectInBackground) skip = 'APP_IN_BACKGROUND'
  else if (rand() < 0.03) skip = 'USER_CANCELLED'

  if (skip) {
    return {
      ...base, downloadMbps: null, uploadMbps: null, latencyMs: null, jitterMs: null,
      packetLossPercent: null, dnsResolutionMs: null, tcpConnectionMs: null,
      tlsHandshakeMs: null, ttfbMs: null, skipReason: skip,
    }
  }

  const gen = conn.networkGeneration
  let q: number
  let dl: number
  if (conn.connectionType === 'WIFI') {
    q = between(0.6, 1)
    dl = between(25, 140)
  } else if (gen === '3G') {
    q = clamp(((c?.rssi ?? -100) + 110) / 50, 0.03, 0.6)
    dl = q * 9 * between(0.6, 1.2)
  } else {
    q = clamp(((c?.rsrp ?? -120) + 125) / 55, 0.03, 1)
    dl = q ** 1.4 * 85 * between(0.65, 1.2)
    if (gen === '5G') dl *= between(2.2, 3.2)
  }
  const latency = 18 + (1 - q) * 95 + between(0, 14) + (gen === '3G' ? 55 : 0) - (gen === '5G' ? 6 : 0)
  const dns = between(8, 35) + (1 - q) * 55
  const tcp = latency * between(0.9, 1.2)
  const tls = tcp * between(1.6, 2.3)
  const ttfb = dns + tcp + tls + between(30, 160)

  return {
    ...base,
    downloadMbps: round(Math.max(dl, 0.1), 2),
    uploadMbps: round(Math.max(dl * between(0.15, 0.4), 0.05), 2),
    latencyMs: Math.round(latency),
    jitterMs: round(latency * between(0.05, 0.3), 1),
    packetLossPercent: round(q < 0.25 ? between(0.5, 7) : between(0, 0.6), 2),
    dnsResolutionMs: Math.round(dns),
    tcpConnectionMs: Math.round(tcp),
    tlsHandshakeMs: Math.round(tls),
    ttfbMs: Math.round(ttfb),
    skipReason: null,
  }
}

export function shouldRunTest(snap: Snapshot, settings: CollectionSettings, index: number): boolean {
  switch (settings.testPolicy) {
    case 'every': return true
    case 'everyThird': return index % 3 === 0
    case 'poorSignal': {
      const c = snap.cellularInfo
      const rsrp = c?.rsrp ?? (c?.rssi != null ? c.rssi - 22 : -140)
      return rsrp < settings.thresholds.minRsrpDbm
    }
  }
}

