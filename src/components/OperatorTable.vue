<script setup lang="ts">
import { computed } from 'vue'
import type { Measurement, Thresholds } from '../shared/types'
import { avg, fmt } from '../shared/format'
import { testGrade } from '../shared/quality'

const props = defineProps<{ measurements: Measurement[]; thresholds: Thresholds }>()

const rows = computed(() => {
  const groups = new Map<string, Measurement[]>()
  for (const m of props.measurements) {
    const c = m.snapshot.connectivityInfo
    const key = `${c.operatorName ?? 'Unknown'}|${c.networkGeneration}`
    groups.set(key, [...(groups.get(key) ?? []), m])
  }
  return [...groups.entries()]
    .map(([key, ms]) => {
      const [operator, generation] = key.split('|')
      const tested = ms.map((m) => m.test).filter((t) => t && !t.skipReason)
      return {
        key, operator, generation,
        snapshots: ms.length,
        tests: tested.length,
        dl: avg(tested.map((t) => t!.downloadMbps)),
        latency: avg(tested.map((t) => t!.latencyMs)),
        loss: avg(tested.map((t) => t!.packetLossPercent)),
        rsrp: avg(ms.map((m) => m.snapshot.cellularInfo?.rsrp)),
        poorShare: tested.length ? tested.filter((t) => testGrade(t, props.thresholds) === 'poor').length / tested.length : null,
      }
    })
    .sort((a, b) => a.operator.localeCompare(b.operator) || a.generation.localeCompare(b.generation))
})
const maxDl = computed(() => Math.max(1, ...rows.value.map((r) => r.dl ?? 0)))
</script>

<template>
  <section class="operators">
    <header>
      <h2>Operators and network generations</h2>
      <p>All sessions combined. Speed, latency and loss are averaged over completed tests; RSRP over all snapshots.</p>
    </header>
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th>Operator</th><th>Network</th><th class="num">Snapshots</th><th class="num">Tests</th>
            <th class="bar-col">Avg download</th><th class="num">Avg latency</th><th class="num">Avg loss</th>
            <th class="num">Avg RSRP</th><th class="num">Poor tests</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.key">
            <td>{{ r.operator }}</td>
            <td>{{ r.generation }}</td>
            <td class="num">{{ r.snapshots }}</td>
            <td class="num">{{ r.tests }}</td>
            <td class="bar-col">
              <div class="bar-cell">
                <span class="bar"><i :style="{ width: ((r.dl ?? 0) / maxDl) * 100 + '%' }" /></span>
                <span class="bar-val">{{ fmt(r.dl, 1, ' Mbps') }}</span>
              </div>
            </td>
            <td class="num">{{ fmt(r.latency, 0, ' ms') }}</td>
            <td class="num">{{ fmt(r.loss, 2, '%') }}</td>
            <td class="num">{{ fmt(r.rsrp, 0, ' dBm') }}</td>
            <td class="num" :class="{ warn: (r.poorShare ?? 0) > 0.25 }">{{ r.poorShare === null ? '—' : Math.round(r.poorShare * 100) + '%' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.operators { background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 18px 20px; }
h2 { margin: 0; font-size: 1.0625rem; font-weight: 660; }
header p { margin: 4px 0 12px; color: var(--ink-3); font-size: 0.8125rem; }
.scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 0.875rem; min-width: 760px; }
th { text-align: left; font-weight: 560; color: var(--ink-3); font-size: 0.75rem; padding: 6px 10px; border-bottom: 1px solid var(--line); }
td { padding: 8px 10px; border-bottom: 1px solid var(--line-soft); font-variant-numeric: tabular-nums; }
.num { text-align: right; }
.bar-col { width: 26%; }
.bar-cell { display: flex; align-items: center; gap: 10px; }
.bar-val { min-width: 86px; text-align: right; white-space: nowrap; }
.bar { flex: 1; height: 8px; background: var(--line-soft); border-radius: 2px; overflow: hidden; }
.bar i { display: block; height: 100%; background: var(--accent); }
.warn { color: #C8432F; font-weight: 620; }
</style>
