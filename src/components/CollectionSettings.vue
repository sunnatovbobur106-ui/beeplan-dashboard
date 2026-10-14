<script setup lang="ts">
import { useNetworkStore } from '../shared/store'
import type { TestPolicy } from '../shared/types'

const { settings } = useNetworkStore()
const intervals = [
  { value: 10, label: '10 s' },
  { value: 60, label: '1 min' },
  { value: 300, label: '5 min' },
]
const policies: { value: TestPolicy; label: string }[] = [
  { value: 'every', label: 'After every snapshot' },
  { value: 'everyThird', label: 'After every third snapshot' },
  { value: 'poorSignal', label: 'Only when the signal is weak' },
]
</script>

<template>
  <section class="settings">
    <h2>Collection rules</h2>
    <p class="intro">
      The spec leaves these open. Try different answers here: the interval and test rule shape new live sessions,
      the thresholds regrade everything immediately.
    </p>

    <fieldset>
      <legend>Snapshot interval</legend>
      <div class="seg">
        <label v-for="i in intervals" :key="i.value" :class="{ on: settings.snapshotIntervalSec === i.value }">
          <input v-model.number="settings.snapshotIntervalSec" type="radio" :value="i.value" /> {{ i.label }}
        </label>
      </div>
    </fieldset>

    <fieldset>
      <legend>When to run a quality test</legend>
      <label v-for="p in policies" :key="p.value" class="radio">
        <input v-model="settings.testPolicy" type="radio" :value="p.value" /> {{ p.label }}
      </label>
    </fieldset>

    <label class="check">
      <input v-model="settings.collectInBackground" type="checkbox" /> Run tests while the app is in the background
    </label>

    <fieldset>
      <legend>Poor-quality thresholds</legend>
      <div class="thresholds">
        <label>Download below <span><input v-model.number="settings.thresholds.minDownloadMbps" type="number" min="0.5" step="0.5" /> Mbps</span></label>
        <label>Latency above <span><input v-model.number="settings.thresholds.maxLatencyMs" type="number" min="10" step="10" /> ms</span></label>
        <label>Packet loss above <span><input v-model.number="settings.thresholds.maxPacketLossPercent" type="number" min="0" step="0.5" /> %</span></label>
        <label>RSRP below <span><input v-model.number="settings.thresholds.minRsrpDbm" type="number" max="-60" step="5" /> dBm</span></label>
      </div>
    </fieldset>
  </section>
</template>

<style scoped>
.settings { background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 18px 20px; }
h2 { margin: 0; font-size: 1.0625rem; font-weight: 660; }
.intro { margin: 4px 0 14px; color: var(--ink-3); font-size: 0.8125rem; line-height: 1.45; }
fieldset { border: 0; padding: 0; margin: 0 0 16px; }
legend { font-size: 0.8125rem; font-weight: 600; color: var(--ink-2); margin-bottom: 6px; }
.seg { display: inline-flex; border: 1px solid var(--line); border-radius: 4px; overflow: hidden; }
.seg label { padding: 6px 14px; font-size: 0.875rem; cursor: pointer; border-left: 1px solid var(--line); }
.seg label:first-child { border-left: 0; }
.seg label.on { background: var(--ink); color: #fff; }
.seg input { position: absolute; opacity: 0; pointer-events: none; }
.seg label:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: -2px; }
.radio, .check { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; padding: 3px 0; cursor: pointer; }
.check { margin-bottom: 16px; }
input[type='radio'], input[type='checkbox'] { accent-color: var(--accent); }
.thresholds { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
.thresholds label { display: flex; flex-direction: column; gap: 4px; font-size: 0.8125rem; color: var(--ink-2); }
.thresholds span { display: flex; align-items: center; gap: 6px; color: var(--ink-3); }
.thresholds input { width: 84px; padding: 5px 8px; border: 1px solid var(--line); border-radius: 4px; font-variant-numeric: tabular-nums; color: var(--ink); }
</style>
