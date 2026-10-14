<script setup lang="ts">
import { computed } from 'vue'
import type { StoredTestResult, Thresholds } from '../types'
import { fmt, skipReasonText } from '../format'
import { gradeColor, gradeLabel, testGrade } from '../quality'

const props = defineProps<{ test: StoredTestResult | null; thresholds: Thresholds; compact?: boolean }>()

const grade = computed(() => testGrade(props.test, props.thresholds))

const metrics = computed(() => {
  const t = props.test
  if (!t || t.skipReason) return []
  const th = props.thresholds
  return [
    { key: 'downloadMbps', label: 'Download', value: fmt(t.downloadMbps, 1), unit: 'Mbps', bad: (t.downloadMbps ?? 0) < th.minDownloadMbps },
    { key: 'uploadMbps', label: 'Upload', value: fmt(t.uploadMbps, 1), unit: 'Mbps', bad: false },
    { key: 'latencyMs', label: 'Latency', value: fmt(t.latencyMs), unit: 'ms', bad: (t.latencyMs ?? 0) > th.maxLatencyMs },
    { key: 'jitterMs', label: 'Jitter', value: fmt(t.jitterMs, 1), unit: 'ms', bad: false },
    { key: 'packetLossPercent', label: 'Packet loss', value: fmt(t.packetLossPercent, 2), unit: '%', bad: (t.packetLossPercent ?? 0) > th.maxPacketLossPercent },
  ]
})

// DNS → TCP → TLS → server response is a real sequence, so it is drawn as one bar.
const phases = computed(() => {
  const t = props.test
  if (!t || t.skipReason || t.ttfbMs === null) return []
  const dns = t.dnsResolutionMs ?? 0
  const tcp = t.tcpConnectionMs ?? 0
  const tls = t.tlsHandshakeMs ?? 0
  const total = Math.max(t.ttfbMs, dns + tcp + tls)
  return [
    { key: 'dnsResolutionMs', label: 'DNS lookup', ms: dns, color: '#7A93C9' },
    { key: 'tcpConnectionMs', label: 'TCP connect', ms: tcp, color: '#3F65B8' },
    { key: 'tlsHandshakeMs', label: 'TLS handshake', ms: tls, color: '#1B3C86' },
    { key: 'ttfbMs', label: 'Server response', ms: Math.max(total - dns - tcp - tls, 0), color: '#B9C4D2' },
  ].map((p) => ({ ...p, pct: (p.ms / total) * 100 }))
})
</script>

<template>
  <section class="test-panel" :class="{ compact }">
    <header>
      <h3>Internet quality test</h3>
      <code>POST /v1/test-results</code>
    </header>

    <p v-if="!test" class="empty">
      No test ran after this snapshot. Under the current rule, tests don't follow every snapshot.
    </p>

    <div v-else-if="test.skipReason" class="skipped">
      <p class="skip-title">Test skipped <code>{{ test.skipReason }}</code></p>
      <p>{{ skipReasonText[test.skipReason] }}</p>
    </div>

    <template v-else>
      <p class="verdict" :style="{ '--g': gradeColor[grade] }">
        <span class="swatch" /> {{ gradeLabel[grade] }} connection
      </p>
      <dl class="metrics">
        <div v-for="m in metrics" :key="m.key" class="metric" :class="{ bad: m.bad }" :title="m.key">
          <dt>{{ m.label }}</dt>
          <dd><strong>{{ m.value }}</strong> <span>{{ m.unit }}</span></dd>
        </div>
      </dl>

      <h4>Time to first byte <strong>{{ test.ttfbMs }} ms</strong></h4>
      <div class="waterfall" role="img" :aria-label="phases.map((p) => `${p.label} ${p.ms} ms`).join(', ')">
        <span v-for="p in phases" :key="p.key" :style="{ width: p.pct + '%', background: p.color }" />
      </div>
      <ul class="phase-legend">
        <li v-for="p in phases" :key="p.key" :title="p.key">
          <span class="swatch" :style="{ background: p.color }" /> {{ p.label }} <b>{{ p.ms }} ms</b>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.test-panel { background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 16px 18px; }
.test-panel.compact { padding: 12px 14px; }
header { display: flex; align-items: baseline; justify-content: space-between; gap: 4px 8px; flex-wrap: wrap; }
code { white-space: nowrap; }
h3 { margin: 0; font-size: 1rem; font-weight: 650; }
code { font-size: 0.75rem; color: var(--accent); background: var(--accent-soft); padding: 2px 6px; border-radius: 4px; }
.empty, .skipped p { color: var(--ink-2); font-size: 0.875rem; line-height: 1.45; }
.skip-title { font-weight: 650; color: var(--ink) !important; display: flex; gap: 8px; align-items: center; }
.skip-title code { background: #F6E1DC; color: #9A2F1F; }
.verdict { display: flex; align-items: center; gap: 8px; margin: 12px 0; font-weight: 650; color: var(--g); }
.verdict .swatch { width: 10px; height: 10px; border-radius: 2px; background: var(--g); }
.metrics { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 0; border: 1px solid var(--line); border-radius: 4px; overflow: hidden; margin: 0; }
.metric { padding: 10px 12px; box-shadow: inset -1px -1px 0 var(--line); }
.metric dt { font-size: 0.75rem; color: var(--ink-3); }
.metric dd { margin: 2px 0 0; font-variant-numeric: tabular-nums; }
.metric strong { font-size: 1.375rem; font-weight: 640; font-stretch: 88%; }
.metric span { font-size: 0.75rem; color: var(--ink-3); }
.metric.bad strong { color: #C8432F; }
h4 { margin: 18px 0 8px; font-size: 0.875rem; font-weight: 520; color: var(--ink-2); display: flex; justify-content: space-between; }
h4 strong { color: var(--ink); font-variant-numeric: tabular-nums; }
.waterfall { display: flex; height: 14px; border-radius: 3px; overflow: hidden; }
.waterfall span { display: block; height: 100%; }
.phase-legend { list-style: none; padding: 0; margin: 10px 0 0; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; font-size: 0.8125rem; color: var(--ink-2); }
.phase-legend li { display: flex; align-items: center; gap: 6px; }
.phase-legend b { margin-left: auto; font-weight: 560; color: var(--ink); font-variant-numeric: tabular-nums; }
.phase-legend .swatch { width: 9px; height: 9px; border-radius: 2px; }
</style>
<style scoped>
.compact .phase-legend { grid-template-columns: 1fr; }
.compact .metrics { grid-template-columns: repeat(3, 1fr); }
</style>
