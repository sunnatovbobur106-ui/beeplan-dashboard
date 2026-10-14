<script setup lang="ts">
import { useNetworkStore } from '../shared/store'
import { clock } from '../shared/format'

const { requestLog } = useNetworkStore()
</script>

<template>
  <section class="log">
    <h2>Requests</h2>
    <p class="intro">Calls the live session makes to dev.uzproger.ru.</p>
    <p v-if="!requestLog.length" class="empty">Start a live session to see requests to both endpoints here.</p>
    <ol v-else>
      <li v-for="r in requestLog.slice(0, 12)" :key="r.id">
        <span class="status">{{ r.status }}</span>
        <code>{{ r.method }} {{ r.path }}</code>
        <span class="meta">{{ (r.bytes / 1024).toFixed(1) }} KB, {{ r.durationMs }} ms</span>
        <time>{{ clock(r.at) }}</time>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.log { background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 18px 20px; }
h2 { margin: 0; font-size: 1.0625rem; font-weight: 660; }
.intro { margin: 4px 0 12px; color: var(--ink-3); font-size: 0.8125rem; }
.empty { color: var(--ink-2); font-size: 0.875rem; }
ol { list-style: none; margin: 0; padding: 0; font-size: 0.8125rem; }
li { display: grid; grid-template-columns: auto 1fr auto auto; gap: 10px; align-items: center; padding: 6px 0; border-top: 1px solid var(--line-soft); }
li:first-child { border-top: 0; }
.status { color: #0F8A5F; font-weight: 650; font-variant-numeric: tabular-nums; }
code { font-size: 0.8125rem; }
.meta, time { color: var(--ink-3); font-variant-numeric: tabular-nums; }
</style>
