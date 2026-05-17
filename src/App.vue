<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Line, Bar } from 'vue-chartjs'
import MetricCard from './components/MetricCard.vue'
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

// ── Notifications ─────────────────────────────────────────────────────────────
interface Notification {
  id: number
  type: 'warning' | 'success' | 'info' | 'error'
  icon: string
  title: string
  message: string
  time: string
  read: boolean
}

const notifications = ref<Notification[]>([
  {
    id: 1,
    type: 'warning',
    icon: 'mdi-alert-outline',
    title: 'Exception Spike — South Region',
    message: 'Open exceptions in the South region are up 18% compared to last week. Review flagged shipments.',
    time: '2 hours ago',
    read: false,
  },
  {
    id: 2,
    type: 'success',
    icon: 'mdi-trophy-outline',
    title: 'Record Shipment Volume',
    message: 'November shipment volume hit the highest monthly total on record at 4.1M lbs.',
    time: '1 day ago',
    read: false,
  },
  {
    id: 3,
    type: 'error',
    icon: 'mdi-file-document-alert-outline',
    title: 'Manifest Errors Flagged',
    message: '3 manifests from the Midwest DC have been flagged for manifest error review.',
    time: '2 days ago',
    read: false,
  },
])

const notificationsMenu = ref(false)
const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

function markAllRead() {
  notifications.value.forEach(n => (n.read = true))
}

const notificationTypeColor: Record<Notification['type'], string> = {
  warning: 'warning',
  success: 'success',
  error: 'error',
  info: 'primary',
}

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
const lineChartData = ref<ChartData<'line'>>({
  labels: monthNames,
  datasets: [
    {
      label: 'Volume (M lbs)',
      data: months.map(m => parseFloat((m.shipmentVolumeLbs / 1_000_000).toFixed(2))),
      borderColor: C.blue,
      backgroundColor: C.blueAlpha,
      pointBackgroundColor: months.map(() => C.blue),
      pointRadius: months.map(() => 4),
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
      pointBackgroundColor: months.map(() => C.cyan),
      pointRadius: months.map(() => 4),
      pointHoverRadius: 8,
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      yAxisID: 'y1',
    },
  ],
})

watch([currentMonthIndex, volumeUnit], ([si, unit]) => {
  const s = si as number
  const u = unit as 'lbs' | 'kg'
  lineChartData.value = {
    labels: monthNames,
    datasets: [
      {
        label: `Volume (M ${u})`,
        data: months.map(m => parseFloat(((u === 'lbs' ? m.shipmentVolumeLbs : Math.round(m.shipmentVolumeLbs * LBS_TO_KG)) / 1_000_000).toFixed(2))),
        borderColor: C.blue,
        backgroundColor: C.blueAlpha,
        pointBackgroundColor: months.map((_, i) => s === -1 || i === s ? C.blue : C.muted),
        pointRadius: months.map((_, i) => s !== -1 && i === s ? 7 : 4),
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
        pointBackgroundColor: months.map((_, i) => s === -1 || i === s ? C.cyan : C.mutedCyan),
        pointRadius: months.map((_, i) => s !== -1 && i === s ? 7 : 4),
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
const barMonthData = ref<ChartData<'bar'>>({
  labels: monthNames,
  datasets: [{
    label: 'Open Exceptions',
    data: months.map(m => m.openExceptions),
    backgroundColor: months.map(() => C.blue),
    borderRadius: 4,
    borderSkipped: false,
  }],
})

watch(currentMonthIndex, (si) => {
  barMonthData.value = {
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

          <!-- Notifications bell -->
          <v-menu
            v-model="notificationsMenu"
            :close-on-content-click="false"
            location="bottom end"
            offset="8"
            transition="slide-y-transition"
          >
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                icon
                variant="text"
                size="small"
                class="notif-btn"
              >
                <v-badge
                  :content="unreadCount"
                  :model-value="unreadCount > 0"
                  color="error"
                  floating
                >
                  <v-icon icon="mdi-bell-outline" size="22" />
                </v-badge>
              </v-btn>
            </template>

            <v-card class="notif-panel" rounded="lg" elevation="4" width="360">
              <div class="d-flex align-center justify-space-between px-4 pt-4 pb-2">
                <span class="notif-panel-title">Notifications</span>
                <v-btn
                  v-if="unreadCount > 0"
                  variant="text"
                  size="x-small"
                  color="primary"
                  @click="markAllRead"
                >Mark all read</v-btn>
              </div>

              <v-divider />

              <v-list lines="three" class="notif-list pa-0">
                <v-list-item
                  v-for="n in notifications"
                  :key="n.id"
                  :class="['notif-item', { 'notif-unread': !n.read }]"
                  @click="n.read = true"
                >
                  <template #prepend>
                    <v-icon
                      :icon="n.icon"
                      :color="notificationTypeColor[n.type]"
                      size="22"
                      class="mt-1 mr-1"
                    />
                  </template>
                  <v-list-item-title class="notif-item-title mb-1">{{ n.title }}</v-list-item-title>
                  <v-list-item-subtitle class="notif-item-body">{{ n.message }}</v-list-item-subtitle>
                  <template #append>
                    <span class="notif-time">{{ n.time }}</span>
                  </template>
                </v-list-item>
              </v-list>
            </v-card>
          </v-menu>

        </div>
      </template>
    </v-app-bar>

    <!-- ── Main ──────────────────────────────────────────────────────────── -->
    <v-main>
      <v-container fluid class="px-6 py-6">

        <!-- ── KPI Cards ──────────────────────────────────────────────────── -->
        <v-row>

          <!-- On-Time Deliveries -->
          <v-col cols="12" sm="6" md="3" class="d-flex flex-column">
            <MetricCard
              title="On-Time Deliveries"
              icon="mdi-check-decagram-outline"
              icon-color="primary"
              :value="fmt(onTimeDeliveries)"
              :trend="onTimeTrend"
              :trend-context="previousData ? 'vs ' + previousData.month : undefined"
              :trend-positive-up="true"
              :filter-label="selectedMonth === 'All' ? 'Full year total' : 'No prior month data'"
            />
          </v-col>

          <!-- Shipment Volume -->
          <v-col cols="12" sm="6" md="3" class="d-flex flex-column">
            <MetricCard
              title="Shipment Volume"
              :value="fmtVolume(shipmentVolume)"
              :trend="volumeTrend"
              :trend-context="previousData ? 'vs ' + previousData.month : undefined"
              :trend-positive-up="true"
              :filter-label="selectedMonth === 'All' ? 'Full year total' : 'No prior month data'"
            >
              <template #action>
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
              </template>
            </MetricCard>
          </v-col>

          <!-- Top Region -->
          <v-col cols="12" sm="6" md="3" class="d-flex flex-column">
            <MetricCard
              title="Top Region"
              icon="mdi-map-marker-radius-outline"
              icon-color="secondary"
              :value="topRegion?.name ?? '—'"
              :subhead="topRegion ? 'OTD ratio: ' + topRegion.ratio.toFixed(1) : undefined"
              :trend="regionTrend"
              :trend-context="previousData ? 'ratio vs ' + previousData.month : undefined"
              :trend-positive-up="true"
              :filter-label="currentData ? 'No prior month data' : undefined"
            />
          </v-col>

          <!-- Open Exceptions -->
          <v-col cols="12" sm="6" md="3" class="d-flex flex-column">
            <MetricCard
              title="Open Exceptions"
              icon="mdi-alert-circle-outline"
              icon-color="warning"
              :value="fmt(openExceptions)"
              :trend="exceptionTrend"
              :trend-context="previousData ? 'vs ' + previousData.month : undefined"
              :trend-positive-up="false"
              :filter-label="selectedMonth === 'All' ? 'Full year total' : 'No prior month data'"
            />
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

.notif-btn {
  color: rgba(255, 255, 255, 0.7) !important;
  transition: color 0.18s ease;
}

.notif-btn:hover {
  color: #fff !important;
}

.notif-panel {
  background-color: rgb(var(--v-theme-surface)) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.notif-panel-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1rem;
  letter-spacing: 0.08em;
  color: #fff;
}

.notif-list {
  background: transparent !important;
  max-height: 360px;
  overflow-y: auto;
}

.notif-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: background 0.15s ease;
  padding-top: 12px !important;
  padding-bottom: 12px !important;
}

.notif-item:last-child {
  border-bottom: none;
}

.notif-item:hover {
  background: rgba(255, 255, 255, 0.04) !important;
}

.notif-unread {
  background: rgba(66, 165, 245, 0.05) !important;
}

.notif-item-title {
  font-size: 0.8rem !important;
  font-weight: 500 !important;
  color: rgba(255, 255, 255, 0.9) !important;
  white-space: normal !important;
}

.notif-item-body {
  font-size: 0.75rem !important;
  color: rgba(255, 255, 255, 0.5) !important;
  white-space: normal !important;
  line-height: 1.4 !important;
  -webkit-line-clamp: unset !important;
}

.notif-time {
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.35);
  white-space: nowrap;
  align-self: flex-start;
  padding-top: 2px;
  padding-left: 8px;
}

:deep(.v-toolbar-title__placeholder) {
  display: flex;
  align-items: flex-start;
  text-align: left;
}

:deep(.v-app-bar .v-select__selection-text) {
  color: rgba(255, 255, 255, 0.92) !important;
}

:deep(.v-app-bar .v-select .v-icon) {
  color: rgba(255, 255, 255, 0.7) !important;
}
</style>
