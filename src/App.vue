<script setup lang="ts">
import { ref, computed } from 'vue'
import { Line, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import type { ChartOptions, ChartData } from 'chart.js'
import metricsRaw from './data/metrics.json'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
)

// ── Types ─────────────────────────────────────────────────────────────────────
interface Region {
  name: string
  onTimeDeliveries: number
  openExceptions: number
}
interface ExceptionReasons {
  mechanicalIssues: number
  labelError: number
  distributionCenterError: number
  manifestError: number
  storageCapacity: number
}
interface MonthData {
  month: string
  year: number
  onTimeDeliveries: number
  shipmentVolumeLbs: number
  openExceptions: number
  fuelConsumptionGallons: number
  regions: Region[]
  exceptionReasons: ExceptionReasons
}

// ── Data ──────────────────────────────────────────────────────────────────────
const months = metricsRaw.months as MonthData[]
const monthNames = months.map(m => m.month)
const monthOptions = ['All', ...monthNames]

// ── State ─────────────────────────────────────────────────────────────────────
const selectedMonth = ref<string>('All')
const volumeUnit = ref<'lbs' | 'kg'>('lbs')

// ── Selectors ─────────────────────────────────────────────────────────────────
const currentMonthIndex = computed(() =>
  selectedMonth.value === 'All' ? -1 : monthNames.indexOf(selectedMonth.value)
)
const currentData = computed<MonthData | null>(() =>
  currentMonthIndex.value >= 0 ? months[currentMonthIndex.value] : null
)
const previousData = computed<MonthData | null>(() =>
  currentMonthIndex.value > 0 ? months[currentMonthIndex.value - 1] : null
)

// ── KPI values ────────────────────────────────────────────────────────────────
const LBS_TO_KG = 0.453592

const onTimeDeliveries = computed(() =>
  currentData.value
    ? currentData.value.onTimeDeliveries
    : months.reduce((s, m) => s + m.onTimeDeliveries, 0)
)

const shipmentVolume = computed(() => {
  const lbs = currentData.value
    ? currentData.value.shipmentVolumeLbs
    : months.reduce((s, m) => s + m.shipmentVolumeLbs, 0)
  return volumeUnit.value === 'lbs' ? lbs : Math.round(lbs * LBS_TO_KG)
})

const openExceptions = computed(() =>
  currentData.value
    ? currentData.value.openExceptions
    : months.reduce((s, m) => s + m.openExceptions, 0)
)

const topRegion = computed(() => {
  const source = currentData.value ? [currentData.value] : months
  const agg: Record<string, { onTime: number; ex: number }> = {}
  for (const m of source) {
    for (const r of m.regions) {
      if (!agg[r.name]) agg[r.name] = { onTime: 0, ex: 0 }
      agg[r.name].onTime += r.onTimeDeliveries
      agg[r.name].ex += r.openExceptions
    }
  }
  return Object.entries(agg)
    .map(([name, v]) => ({ name, ratio: v.onTime / v.ex }))
    .sort((a, b) => b.ratio - a.ratio)[0] ?? null
})

const topRegionPrev = computed(() => {
  if (!previousData.value) return null
  return [...previousData.value.regions]
    .map(r => ({ name: r.name, ratio: r.onTimeDeliveries / r.openExceptions }))
    .sort((a, b) => b.ratio - a.ratio)[0] ?? null
})

// ── Trend helpers ─────────────────────────────────────────────────────────────
function calcTrend(curr: number, prev: number) {
  const pct = ((curr - prev) / prev) * 100
  return { pct: Math.abs(pct).toFixed(1), up: pct >= 0 }
}

const onTimeTrend = computed(() =>
  currentData.value && previousData.value
    ? calcTrend(currentData.value.onTimeDeliveries, previousData.value.onTimeDeliveries)
    : null
)
const volumeTrend = computed(() =>
  currentData.value && previousData.value
    ? calcTrend(currentData.value.shipmentVolumeLbs, previousData.value.shipmentVolumeLbs)
    : null
)
const exceptionTrend = computed(() =>
  currentData.value && previousData.value
    ? calcTrend(currentData.value.openExceptions, previousData.value.openExceptions)
    : null
)
const regionTrend = computed(() => {
  if (!topRegion.value || !topRegionPrev.value) return null
  if (topRegion.value.name !== topRegionPrev.value.name) return null
  return calcTrend(topRegion.value.ratio, topRegionPrev.value.ratio)
})

// ── Formatters ────────────────────────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString() }
function fmtVolume(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return fmt(n)
}

// ── Chart palette ─────────────────────────────────────────────────────────────
const C = {
  blue: '#42A5F5',
  cyan: '#26C6DA',
  purple: '#7E57C2',
  indigo: '#5C6BC0',
  blueAlpha: 'rgba(66,165,245,0.12)',
  cyanAlpha: 'rgba(38,198,218,0.12)',
  muted: 'rgba(66,165,245,0.28)',
  mutedCyan: 'rgba(38,198,218,0.28)',
  grid: 'rgba(255,255,255,0.05)',
  tick: 'rgba(255,255,255,0.45)',
  tooltipBg: 'rgba(18,18,28,0.97)',
  tooltipBorder: 'rgba(255,255,255,0.08)',
}

const tooltipDefaults = {
  backgroundColor: C.tooltipBg,
  titleColor: '#fff',
  bodyColor: C.tick,
  borderColor: C.tooltipBorder,
  borderWidth: 1,
  padding: 10,
  cornerRadius: 6,
}

const scaleDefaults = {
  grid: { color: C.grid },
  ticks: { color: C.tick, font: { family: 'Roboto', size: 11 } },
}

// ── Line chart: Volume + Fuel ─────────────────────────────────────────────────
const lineChartData = computed<ChartData<'line'>>(() => {
  const si = currentMonthIndex.value
  const pointColor = (base: string, muted: string) =>
    months.map((_, i) => (si === -1 || i === si ? base : muted))
  const pointSize = months.map((_, i) => (si !== -1 && i === si ? 7 : 4))

  return {
    labels: monthNames,
    datasets: [
      {
        label: `Volume (M ${volumeUnit.value})`,
        data: months.map(m => {
          const val = volumeUnit.value === 'lbs'
            ? m.shipmentVolumeLbs
            : Math.round(m.shipmentVolumeLbs * LBS_TO_KG)
          return parseFloat((val / 1_000_000).toFixed(2))
        }),
        borderColor: C.blue,
        backgroundColor: C.blueAlpha,
        pointBackgroundColor: pointColor(C.blue, C.muted),
        pointRadius: pointSize,
        pointHoverRadius: 8,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Fuel (K gal)',
        data: months.map(m => parseFloat((m.fuelConsumptionGallons / 1000).toFixed(1))),
        borderColor: C.cyan,
        backgroundColor: C.cyanAlpha,
        pointBackgroundColor: pointColor(C.cyan, C.mutedCyan),
        pointRadius: pointSize,
        pointHoverRadius: 8,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  }
})

const lineChartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  animation: { duration: 400 },
  plugins: {
    legend: {
      labels: { color: C.tick, font: { family: 'Roboto', size: 12 }, boxWidth: 12, padding: 16 },
    },
    tooltip: tooltipDefaults,
  },
  scales: {
    x: scaleDefaults,
    y: {
      ...scaleDefaults,
      position: 'left',
      title: { display: true, text: `M ${volumeUnit.value}`, color: C.tick, font: { family: 'Roboto', size: 11 } },
    },
    y1: {
      ...scaleDefaults,
      position: 'right',
      grid: { drawOnChartArea: false },
      title: { display: true, text: 'K gal', color: C.tick, font: { family: 'Roboto', size: 11 } },
    },
  },
}))

// ── Bar chart: Exceptions by month ────────────────────────────────────────────
const barMonthData = computed<ChartData<'bar'>>(() => {
  const si = currentMonthIndex.value
  return {
    labels: monthNames,
    datasets: [{
      label: 'Open Exceptions',
      data: months.map(m => m.openExceptions),
      backgroundColor: months.map((_, i) => si === -1 || i === si ? C.blue : C.muted),
      borderRadius: 4,
      borderSkipped: false,
    }],
  }
})

const barMonthOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  plugins: {
    legend: { display: false },
    tooltip: tooltipDefaults,
  },
  scales: {
    x: scaleDefaults,
    y: scaleDefaults,
  },
}

// ── Bar chart: Exceptions by reason ──────────────────────────────────────────
const reasonLabels = ['Mechanical', 'Label Error', 'DC Error', 'Manifest', 'Storage']
const reasonKeys: (keyof ExceptionReasons)[] = [
  'mechanicalIssues', 'labelError', 'distributionCenterError', 'manifestError', 'storageCapacity',
]
const reasonBg = [
  'rgba(66,165,245,0.75)',
  'rgba(92,107,192,0.75)',
  'rgba(38,198,218,0.75)',
  'rgba(126,87,194,0.75)',
  'rgba(66,165,245,0.45)',
]
const reasonBorder = [C.blue, C.indigo, C.cyan, C.purple, C.blue]

const barReasonData = computed<ChartData<'bar'>>(() => {
  const source = currentData.value ? [currentData.value] : months
  const totals = reasonKeys.map(k => source.reduce((s, m) => s + m.exceptionReasons[k], 0))
  return {
    labels: reasonLabels,
    datasets: [{
      label: 'Exceptions',
      data: totals,
      backgroundColor: reasonBg,
      borderColor: reasonBorder,
      borderWidth: 1,
      borderRadius: 4,
      borderSkipped: false,
    }],
  }
})

const barReasonOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  plugins: {
    legend: { display: false },
    tooltip: tooltipDefaults,
  },
  scales: {
    x: scaleDefaults,
    y: scaleDefaults,
  },
}
</script>

<template>
  <v-app theme="dark">

    <!-- ── App Bar ────────────────────────────────────────────────────────── -->
    <v-app-bar flat height="64" color="surface" border="b">
      <template #prepend>
        <v-icon icon="mdi-truck-fast" color="primary" size="26" class="ml-3" />
      </template>

      <v-app-bar-title>
        <div class="d-flex flex-column">
          <span class="app-title">FastForward</span>
          <span class="text-caption text-medium-emphasis" style="line-height:1; letter-spacing:0.05em">
            Logistics Operations
          </span>
        </div>
      </v-app-bar-title>

      <template #append>
        <div class="d-flex align-center ga-3 mr-4">
          <span class="text-caption text-medium-emphasis">Period</span>
          <v-select
            v-model="selectedMonth"
            :items="monthOptions"
            density="compact"
            variant="outlined"
            hide-details
            style="min-width: 110px"
            bg-color="surface-variant"
          />
        </div>
      </template>
    </v-app-bar>

    <!-- ── Main ──────────────────────────────────────────────────────────── -->
    <v-main>
      <v-container fluid class="px-6 py-6">

        <!-- ── KPI Cards ──────────────────────────────────────────────────── -->
        <v-row>

          <!-- On-Time Deliveries -->
          <v-col cols="12" sm="6" md="3">
            <v-card class="metric-card pa-5" rounded="lg" elevation="0">
              <div class="d-flex align-start justify-space-between mb-3">
                <span class="card-label">On-Time Deliveries</span>
                <v-icon icon="mdi-check-decagram-outline" color="primary" size="20" />
              </div>
              <div class="metric-value">{{ fmt(onTimeDeliveries) }}</div>
              <div class="d-flex align-center mt-2 ga-1" v-if="onTimeTrend">
                <v-icon
                  :icon="onTimeTrend.up ? 'mdi-trending-up' : 'mdi-trending-down'"
                  :color="onTimeTrend.up ? 'success' : 'error'"
                  size="16"
                />
                <span :class="onTimeTrend.up ? 'text-success' : 'text-error'" class="text-caption">
                  {{ onTimeTrend.pct }}% vs {{ previousData?.month }}
                </span>
              </div>
              <div v-else class="text-caption text-disabled mt-2">Full year total</div>
            </v-card>
          </v-col>

          <!-- Shipment Volume -->
          <v-col cols="12" sm="6" md="3">
            <v-card class="metric-card pa-5" rounded="lg" elevation="0">
              <div class="d-flex align-start justify-space-between mb-3">
                <span class="card-label">Shipment Volume</span>
                <v-btn-toggle
                  v-model="volumeUnit"
                  density="compact"
                  variant="outlined"
                  divided
                  mandatory
                  class="unit-toggle"
                >
                  <v-btn value="lbs" size="x-small">lbs</v-btn>
                  <v-btn value="kg" size="x-small">kg</v-btn>
                </v-btn-toggle>
              </div>
              <div class="metric-value">{{ fmtVolume(shipmentVolume) }}</div>
              <div class="text-caption text-medium-emphasis mt-1">{{ volumeUnit }}</div>
              <div class="d-flex align-center mt-1 ga-1" v-if="volumeTrend">
                <v-icon
                  :icon="volumeTrend.up ? 'mdi-trending-up' : 'mdi-trending-down'"
                  color="primary"
                  size="16"
                />
                <span class="text-caption text-medium-emphasis">
                  {{ volumeTrend.pct }}% vs {{ previousData?.month }}
                </span>
              </div>
              <div v-else class="text-caption text-disabled mt-2">Full year total</div>
            </v-card>
          </v-col>

          <!-- Top Region -->
          <v-col cols="12" sm="6" md="3">
            <v-card class="metric-card pa-5" rounded="lg" elevation="0">
              <div class="d-flex align-start justify-space-between mb-3">
                <span class="card-label">Top Region</span>
                <v-icon icon="mdi-map-marker-radius-outline" color="secondary" size="20" />
              </div>
              <div class="metric-value" style="font-size:1.8rem">{{ topRegion?.name ?? '—' }}</div>
              <div class="text-caption text-medium-emphasis mt-1">
                OTD ratio: {{ topRegion ? topRegion.ratio.toFixed(1) : '—' }}
              </div>
              <div class="d-flex align-center mt-1 ga-1" v-if="regionTrend">
                <v-icon
                  :icon="regionTrend.up ? 'mdi-trending-up' : 'mdi-trending-down'"
                  :color="regionTrend.up ? 'success' : 'error'"
                  size="16"
                />
                <span :class="regionTrend.up ? 'text-success' : 'text-error'" class="text-caption">
                  {{ regionTrend.pct }}% ratio vs {{ previousData?.month }}
                </span>
              </div>
              <div v-else class="text-caption text-disabled mt-2">
                {{ currentData ? 'No prior month data' : 'Best for the year' }}
              </div>
            </v-card>
          </v-col>

          <!-- Open Exceptions -->
          <v-col cols="12" sm="6" md="3">
            <v-card class="metric-card pa-5" rounded="lg" elevation="0">
              <div class="d-flex align-start justify-space-between mb-3">
                <span class="card-label">Open Exceptions</span>
                <v-icon icon="mdi-alert-circle-outline" color="warning" size="20" />
              </div>
              <div class="metric-value">{{ fmt(openExceptions) }}</div>
              <div class="d-flex align-center mt-2 ga-1" v-if="exceptionTrend">
                <v-icon
                  :icon="exceptionTrend.up ? 'mdi-trending-up' : 'mdi-trending-down'"
                  :color="exceptionTrend.up ? 'error' : 'success'"
                  size="16"
                />
                <span :class="exceptionTrend.up ? 'text-error' : 'text-success'" class="text-caption">
                  {{ exceptionTrend.pct }}% vs {{ previousData?.month }}
                </span>
              </div>
              <div v-else class="text-caption text-disabled mt-2">Full year total</div>
            </v-card>
          </v-col>

        </v-row>

        <!-- ── Section header ─────────────────────────────────────────────── -->
        <div class="mt-8 mb-5">
          <h2 class="section-title">Performance Overview</h2>
          <p class="text-medium-emphasis text-body-2 mt-1">
            Monthly breakdown of shipment activity, delivery exceptions, and fuel consumption across all regions.
          </p>
        </div>

        <!-- ── Charts row ─────────────────────────────────────────────────── -->
        <v-row>

          <!-- Line chart: Volume + Fuel -->
          <v-col cols="12" md="5">
            <v-card class="chart-card pa-5" rounded="lg" elevation="0">
              <div class="chart-title">Volume &amp; Fuel Consumption</div>
              <div class="text-caption text-medium-emphasis mt-1 mb-4">
                Shipment volume vs. fuel usage, Jan–Dec 2025
              </div>
              <div class="chart-wrap">
                <Line :data="lineChartData" :options="(lineChartOptions as any)" />
              </div>
            </v-card>
          </v-col>

          <!-- Bar chart: Exceptions by month -->
          <v-col cols="12" md="4">
            <v-card class="chart-card pa-5" rounded="lg" elevation="0">
              <div class="chart-title">Open Exceptions by Month</div>
              <div class="text-caption text-medium-emphasis mt-1 mb-4">
                Number of delayed or flagged shipments per month
              </div>
              <div class="chart-wrap">
                <Bar :data="barMonthData" :options="barMonthOptions" />
              </div>
            </v-card>
          </v-col>

          <!-- Bar chart: Exceptions by reason -->
          <v-col cols="12" md="3">
            <v-card class="chart-card pa-5" rounded="lg" elevation="0">
              <div class="chart-title">Exceptions by Reason</div>
              <div class="text-caption text-medium-emphasis mt-1 mb-4">
                {{ currentData ? currentData.month + ' 2025 breakdown' : 'Full year breakdown' }}
              </div>
              <div class="chart-wrap">
                <Bar :data="barReasonData" :options="barReasonOptions" />
              </div>
            </v-card>
          </v-col>

        </v-row>

        <!-- ── Footer ─────────────────────────────────────────────────────── -->
        <div class="text-center text-caption text-disabled mt-8 pb-2">
          FastForward Logistics &nbsp;·&nbsp; Operations Dashboard &nbsp;·&nbsp; FY 2025
        </div>

      </v-container>
    </v-main>

  </v-app>
</template>

<style scoped>
.app-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.45rem;
  letter-spacing: 0.1em;
  line-height: 1;
  color: #fff;
}

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

.unit-toggle {
  height: 24px !important;
  font-size: 0.65rem !important;
}

.section-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.5rem;
  letter-spacing: 0.08em;
  color: #fff;
}

.chart-card {
  background-color: rgb(var(--v-theme-surface)) !important;
  border: 1px solid rgba(255, 255, 255, 0.07) !important;
}

.chart-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1rem;
  letter-spacing: 0.06em;
  color: #fff;
}

.chart-wrap {
  height: 280px;
  position: relative;
}
</style>
