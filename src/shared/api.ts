import { shallowRef } from 'vue'
import type { ConnectionType, NetworkGeneration, SkipReason, Snapshot, StoredSnapshot, StoredTestResult, TestResult } from './types'

const BASE_URL = 'https://dev.uzproger.ru'

export interface RequestLogEntry {
  id: number
  method: 'POST'
  path: '/api/telemetry/location' | '/api/telemetry/speedtest'
  status: number
  at: string
  bytes: number
  durationMs: number
}

export const db = {
  snapshots: shallowRef<StoredSnapshot[]>([]),
  tests: shallowRef<StoredTestResult[]>([]),
}
export const requestLog = shallowRef<RequestLogEntry[]>([])

let seq = 0
const newId = (prefix: string) => `${prefix}_${(++seq).toString(36).padStart(5, '0')}`

function log(path: RequestLogEntry['path'], body: unknown, durationMs: number, status: number) {
  const entry: RequestLogEntry = {
    id: seq, method: 'POST', path, status, at: new Date().toISOString(),
    bytes: new Blob([JSON.stringify(body)]).size, durationMs,
  }
  requestLog.value = [entry, ...requestLog.value].slice(0, 40)
}

export async function postSnapshot(body: Snapshot): Promise<{ id: string }> {
  const started = Date.now()
  const reqBody = {
    sessionId: body.sessionId,
    timestamp: body.capturedAt,
    locationInfo: body.locationInfo,
    connectivityInfo: body.connectivityInfo,
    cellularInfo: body.cellularInfo,
    deviceContext: body.deviceContext,
  }
  let id: string
  let status = 201
  try {
    const res = await fetch(`${BASE_URL}/api/telemetry/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    })
    status = res.status
    const data = await res.json() as { id: string }
    id = data.id
  } catch {
    id = newId('snp')
    status = 0
  }
  const durationMs = Date.now() - started
  db.snapshots.value = [...db.snapshots.value, { ...body, id }]
  log('/api/telemetry/location', reqBody, durationMs, status)
  return { id }
}

export async function postTestResult(body: TestResult): Promise<{ id: string }> {
  const started = Date.now()
  const reqBody = {
    sessionId: body.sessionId,
    timestamp: body.startedAt,
    downloadMbps: body.downloadMbps,
    uploadMbps: body.uploadMbps,
    latencyMs: body.latencyMs,
    jitterMs: body.jitterMs,
    packetLossPercent: body.packetLossPercent,
    dnsResolutionMs: body.dnsResolutionMs,
    tcpConnectionMs: body.tcpConnectionMs,
    tlsHandshakeMs: body.tlsHandshakeMs,
    ttfbMs: body.ttfbMs,
    skipReason: body.skipReason,
  }
  let id: string
  let status = 201
  try {
    const res = await fetch(`${BASE_URL}/api/telemetry/speedtest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    })
    status = res.status
    const data = await res.json() as { id: string }
    id = data.id
  } catch {
    id = newId('tst')
    status = 0
  }
  const durationMs = Date.now() - started
  db.tests.value = [...db.tests.value, { ...body, id }]
  log('/api/telemetry/speedtest', reqBody, durationMs, status)
  return { id }
}

// ── History fetch ────────────────────────────────────────────────────────────

type LocationReportOut = {
  id: number
  session_id: string
  client_timestamp: string
  latitude: number | null
  longitude: number | null
  accuracy_meters: number | null
  altitude_meters: number | null
  speed_mps: number | null
  heading_degrees: number | null
  is_mocked: boolean | null
  fix_timestamp: string | null
  connection_type: string | null
  is_vpn_active: boolean | null
  is_metered: boolean | null
  is_airplane_mode_on: boolean | null
  is_data_roaming: boolean | null
  carrier_name: string | null
  mcc: string | null
  mnc: string | null
  cellular_generation: string | null
  data_network_type: string | null
  rssi: number | null
  rsrp: number | null
  rsrq: number | null
  rssnr: number | null
  cqi: number | null
  asu_level: number | null
  signal_level: number | null
  cell_id: number | null
  pci: number | null
  lac: number | null
  tac: number | null
  timing_advance: number | null
  is_registered: boolean | null
  battery_level: number | null
  is_charging: boolean | null
  device_model: string | null
  os_version: string | null
  is_app_foreground: boolean | null
}

type SpeedtestReportOut = {
  id: number
  session_id: string
  client_timestamp: string
  skip_reason: string | null
  download_mbps: number | null
  upload_mbps: number | null
  latency_ms: number | null
  jitter_ms: number | null
  packet_loss_percent: number | null
  dns_resolution_ms: number | null
  tcp_connection_ms: number | null
  tls_handshake_ms: number | null
  ttfb_ms: number | null
}

function mapGeneration(g: string | null): NetworkGeneration {
  const table: Record<string, NetworkGeneration> = { g2: '2G', g3: '3G', g4: '4G', g5: '5G' }
  return (g && table[g]) || 'UNKNOWN'
}

function mapConnectionType(c: string | null): ConnectionType {
  const table: Record<string, ConnectionType> = { cellular: 'CELLULAR', wifi: 'WIFI', ethernet: 'ETHERNET' }
  return (c && table[c.toLowerCase()]) || 'NONE'
}

function mapLocation(r: LocationReportOut): StoredSnapshot {
  const hasCellular = r.rsrp !== null || r.rssi !== null || r.signal_level !== null
  return {
    id: String(r.id),
    sessionId: r.session_id,
    capturedAt: r.client_timestamp,
    locationInfo: {
      latitude: r.latitude ?? 0,
      longitude: r.longitude ?? 0,
      accuracyM: r.accuracy_meters ?? 0,
      altitudeM: r.altitude_meters,
      speedMps: r.speed_mps,
      bearingDeg: r.heading_degrees,
      isMocked: r.is_mocked ?? false,
      fixTime: r.fix_timestamp ?? r.client_timestamp,
    },
    connectivityInfo: {
      connectionType: mapConnectionType(r.connection_type),
      isVpn: r.is_vpn_active ?? false,
      isMetered: r.is_metered ?? false,
      isAirplaneMode: r.is_airplane_mode_on ?? false,
      isRoaming: r.is_data_roaming ?? false,
      operatorName: r.carrier_name,
      mcc: r.mcc,
      mnc: r.mnc,
      networkGeneration: mapGeneration(r.cellular_generation),
      networkType: r.data_network_type ?? '',
    },
    cellularInfo: hasCellular ? {
      rssi: r.rssi,
      rsrp: r.rsrp,
      rsrq: r.rsrq,
      rssnr: r.rssnr,
      cqi: r.cqi,
      asu: r.asu_level,
      signalLevel: (r.signal_level ?? 0) as 0 | 1 | 2 | 3 | 4,
      cellId: r.cell_id,
      pci: r.pci,
      lac: r.lac,
      tac: r.tac,
      timingAdvance: r.timing_advance,
      registrationStatus: r.is_registered ? 'REGISTERED' : 'NOT_REGISTERED',
    } : null,
    deviceContext: {
      batteryLevel: r.battery_level ?? 100,
      isCharging: r.is_charging ?? false,
      deviceModel: r.device_model ?? 'Unknown',
      osVersion: r.os_version ?? 'Unknown',
      appState: r.is_app_foreground ? 'FOREGROUND' : 'BACKGROUND',
    },
  }
}

function mapSpeedtest(r: SpeedtestReportOut): StoredTestResult {
  return {
    id: String(r.id),
    sessionId: r.session_id,
    startedAt: r.client_timestamp,
    downloadMbps: r.download_mbps,
    uploadMbps: r.upload_mbps,
    latencyMs: r.latency_ms,
    jitterMs: r.jitter_ms,
    packetLossPercent: r.packet_loss_percent,
    dnsResolutionMs: r.dns_resolution_ms,
    tcpConnectionMs: r.tcp_connection_ms,
    tlsHandshakeMs: r.tls_handshake_ms,
    ttfbMs: r.ttfb_ms,
    skipReason: r.skip_reason as SkipReason | null,
  }
}

export async function fetchHistory(): Promise<{ snapshots: StoredSnapshot[]; tests: StoredTestResult[] }> {
  const [locsRes, testsRes] = await Promise.all([
    fetch(`${BASE_URL}/api/telemetry/location?limit=500`),
    fetch(`${BASE_URL}/api/telemetry/speedtest?limit=500`),
  ])
  if (!locsRes.ok || !testsRes.ok) throw new Error('API error')
  const locs = await locsRes.json() as LocationReportOut[]
  const tests = await testsRes.json() as SpeedtestReportOut[]
  return { snapshots: locs.map(mapLocation), tests: tests.map(mapSpeedtest) }
}

