<script setup lang="ts">
import type { Row } from '../rows'
import { gradeColor } from '../quality'

defineProps<{ title: string; apiKey: string; purpose: string; rows: Row[]; compact?: boolean }>()
</script>

<template>
  <section class="info-block" :class="{ compact }">
    <header>
      <h3>{{ title }}</h3>
      <code>{{ apiKey }}</code>
    </header>
    <p v-if="!compact" class="purpose">{{ purpose }}</p>
    <dl>
      <div v-for="row in rows" :key="row.key" class="row">
        <dt :title="row.key">{{ row.label }}</dt>
        <dd>
          <span v-if="row.grade && row.grade !== 'none'" class="dot" :style="{ background: gradeColor[row.grade] }" />
          {{ row.value }}
        </dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.info-block { background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 16px 18px; }
.info-block.compact { padding: 12px 14px; }
header { display: flex; align-items: baseline; justify-content: space-between; gap: 4px 8px; flex-wrap: wrap; }
h3 { margin: 0; font-size: 1rem; font-weight: 650; }
code { font-size: 0.75rem; color: var(--accent); background: var(--accent-soft); padding: 2px 6px; border-radius: 4px; }
.purpose { margin: 4px 0 10px; color: var(--ink-3); font-size: 0.8125rem; line-height: 1.4; }
dl { margin: 8px 0 0; }
.row { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; border-top: 1px solid var(--line-soft); font-size: 0.875rem; }
.row:first-child { border-top: 0; }
dt { color: var(--ink-2); }
dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; font-weight: 520; display: flex; align-items: center; gap: 6px; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
</style>
