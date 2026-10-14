<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useNetworkStore } from './shared/store'
import { cellularRows, connectivityRows, deviceRows, locationRows } from './shared/rows'
import { avg, clock, dateTime, duration, fmt } from './shared/format'
import InfoBlock from './shared/components/InfoBlock.vue'
import TestResultPanel from './shared/components/TestResultPanel.vue'
import SignalTimeline from './components/SignalTimeline.vue'
import SessionList from './components/SessionList.vue'
import OperatorTable from './components/OperatorTable.vue'
import CollectionSettings from './components/CollectionSettings.vue'
import RequestLog from './components/RequestLog.vue'

const { sessions, measurements, settings, isLive, liveSessionId, loading, startLive, stopLive } = useNetworkStore()

const selectedSessionId = ref<string | null>(null)
const pinnedIndex = ref<number | null>(null)

watch(sessions, (list) => {
  if (!selectedSessionId.value && list.length) selectedSessionId.value = list[0].id
})

const session = computed(() => sessions.value.find((s) => s.id === selectedSessionId.value) ?? sessions.value[0] ?? null)
const currentIndex = computed(() => {
  const n = session.value?.measurements.length ?? 0
  if (!n) return -1
  return pinnedIndex.value === null ? n - 1 : Math.min(pinnedIndex.value, n - 1)
})
const current = computed(() => (session.value && currentIndex.value >= 0 ? session.value.measurements[currentIndex.value] : null))
const following = computed(() => pinnedIndex.value === null)

watch(selectedSessionId, () => (pinnedIndex.value = null))
watch(liveSessionId, (id) => { if (id) selectedSessionId.value = id })

const stats = computed(() => {
  const ms = session.value?.measurements ?? []
  const done = ms.map((m) => m.test).filter((t) => t && !t.skipReason)
  const skipped = ms.filter((m) => m.test?.skipReason).length
  return [
    { label: 'Avg download', value: fmt(avg(done.map((t) => t!.downloadMbps)), 1), unit: 'Mbps' },
    { label: 'Avg upload', value: fmt(avg(done.map((t) => t!.uploadMbps)), 1), unit: 'Mbps' },
    { label: 'Avg latency', value: fmt(avg(done.map((t) => t!.latencyMs))), unit: 'ms' },
    { label: 'Avg RSRP', value: fmt(avg(ms.map((m) => m.snapshot.cellularInfo?.rsrp))), unit: 'dBm' },
    { label: 'Tests run', value: `${done.length}`, unit: skipped ? `${skipped} skipped` : '' },
  ]
})

function select(i: number) {
  const n = session.value?.measurements.length ?? 0
  pinnedIndex.value = i >= n - 1 && session.value?.isLive ? null : i
}

const showRaw = ref(false)
const rawPayload = computed(() => {
  if (!current.value) return ''
  const { id: _s, ...snapshot } = current.value.snapshot
  const test = current.value.test ? (({ id: _t, ...t }) => t)(current.value.test) : null
  return JSON.stringify({ 'POST /api/telemetry/location': snapshot, 'POST /api/telemetry/speedtest': test }, null, 2)
})
</script>

<template>
  <div class="app">
    <aside class="rail">
      <div class="brand">
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
          <rect x="1" y="14" width="4" height="7" rx="1" fill="#6E97F0" />
          <rect x="7" y="10" width="4" height="11" rx="1" fill="#6E97F0" />
          <rect x="13" y="6" width="4" height="15" rx="1" fill="#6E97F0" />
          <rect x="19" y="1" width="2.5" height="20" rx="1" fill="#3B5280" />
        </svg>
        <span>Network quality</span>
      </div>
      <button class="live-btn" :class="{ on: isLive }" @click="isLive ? stopLive() : startLive()">
        {{ isLive ? 'Stop live session' : 'Start live session' }}
      </button>
      <SessionList :sessions="sessions" :selected-id="session?.id ?? null" @select="selectedSessionId = $event" />
    </aside>

    <main v-if="loading && !session" class="loading-state">
      <p>Loading data from API...</p>
    </main>

    <main v-else-if="!session" class="loading-state">
      <p>No sessions found. Start a live session to begin collecting data.</p>
    </main>

    <main v-else>
      <header class="head">
        <div>
          <h1>{{ session.operatorName }} on {{ session.deviceModel }}</h1>
          <p class="meta">
            <code>{{ session.id }}</code>
            {{ session.osVersion }}, started {{ dateTime(session.startedAt) }}, running for
            {{ duration(session.startedAt, session.endedAt) }}
            <span v-if="session.isLive" class="live-tag">Collecting every {{ settings.snapshotIntervalSec }} s (simulated)</span>
          </p>
        </div>
      </header>

      <dl class="stats">
        <div v-for="s in stats" :key="s.label">
          <dt>{{ s.label }}</dt>
          <dd><strong>{{ s.value }}</strong> <span>{{ s.unit }}</span></dd>
        </div>
      </dl>

      <SignalTimeline :measurements="session.measurements" :selected-index="currentIndex" :thresholds="settings.thresholds" @select="select" />

      <section v-if="current" class="detail">
        <div class="detail-head">
          <h2>Snapshot at {{ clock(current.snapshot.capturedAt) }}</h2>
          <div class="nav">
            <button :disabled="currentIndex <= 0" @click="select(currentIndex - 1)">Previous</button>
            <span>{{ currentIndex + 1 }} of {{ session.measurements.length }}</span>
            <button :disabled="currentIndex >= session.measurements.length - 1" @click="select(currentIndex + 1)">Next</button>
            <button v-if="session.isLive && !following" @click="pinnedIndex = null">Follow latest</button>
            <button :aria-pressed="showRaw" @click="showRaw = !showRaw">{{ showRaw ? 'Hide' : 'Show' }} request bodies</button>
          </div>
        </div>

        <pre v-if="showRaw" class="raw">{{ rawPayload }}</pre>

        <div class="blocks">
          <InfoBlock class="loc" title="Location" api-key="locationInfo" purpose="Where the user is and the network conditions at this point."
            :rows="locationRows(current.snapshot.locationInfo)" />
          <InfoBlock class="conn" title="Connectivity" api-key="connectivityInfo" purpose="Which network the user is on and how it is accessed."
            :rows="connectivityRows(current.snapshot.connectivityInfo)" />
          <InfoBlock class="cell" title="Cellular signal" api-key="cellularInfo" purpose="Radio signal quality and the serving cell."
            :rows="cellularRows(current.snapshot.cellularInfo)" />
          <InfoBlock class="dev" title="Device" api-key="deviceContext" purpose="Device and app state at the moment of capture."
            :rows="deviceRows(current.snapshot.deviceContext)" />
          <TestResultPanel class="test" :test="current.test" :thresholds="settings.thresholds" />
        </div>
      </section>

      <OperatorTable :measurements="measurements" :thresholds="settings.thresholds" />

      <div class="bottom">
        <CollectionSettings />
        <RequestLog />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app { display: grid; grid-template-columns: 264px 1fr; min-height: 100vh; }
.rail { background: var(--rail); padding: 18px 12px; display: flex; flex-direction: column; gap: 18px; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
.brand { display: flex; align-items: center; gap: 10px; color: #fff; font-weight: 680; font-stretch: 90%; font-size: 1.0625rem; padding: 0 8px; }
.live-btn { margin: 0 4px; padding: 9px 12px; border-radius: 4px; border: 1px solid #3B5280; background: #22344A; color: #fff; cursor: pointer; font-weight: 560; }
.live-btn:hover { background: #2A4060; }
.live-btn.on { background: #7EE0B0; color: #0F1A24; border-color: #7EE0B0; }

.loading-state { display: flex; align-items: center; justify-content: center; color: var(--ink-3); font-size: 0.9375rem; }
main { padding: 28px 32px 48px; display: flex; flex-direction: column; gap: 20px; min-width: 0; max-width: 1400px; }
h1 { margin: 0; font-size: 2rem; font-weight: 700; font-stretch: 85%; letter-spacing: -0.015em; line-height: 1.1; }
.meta { margin: 8px 0 0; color: var(--ink-2); font-size: 0.875rem; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.meta code { font-size: 0.8125rem; background: var(--panel); border: 1px solid var(--line); padding: 1px 6px; border-radius: 3px; }
.live-tag { background: #D5F5E5; color: #0B5E3F; font-weight: 600; padding: 1px 8px; border-radius: 3px; font-size: 0.8125rem; }

.stats { display: flex; flex-wrap: wrap; gap: 0; margin: 0; border-top: 2px solid var(--ink); }
.stats div { padding: 10px 28px 0 0; min-width: 140px; }
.stats dt { font-size: 0.8125rem; color: var(--ink-3); }
.stats dd { margin: 2px 0 0; font-variant-numeric: tabular-nums; }
.stats strong { font-size: 1.75rem; font-weight: 650; font-stretch: 82%; }
.stats span { color: var(--ink-3); font-size: 0.8125rem; }

.detail-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; }
.detail-head h2 { margin: 0; font-size: 1.125rem; font-weight: 660; }
.nav { display: flex; gap: 8px; align-items: center; font-size: 0.875rem; color: var(--ink-2); flex-wrap: wrap; }
.nav button { padding: 5px 10px; border: 1px solid var(--line); background: var(--panel); border-radius: 4px; cursor: pointer; font-size: 0.8125rem; }
.nav button:disabled { opacity: 0.45; cursor: default; }
.nav button[aria-pressed='true'] { background: var(--ink); color: #fff; border-color: var(--ink); }
.raw { background: #15202B; color: #D4DEE8; font-size: 0.75rem; padding: 14px 16px; border-radius: 6px; max-height: 340px; overflow: auto; margin: 0 0 12px; }

.blocks { display: grid; gap: 12px; grid-template-columns: 1fr 1fr 1.25fr; grid-template-areas: 'loc conn test' 'cell dev test' 'cell dev test'; align-items: start; }
.loc { grid-area: loc; } .conn { grid-area: conn; } .cell { grid-area: cell; } .dev { grid-area: dev; } .test { grid-area: test; }

.bottom { display: grid; grid-template-columns: 1.1fr 1fr; gap: 12px; align-items: start; }

@media (max-width: 1180px) {
  .blocks { grid-template-columns: 1fr 1fr; grid-template-areas: 'test test' 'loc conn' 'cell dev'; }
}
@media (max-width: 820px) {
  .app { grid-template-columns: 1fr; }
  .rail { position: static; height: auto; max-height: 320px; }
  main { padding: 20px 16px 40px; }
  .blocks { grid-template-columns: 1fr; grid-template-areas: 'test' 'loc' 'conn' 'cell' 'dev'; }
  .bottom { grid-template-columns: 1fr; }
}
</style>
