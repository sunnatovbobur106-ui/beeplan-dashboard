<script setup lang="ts">
import type { SessionSummary } from '../shared/types'
import { dateTime } from '../shared/format'

defineProps<{ sessions: SessionSummary[]; selectedId: string | null }>()
const emit = defineEmits<{ select: [id: string] }>()
</script>

<template>
  <nav class="sessions" aria-label="Sessions">
    <h2>Sessions</h2>
    <button
      v-for="s in sessions"
      :key="s.id"
      class="session"
      :class="{ active: s.id === selectedId }"
      :aria-current="s.id === selectedId ? 'true' : undefined"
      @click="emit('select', s.id)"
    >
      <span class="top">
        <strong>{{ s.operatorName }}</strong>
        <span v-if="s.isLive" class="live">Live</span>
      </span>
      <span class="sub">{{ s.deviceModel }}</span>
      <span class="sub">{{ dateTime(s.startedAt) }}, {{ s.measurements.length }} snapshots</span>
    </button>
  </nav>
</template>

<style scoped>
.sessions { display: flex; flex-direction: column; gap: 2px; }
h2 { font-size: 0.8125rem; font-weight: 560; color: #8FA0B2; margin: 0 0 8px 10px; }
.session { text-align: left; background: none; border: 0; border-radius: 4px; padding: 9px 10px; color: #C9D3DD; cursor: pointer; display: flex; flex-direction: column; gap: 2px; border-left: 3px solid transparent; }
.session:hover { background: #22344A; }
.session.active { background: #263C55; color: #fff; border-left-color: #6E97F0; }
.top { display: flex; justify-content: space-between; align-items: center; }
strong { font-weight: 620; }
.sub { font-size: 0.75rem; color: #8FA0B2; }
.session.active .sub { color: #B5C3D1; }
.live { font-size: 0.6875rem; font-weight: 650; color: #0F1A24; background: #7EE0B0; border-radius: 3px; padding: 1px 6px; }
</style>
