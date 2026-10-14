<script setup lang="ts">
import { computed } from 'vue'
import type { Measurement, Thresholds } from '../shared/types'
import { clock, fmt } from '../shared/format'
import { gradeColor, signalGrade, testGrade } from '../shared/quality'

const props = defineProps<{ measurements: Measurement[]; selectedIndex: number; thresholds: Thresholds }>()
const emit = defineEmits<{ select: [index: number] }>()

const W = 1000
const CHART_H = 160

const maxDl = computed(() => {
  const values = props.measurements.map((m) => m.test?.downloadMbps ?? 0)
  return Math.max(props.thresholds.minDownloadMbps * 2.5, ...values) * 1.08
})

const slot = computed(() => W / Math.max(props.measurements.length, 1))

const bars = computed(() =>
  props.measurements.map((m, i) => {
    const dl = m.test?.downloadMbps ?? null
    const h = dl === null ? 0 : Math.max((dl / maxDl.value) * CHART_H, 2)
    const signal = m.snapshot.cellularInfo
    return {
      i,
      x: i * slot.value + slot.value * 0.16,
      w: Math.max(slot.value * 0.68, 2),
      h,
      y: CHART_H - h,
      fill: gradeColor[testGrade(m.test, props.thresholds)],
      signalFill: gradeColor[signalGrade(signal)],
      kind: !m.test ? 'none' : m.test.skipReason ? 'skipped' : 'ok',
      label: `${clock(m.snapshot.capturedAt)}: ${
        dl === null ? (m.test?.skipReason ? `test skipped (${m.test.skipReason})` : 'no test') : `${dl.toFixed(1)} Mbps`
      }, RSRP ${fmt(signal?.rsrp ?? null, 0, ' dBm')}`,
    }
  }),
)

const thresholdPct = computed(() => (props.thresholds.minDownloadMbps / maxDl.value) * 100)
const ticks = computed(() => {
  const ms = props.measurements
  if (!ms.length) return []
  const idx = [0, Math.floor(ms.length / 2), ms.length - 1]
  return [...new Set(idx)].map((i) => ({ pct: ((i + 0.5) / ms.length) * 100, label: clock(ms[i].snapshot.capturedAt) }))
})

function onKey(e: KeyboardEvent) {
  const n = props.measurements.length
  if (!n) return
  if (e.key === 'ArrowLeft') emit('select', Math.max(props.selectedIndex - 1, 0))
  if (e.key === 'ArrowRight') emit('select', Math.min(props.selectedIndex + 1, n - 1))
}
</script>

<template>
  <figure class="timeline">
    <figcaption>
      <div>
        <h2>Speed against signal, snapshot by snapshot</h2>
        <p>
          Each column is one snapshot. Height is the download speed of the test that followed it; the strip underneath is
          the radio signal at that moment. Use the arrow keys to step through.
        </p>
      </div>
      <ul class="legend">
        <li><i style="background: #0F8A5F" /> Excellent</li>
        <li><i style="background: #74A72E" /> Good</li>
        <li><i style="background: #D9971A" /> Fair</li>
        <li><i style="background: #C8432F" /> Poor</li>
        <li><i class="hatch" /> Skipped</li>
      </ul>
    </figcaption>

    <div class="plot" tabindex="0" role="listbox" aria-label="Snapshots in this session" @keydown="onKey">
      <div class="threshold" :style="{ bottom: `${46 + Math.min(thresholdPct, 100) * 1.6}px` }">
        <span>{{ thresholds.minDownloadMbps }} Mbps minimum</span>
      </div>
      <svg :viewBox="`0 0 ${W} 184`" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#EEF1F4" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#B4BEC9" stroke-width="3" />
          </pattern>
        </defs>
        <g v-for="b in bars" :key="b.i" class="col" :class="{ selected: b.i === selectedIndex }" @click="emit('select', b.i)">
          <rect :x="b.i * slot" y="0" :width="slot" height="184" class="hit" />
          <rect v-if="b.kind === 'ok'" :x="b.x" :y="b.y" :width="b.w" :height="b.h" :fill="b.fill" />
          <rect v-else-if="b.kind === 'skipped'" :x="b.x" :y="CHART_H - 40" :width="b.w" height="40" fill="url(#hatch)" />
          <rect :x="b.x" y="168" :width="b.w" height="16" :fill="b.signalFill" />
          <title>{{ b.label }}</title>
        </g>
      </svg>
      <div class="ticks">
        <span v-for="t in ticks" :key="t.pct" :style="{ left: t.pct + '%' }">{{ t.label }}</span>
      </div>
    </div>
  </figure>
</template>

<style scoped>
.timeline { margin: 0; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 20px 22px 14px; }
figcaption { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: 18px; }
h2 { margin: 0; font-size: 1.375rem; font-weight: 680; font-stretch: 92%; letter-spacing: -0.01em; }
figcaption p { margin: 6px 0 0; color: var(--ink-2); font-size: 0.875rem; max-width: 62ch; line-height: 1.45; }
.legend { list-style: none; display: flex; gap: 14px; padding: 0; margin: 0; align-self: flex-end; font-size: 0.8125rem; color: var(--ink-2); flex-wrap: wrap; }
.legend li { display: flex; align-items: center; gap: 6px; }
.legend i { width: 10px; height: 10px; border-radius: 2px; }
.legend .hatch { background: repeating-linear-gradient(45deg, #B4BEC9 0 2px, #EEF1F4 2px 4px); }
.plot { position: relative; padding-bottom: 22px; border-radius: 4px; }
svg { display: block; width: 100%; height: 184px; }
.col { cursor: pointer; }
.col .hit { fill: transparent; }
.col:hover .hit { fill: #F1F4F7; }
.col.selected .hit { fill: var(--accent-soft); }
.col.selected rect:not(.hit) { stroke: var(--ink); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
.threshold { position: absolute; left: 0; right: 0; border-top: 1px dashed var(--ink-3); pointer-events: none; z-index: 1; }
.threshold span { position: absolute; right: 0; top: -18px; font-size: 0.6875rem; color: var(--ink-3); background: var(--panel); padding: 0 4px; }
.ticks { position: absolute; left: 0; right: 0; bottom: 0; height: 18px; font-size: 0.75rem; color: var(--ink-3); font-variant-numeric: tabular-nums; }
.ticks span { position: absolute; transform: translateX(-50%); white-space: nowrap; }
.ticks span:first-child { transform: none; left: 0 !important; }
.ticks span:last-child:not(:first-child) { transform: translateX(-100%); }
</style>
