import { computed, reactive, ref } from 'vue'
import type { CollectionSettings, Measurement, SessionSummary, StoredTestResult } from './types'
import { db, fetchHistory, postSnapshot, postTestResult, requestLog } from './api'
import { advance, captureSnapshot, createWalker, runSpeedTest, shouldRunTest, type Walker } from './mock'

const settings = reactive<CollectionSettings>({
  snapshotIntervalSec: 60,
  testPolicy: 'everyThird',
  collectInBackground: true,
  thresholds: { minDownloadMbps: 5, maxLatencyMs: 100, maxPacketLossPercent: 2, minRsrpDbm: -110 },
})

const liveSessionId = ref<string | null>(null)
const loading = ref(true)
let walker: Walker | null = null
let timer: number | undefined
let liveIndex = 0
let initPromise: Promise<void> | null = null

const ts = (iso: string) => Date.parse(iso)

/** Join each snapshot with the first test in the same session that started before the next snapshot. */
const measurements = computed<Measurement[]>(() => {
  const testsBySession = new Map<string, StoredTestResult[]>()
  for (const t of db.tests.value) {
    const list = testsBySession.get(t.sessionId) ?? []
    list.push(t)
    testsBySession.set(t.sessionId, list)
  }
  const snaps = [...db.snapshots.value].sort((a, b) => ts(a.capturedAt) - ts(b.capturedAt))
  const nextInSession = new Map<string, number>()
  const out: Measurement[] = new Array(snaps.length)
  for (let i = snaps.length - 1; i >= 0; i--) {
    const s = snaps[i]
    const start = ts(s.capturedAt)
    const end = nextInSession.get(s.sessionId) ?? Infinity
    const test = testsBySession.get(s.sessionId)?.find((t) => ts(t.startedAt) >= start && ts(t.startedAt) < end) ?? null
    out[i] = { snapshot: s, test }
    nextInSession.set(s.sessionId, start)
  }
  return out
})

const sessions = computed<SessionSummary[]>(() => {
  const map = new Map<string, Measurement[]>()
  for (const m of measurements.value) {
    const list = map.get(m.snapshot.sessionId) ?? []
    list.push(m)
    map.set(m.snapshot.sessionId, list)
  }
  return [...map.entries()]
    .map(([id, ms]) => ({
      id,
      operatorName: ms[0].snapshot.connectivityInfo.operatorName ?? 'Unknown operator',
      deviceModel: ms[0].snapshot.deviceContext.deviceModel,
      osVersion: ms[0].snapshot.deviceContext.osVersion,
      startedAt: ms[0].snapshot.capturedAt,
      endedAt: ms[ms.length - 1].snapshot.capturedAt,
      measurements: ms,
      isLive: id === liveSessionId.value,
    }))
    .sort((a, b) => ts(b.startedAt) - ts(a.startedAt))
})

async function collect(first: boolean) {
  if (!walker) return
  if (!first) advance(walker, settings.snapshotIntervalSec)
  const snap = captureSnapshot(walker)
  await postSnapshot(snap)
  if (shouldRunTest(snap, settings, liveIndex)) await postTestResult(runSpeedTest(snap, settings))
  liveIndex++
}

function startLive() {
  stopLive()
  walker = createWalker(Date.now())
  liveSessionId.value = walker.sessionId
  liveIndex = 0
  void collect(true)
  timer = window.setInterval(() => void collect(false), 1500)
}

function stopLive() {
  if (timer) window.clearInterval(timer)
  timer = undefined
  walker = null
  liveSessionId.value = null
}

function initStore() {
  if (initPromise) return initPromise
  initPromise = fetchHistory()
    .then(({ snapshots, tests }) => {
      db.snapshots.value = snapshots
      db.tests.value = tests
    })
    .finally(() => {
      loading.value = false
    })
  return initPromise
}

export function useNetworkStore() {
  initStore()
  return {
    settings,
    measurements,
    sessions,
    requestLog,
    liveSessionId,
    loading,
    isLive: computed(() => liveSessionId.value !== null),
    startLive,
    stopLive,
  }
}
