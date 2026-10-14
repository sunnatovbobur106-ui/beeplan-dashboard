// Data model for POST /v1/snapshots and POST /v1/test-results.
// Field names follow the blocks described in the spec; align them with the final API contract.

export type ConnectionType = 'WIFI' | 'CELLULAR' | 'ETHERNET' | 'NONE'
export type NetworkGeneration = '2G' | '3G' | '4G' | '5G' | 'UNKNOWN'
export type AppState = 'FOREGROUND' | 'BACKGROUND'
export type RegistrationStatus = 'REGISTERED' | 'SEARCHING' | 'DENIED' | 'NOT_REGISTERED'

export interface LocationInfo {
  latitude: number
  longitude: number
  accuracyM: number
  altitudeM: number | null
  speedMps: number | null
  bearingDeg: number | null
  isMocked: boolean
  fixTime: string
}

export interface ConnectivityInfo {
  connectionType: ConnectionType
  isVpn: boolean
  isMetered: boolean
  isAirplaneMode: boolean
  isRoaming: boolean
  operatorName: string | null
  mcc: string | null
  mnc: string | null
  networkGeneration: NetworkGeneration
  networkType: string
}

export interface CellularInfo {
  rssi: number | null
  rsrp: number | null
  rsrq: number | null
  rssnr: number | null
  cqi: number | null
  asu: number | null
  signalLevel: 0 | 1 | 2 | 3 | 4
  cellId: number | null
  pci: number | null
  lac: number | null
  tac: number | null
  timingAdvance: number | null
  registrationStatus: RegistrationStatus
}

export interface DeviceContext {
  batteryLevel: number
  isCharging: boolean
  deviceModel: string
  osVersion: string
  appState: AppState
}

/** Body of POST /v1/snapshots */
export interface Snapshot {
  sessionId: string
  capturedAt: string
  locationInfo: LocationInfo
  connectivityInfo: ConnectivityInfo
  cellularInfo: CellularInfo | null
  deviceContext: DeviceContext
}

export type SkipReason =
  | 'LOW_BATTERY'
  | 'NO_CONNECTIVITY'
  | 'APP_IN_BACKGROUND'
  | 'METERED_NETWORK'
  | 'USER_CANCELLED'

/** Body of POST /v1/test-results */
export interface TestResult {
  sessionId: string
  startedAt: string
  downloadMbps: number | null
  uploadMbps: number | null
  latencyMs: number | null
  jitterMs: number | null
  packetLossPercent: number | null
  dnsResolutionMs: number | null
  tcpConnectionMs: number | null
  tlsHandshakeMs: number | null
  ttfbMs: number | null
  skipReason: SkipReason | null
}

export interface StoredSnapshot extends Snapshot { id: string }
export interface StoredTestResult extends TestResult { id: string }

/** A snapshot joined (by sessionId + time) with the test that followed it. */
export interface Measurement {
  snapshot: StoredSnapshot
  test: StoredTestResult | null
}

export interface SessionSummary {
  id: string
  operatorName: string
  deviceModel: string
  osVersion: string
  startedAt: string
  endedAt: string
  measurements: Measurement[]
  isLive: boolean
}

export interface Thresholds {
  minDownloadMbps: number
  maxLatencyMs: number
  maxPacketLossPercent: number
  minRsrpDbm: number
}

export type TestPolicy = 'every' | 'everyThird' | 'poorSignal'

export interface CollectionSettings {
  snapshotIntervalSec: number
  testPolicy: TestPolicy
  collectInBackground: boolean
  thresholds: Thresholds
}
