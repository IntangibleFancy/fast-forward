<script setup lang="ts">
import { computed } from 'vue'

interface Trend {
  pct: string
  up: boolean
}

const props = withDefaults(defineProps<{
  title: string
  icon?: string
  iconColor?: string
  value: string
  /** Secondary line shown directly below the value (e.g. "lbs", "OTD ratio: 10.9") */
  subhead?: string
  /** Contextual label shown at the bottom when no trend is available
   *  (e.g. "Full year total", "Best for the year") */
  filterLabel?: string
  /** Trend arrow data — when present, replaces filterLabel */
  trend?: Trend | null
  /** Extra context appended after the trend pct (e.g. "vs May") */
  trendContext?: string
  /** Whether an upward trend is positive (true = on-time; false = exceptions) */
  trendPositiveUp?: boolean
}>(), {
  iconColor: 'primary',
  trendPositiveUp: true,
})

const trendColor = computed(() => {
  if (!props.trend) return ''
  return props.trend.up ? 'success' : 'error'
})

const trendClass = computed(() => {
  if (!props.trend) return ''
  return props.trend.up ? 'text-success' : 'text-error'
})
</script>

<template>
  <v-card class="metric-card pa-5" rounded="lg" elevation="0">

    <!-- Header row: title + icon (or slot override) -->
    <div class="d-flex align-start justify-space-between mb-3">
      <span class="card-label">{{ title }}</span>
      <slot name="action">
        <v-icon v-if="icon" :icon="icon" :color="iconColor" size="20" />
      </slot>
    </div>

    <!-- Main value -->
    <div class="metric-value">{{ value }}</div>

    <!-- Optional secondary line below value -->
    <div v-if="subhead" class="text-caption text-medium-emphasis mt-1">{{ subhead }}</div>

    <!-- Trend row or static filter label -->
    <div class="d-flex align-center justify-center mt-2 ga-1" v-if="trend">
      <v-icon
        :icon="trend.up ? 'mdi-trending-up' : 'mdi-trending-down'"
        :color="trendColor"
        size="16"
      />
      <span :class="trendClass" class="text-caption">
        {{ trend.pct }}%<template v-if="trendContext"> {{ trendContext }}</template>
      </span>
    </div>
    <div v-if="filterLabel" class="text-caption text-disabled mt-2">{{ filterLabel }}</div>

  </v-card>
</template>

<style scoped>
.card-label {
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

.metric-card {
  background-color: rgb(var(--v-theme-surface)) !important;
  border: 1px solid rgba(255, 255, 255, 0.07) !important;
  transition: transform 0.18s ease, box-shadow 0.2s ease;
  height: 100%;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45) !important;
}

.metric-value {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2.4rem;
  letter-spacing: 0.03em;
  line-height: 1;
  color: #fff;
}
</style>
