<script setup>
import { ref, computed } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import {
    stationDetail as fetchDetail,
    stationHistory as fetchHistory,
    stationAlerts as fetchAlerts,
} from '@/api/dashboard'
import {
    formatNumber,
    formatPercent,
    formatDateTime,
    formatRelativeTime,
} from '@/utils/format'

import RiskBadge from '@/components/risk-badge.vue'
import ChartLine from '@/components/chart-line.vue'

/* ========== 路由参数 ========== */
const code = ref('')

/* ========== 数据状态：idle | loading | success | error ========== */
const status = ref('idle')
const errorMsg = ref('')

const detail = ref(null)
const history = ref(null)  // { station_code, range, interval, points: [] }
const alerts = ref([])

/* ========== 字段适配（兼容旧字段名 / null） ========== */
const stationCode = computed(() => {
    const d = detail.value
    return String(d?.station_code || d?.code || code.value || '').trim()
})

const stationName = computed(() => {
    const d = detail.value
    return d?.name || d?.station_name || '--'
})

const stationRegion = computed(() => {
    const d = detail.value
    return d?.region_name || d?.region_code || '--'
})

const stationLat = computed(() => {
    const d = detail.value
    return d?.lat ?? d?.latitude ?? null
})

const stationLng = computed(() => {
    const d = detail.value
    return d?.lng ?? d?.longitude ?? d?.lon ?? null
})

const stationLatLngText = computed(() => {
    const lat = stationLat.value
    const lng = stationLng.value
    if (lat === null || lng === null) return '--'
    return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`
})

const stationStatus = computed(() => detail.value?.status || '--')
const riskType = computed(() => detail.value?.risk_type || 'unknown')

const bikes = computed(() => formatNumber(detail.value?.bikes_available))
const docks = computed(() => formatNumber(detail.value?.docks_available))
const capacity = computed(() => formatNumber(detail.value?.capacity))
const occupancy = computed(() => formatPercent(detail.value?.occupancy_rate, 1))

const updatedAt = computed(() => detail.value?.updated_at || null)
const updatedFull = computed(() => formatDateTime(updatedAt.value))
const updatedRel = computed(() => formatRelativeTime(updatedAt.value))

/* ========== 历史趋势：转换为 chart-line 输入 ========== */
function pointTs(p) {
    return p?.ts || p?.timestamp || p?.time || null
}

function tsLabel(ts) {
    if (!ts) return ''
    const d = ts instanceof Date ? ts : new Date(ts)
    if (!Number.isFinite(d.getTime())) return ''
    const hh = String(d.getHours()).padStart(2, '0')
    return `${hh}:00`
}

const historyPoints = computed(() => {
    const arr = Array.isArray(history.value?.points) ? history.value.points : []
    return arr
})

const historyCategories = computed(() =>
    historyPoints.value.map((p) => tsLabel(pointTs(p))),
)

const bikesSeries = computed(() => [
    {
        name: '可用车',
        data: historyPoints.value.map((p) => Number(p?.bikes_available)),
        color: '#00d4ff',
    },
])

const occupancySeries = computed(() => [
    {
        name: '占用率',
        data: historyPoints.value.map((p) => {
            const v = Number(p?.occupancy_rate)
            return Number.isFinite(v) ? v * 100 : null
        }),
        color: '#fbbf24',
    },
])

const isHistoryEmpty = computed(() => historyPoints.value.length === 0)

const occupancyYFormatter = (v) => `${v.toFixed(0)}%`
const bikesYFormatter = (v) => formatNumber(Math.round(v))

/* ========== 告警 ========== */
const alertsList = computed(() => Array.isArray(alerts.value) ? alerts.value : [])

function levelTone(level) {
    const v = String(level || '').toLowerCase()
    if (v === 'critical' || v === 'high') return 'rose'
    if (v === 'warning' || v === 'medium' || v === 'warn') return 'amber'
    if (v === 'info' || v === 'low' || v === 'notice') return 'cyan'
    return 'slate'
}

function levelLabel(level) {
    const v = String(level || '').toLowerCase()
    if (v === 'critical') return '紧急'
    if (v === 'warning' || v === 'warn') return '警告'
    if (v === 'info') return '提示'
    return level || '未知'
}

function statusLabel(s) {
    const v = String(s || '').toLowerCase()
    if (v === 'open' || v === 'active') return '未处理'
    if (v === 'resolved' || v === 'closed') return '已处理'
    if (v === 'acknowledged' || v === 'ack') return '已确认'
    return s || '--'
}

/* ========== 加载 ========== */

const isLoading = computed(() => status.value === 'loading')
const isError = computed(() => status.value === 'error')
const hasDetail = computed(() => detail.value !== null)

async function load(opts = {}) {
    if (!code.value) {
        status.value = 'error'
        errorMsg.value = '缺少站点编码（code）参数'
        return
    }
    if (status.value === 'loading' && !opts.force) return

    status.value = 'loading'
    if (!opts.silent) errorMsg.value = ''

    try {
        const [d, h, aRes] = await Promise.all([
            fetchDetail(code.value),
            fetchHistory(code.value, 24).catch((e) => {
                // 历史失败不应阻断详情显示
                console.warn('[detail] history failed:', e)
                return { points: [] }
            }),
            fetchAlerts(code.value, 20).catch((e) => {
                console.warn('[detail] alerts failed:', e)
                return { items: [] }
            }),
        ])
        detail.value = d
        history.value = h
        alerts.value = Array.isArray(aRes?.items) ? aRes.items : Array.isArray(aRes) ? aRes : []
        status.value = 'success'

        // 把 navbar 标题设置为站点名
        try {
            uni.setNavigationBarTitle({ title: stationName.value || '站点详情' })
        } catch (_) { /* noop */ }
    } catch (err) {
        status.value = 'error'
        const code404 = (err && err.statusCode) === 404
        errorMsg.value = code404
            ? `站点不存在：${code.value}`
            : ((err && err.message) || '加载失败，请检查网络与后端服务')
    }
}

function goBack() {
    uni.navigateBack({ delta: 1, fail: () => {
        uni.switchTab({ url: '/pages/stations/index' })
    }})
}

/* ========== 生命周期 ========== */
onLoad((query) => {
    const raw = (query && query.code) || ''
    try {
        code.value = decodeURIComponent(String(raw))
    } catch (_) {
        code.value = String(raw)
    }
    load()
})

onPullDownRefresh(async () => {
    await load({ force: true })
    uni.stopPullDownRefresh()
})
</script>

<template>
    <view class="page">
        <!-- 错误：缺 code 或 404 -->
        <view v-if="isError && !hasDetail" class="main">
            <view class="card error-card">
                <text class="error-emoji">⚠️</text>
                <text class="error-title">加载失败</text>
                <text class="error-text" selectable>{{ errorMsg }}</text>
                <view class="error-actions">
                    <button class="btn btn-secondary" @click="goBack">返回</button>
                    <button v-if="code" class="btn btn-primary" @click="load({ force: true })">重试</button>
                </view>
            </view>
        </view>

        <!-- Loading 占位 -->
        <view v-else-if="isLoading && !hasDetail" class="main">
            <view class="card center-card">
                <text class="loading-emoji">⏳</text>
                <text class="loading-text">加载中…</text>
                <text class="loading-sub">站点 {{ code }}</text>
            </view>
        </view>

        <!-- 数据正常区 -->
        <view v-else class="main">
            <!-- 顶部信息卡 -->
            <view class="card head-card">
                <view class="head-row">
                    <view class="head-text">
                        <text class="name">{{ stationName }}</text>
                        <view class="meta">
                            <text v-if="stationCode" class="code">#{{ stationCode }}</text>
                            <text v-if="stationRegion && stationRegion !== '--'" class="region">· {{ stationRegion }}</text>
                        </view>
                    </view>
                    <risk-badge :risk-type="riskType" size="normal" />
                </view>

                <!-- 状态 4 格 -->
                <view class="stat-grid">
                    <view class="stat-cell">
                        <text class="stat-label">可用车</text>
                        <text class="stat-value">{{ bikes }}</text>
                    </view>
                    <view class="stat-cell">
                        <text class="stat-label">可用桩</text>
                        <text class="stat-value">{{ docks }}</text>
                    </view>
                    <view class="stat-cell">
                        <text class="stat-label">容量</text>
                        <text class="stat-value">{{ capacity }}</text>
                    </view>
                    <view class="stat-cell">
                        <text class="stat-label">占用率</text>
                        <text class="stat-value">{{ occupancy }}</text>
                    </view>
                </view>

                <!-- 元信息行 -->
                <view class="meta-grid">
                    <view class="meta-cell">
                        <text class="meta-label">运行状态</text>
                        <text class="meta-value">{{ stationStatus }}</text>
                    </view>
                    <view class="meta-cell">
                        <text class="meta-label">经纬度</text>
                        <text class="meta-value mono" selectable>{{ stationLatLngText }}</text>
                    </view>
                    <view class="meta-cell wide">
                        <text class="meta-label">最近上报</text>
                        <text class="meta-value">{{ updatedRel }}</text>
                        <text v-if="updatedAt" class="meta-sub">{{ updatedFull }}</text>
                    </view>
                </view>

                <!-- 地图占位 -->
                <view class="map-placeholder">
                    <text class="map-emoji">🗺</text>
                    <text class="map-text">地图视图将在后续版本提供</text>
                </view>
            </view>

            <!-- 24h 趋势：可用车 -->
            <view class="card chart-card">
                <view class="chart-header">
                    <text class="chart-title">24h 可用车趋势</text>
                    <text class="chart-sub">每小时一个采样点</text>
                </view>
                <chart-line
                    canvas-id="detail-chart-bikes"
                    :categories="historyCategories"
                    :series="bikesSeries"
                    :loading="isLoading && historyPoints.length === 0"
                    :empty="isHistoryEmpty"
                    :height="320"
                    :y-formatter="bikesYFormatter"
                />
            </view>

            <!-- 24h 趋势：占用率 -->
            <view class="card chart-card">
                <view class="chart-header">
                    <text class="chart-title">24h 占用率趋势</text>
                    <text class="chart-sub">百分比 (%)</text>
                </view>
                <chart-line
                    canvas-id="detail-chart-occupancy"
                    :categories="historyCategories"
                    :series="occupancySeries"
                    :loading="isLoading && historyPoints.length === 0"
                    :empty="isHistoryEmpty"
                    :height="320"
                    :y-formatter="occupancyYFormatter"
                />
            </view>

            <!-- 站点告警 -->
            <view class="card alerts-card">
                <view class="chart-header">
                    <text class="chart-title">站点告警</text>
                    <text class="chart-sub">{{ alertsList.length }} 条</text>
                </view>

                <view v-if="alertsList.length === 0" class="alerts-empty">
                    <text class="alerts-empty-emoji">✅</text>
                    <text class="alerts-empty-text">该站点暂无告警</text>
                </view>

                <view v-else class="alerts-list">
                    <view v-for="a in alertsList" :key="a.id" class="alert-item" :class="`tone-${levelTone(a.level)}`">
                        <view class="alert-head">
                            <text class="alert-level">{{ levelLabel(a.level) }}</text>
                            <text class="alert-status">{{ statusLabel(a.status) }}</text>
                            <text class="alert-time">{{ formatRelativeTime(a.created_at) }}</text>
                        </view>
                        <text class="alert-title">{{ a.title || a.type || '告警' }}</text>
                        <text v-if="a.message" class="alert-msg">{{ a.message }}</text>
                    </view>
                </view>
            </view>

            <!-- 静默错误条 -->
            <view v-if="isError && hasDetail" class="silent-error" @click="load({ force: true })">
                <text class="silent-error-text">⚠️ 刷新失败，点击重试</text>
            </view>

            <view class="footer">
                <text class="footer-text">下拉可刷新数据</text>
            </view>
        </view>
    </view>
</template>

<style lang="scss">
.page {
    min-height: 100vh;
    background: #0a0a0f;
    padding-bottom: 60rpx;
}

.main {
    padding: 24rpx 32rpx;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

/* ========== 通用卡片 ========== */
.card {
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-radius: 24rpx;
    padding: 24rpx;
}

/* ========== 顶部信息 ========== */
.head-card {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.head-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16rpx;
}

.head-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.name {
    font-size: 36rpx;
    color: #f3f4f6;
    font-weight: 600;
    line-height: 1.3;
    word-break: break-word;
}

.meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8rpx;
}

.code {
    font-size: 22rpx;
    color: #6b7280;
    font-family: 'SF Mono', 'Menlo', monospace;
}

.region {
    font-size: 22rpx;
    color: #9ca3af;
}

.stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 12rpx;
}

.stat-cell {
    background: rgba(255, 255, 255, 0.02);
    border: 1rpx solid rgba(255, 255, 255, 0.04);
    border-radius: 14rpx;
    padding: 16rpx 12rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6rpx;
}

.stat-label {
    font-size: 20rpx;
    color: #6b7280;
    letter-spacing: 1rpx;
}

.stat-value {
    font-size: 32rpx;
    color: #e5e7eb;
    font-weight: 500;
    font-family: 'SF Pro Display', 'PingFang SC', sans-serif;
}

.meta-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
}

.meta-cell {
    flex: 1 1 calc(50% - 12rpx);
    background: rgba(255, 255, 255, 0.02);
    border: 1rpx solid rgba(255, 255, 255, 0.04);
    border-radius: 14rpx;
    padding: 14rpx 18rpx;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    min-width: 0;
}

.meta-cell.wide {
    flex: 1 1 100%;
}

.meta-label {
    font-size: 20rpx;
    color: #6b7280;
    letter-spacing: 1rpx;
}

.meta-value {
    font-size: 26rpx;
    color: #e5e7eb;
    word-break: break-all;
}

.meta-value.mono {
    font-family: 'SF Mono', 'Menlo', monospace;
    font-size: 24rpx;
}

.meta-sub {
    font-size: 20rpx;
    color: #6b7280;
}

.map-placeholder {
    margin-top: 4rpx;
    padding: 24rpx;
    background: rgba(255, 255, 255, 0.02);
    border: 1rpx dashed rgba(255, 255, 255, 0.08);
    border-radius: 14rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
}

.map-emoji {
    font-size: 40rpx;
}

.map-text {
    font-size: 22rpx;
    color: #6b7280;
    letter-spacing: 1rpx;
}

/* ========== 图表卡片 ========== */
.chart-card {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.chart-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
}

.chart-title {
    font-size: 28rpx;
    color: #e5e7eb;
    font-weight: 500;
}

.chart-sub {
    font-size: 22rpx;
    color: #6b7280;
    letter-spacing: 1rpx;
}

/* ========== 告警 ========== */
.alerts-card {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.alerts-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
    padding: 40rpx 0;
}

.alerts-empty-emoji {
    font-size: 44rpx;
}

.alerts-empty-text {
    font-size: 24rpx;
    color: #6b7280;
}

.alerts-list {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
}

.alert-item {
    background: rgba(255, 255, 255, 0.02);
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-left: 4rpx solid rgba(255, 255, 255, 0.1);
    border-radius: 12rpx;
    padding: 16rpx 18rpx;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.alert-head {
    display: flex;
    align-items: center;
    gap: 12rpx;
    flex-wrap: wrap;
}

.alert-level {
    font-size: 22rpx;
    padding: 2rpx 10rpx;
    border-radius: 6rpx;
    color: #e5e7eb;
    background: rgba(255, 255, 255, 0.05);
}

.alert-status {
    font-size: 20rpx;
    color: #9ca3af;
}

.alert-time {
    font-size: 20rpx;
    color: #6b7280;
    margin-left: auto;
}

.alert-title {
    font-size: 26rpx;
    color: #e5e7eb;
    font-weight: 500;
    line-height: 1.4;
}

.alert-msg {
    font-size: 22rpx;
    color: #9ca3af;
    line-height: 1.5;
    word-break: break-word;
}

/* alert tones */
.tone-rose {
    border-left-color: #fb7185;
    background: rgba(244, 63, 94, 0.05);
}
.tone-rose .alert-level {
    background: rgba(244, 63, 94, 0.15);
    color: #fb7185;
}
.tone-amber {
    border-left-color: #fbbf24;
    background: rgba(245, 158, 11, 0.05);
}
.tone-amber .alert-level {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
}
.tone-cyan {
    border-left-color: #00d4ff;
    background: rgba(0, 212, 255, 0.05);
}
.tone-cyan .alert-level {
    background: rgba(0, 212, 255, 0.15);
    color: #00d4ff;
}
.tone-slate {
    border-left-color: #64748b;
}
.tone-slate .alert-level {
    background: rgba(100, 116, 139, 0.15);
    color: #cbd5e1;
}

/* ========== Loading / Error ========== */
.center-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12rpx;
    padding: 60rpx 32rpx;
}

.loading-emoji { font-size: 56rpx; }
.loading-text { font-size: 28rpx; color: #e5e7eb; }
.loading-sub { font-size: 22rpx; color: #6b7280; font-family: 'SF Mono', 'Menlo', monospace; }

.error-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14rpx;
    padding: 48rpx 32rpx;
    background: rgba(239, 68, 68, 0.04);
    border-color: rgba(239, 68, 68, 0.2);
}

.error-emoji { font-size: 56rpx; }
.error-title { font-size: 30rpx; color: #fca5a5; font-weight: 500; }
.error-text {
    font-size: 24rpx;
    color: #f87171;
    text-align: center;
    line-height: 1.5;
    word-break: break-all;
}

.error-actions {
    display: flex;
    gap: 16rpx;
    margin-top: 12rpx;
    align-self: stretch;
}

.error-actions .btn { flex: 1; }

.btn {
    height: 80rpx;
    line-height: 80rpx;
    border-radius: 14rpx;
    font-size: 26rpx;
    font-weight: 500;
    border: none;
    margin: 0;
    padding: 0 24rpx;
    width: 100%;
}

.btn::after { border: none; }

.btn-primary {
    background: linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%);
    color: #0a0a0f;
    box-shadow: 0 8rpx 24rpx rgba(0, 212, 255, 0.2);
}

.btn-secondary {
    background: rgba(255, 255, 255, 0.06);
    color: #e5e7eb;
    border: 1rpx solid rgba(255, 255, 255, 0.12);
}

.silent-error {
    margin: 0 auto;
    padding: 12rpx 24rpx;
    background: rgba(239, 68, 68, 0.08);
    border: 1rpx solid rgba(239, 68, 68, 0.25);
    border-radius: 12rpx;
    text-align: center;
}

.silent-error-text {
    font-size: 22rpx;
    color: #fca5a5;
}

/* ========== 底部 ========== */
.footer {
    display: flex;
    justify-content: center;
    margin-top: 8rpx;
}

.footer-text {
    font-size: 22rpx;
    color: #4b5563;
    letter-spacing: 2rpx;
}
</style>
