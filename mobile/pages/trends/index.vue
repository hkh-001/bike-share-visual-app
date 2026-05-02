<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { trends24h as fetchTrends24h } from '@/api/dashboard'
import { formatNumber, formatRelativeTime, formatDateTime } from '@/utils/format'
import ChartLine from '@/components/chart-line.vue'

/* ========== 状态：idle | loading | success | error ========== */
const status = ref('idle')
const errorMsg = ref('')

/* ========== 数据 ========== */
const buckets = ref([])
const lastFetchAt = ref(0)

/* ========== 缓存策略 ==========
 * onShow 进入页面时：距离上次成功获取 < 60s 则跳过请求，复用现有数据；
 * 下拉刷新 / 点击刷新按钮：必定 force，绕过缓存。
 */
const CACHE_TTL_MS = 60_000

/* ========== 字段兼容工具 ========== */
function pickField(obj, keys) {
    if (!obj) return null
    for (const k of keys) {
        const v = obj[k]
        if (v !== undefined && v !== null) return v
    }
    return null
}

const TS_KEYS = ['ts', 'timestamp', 'time']
const BIKES_KEYS = ['city_total_bikes', 'total_bikes', 'bikes_available', 'total_bikes_available']
const OCCUPANCY_KEYS = ['city_avg_occupancy', 'avg_occupancy_rate', 'occupancy_rate']
const ALERTS_KEYS = ['alerts_count', 'alert_count', 'alerts']

/* 把 ISO/timestamp 转为 'HH:00' 标签 */
function tsToHourLabel(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    if (!Number.isFinite(d.getTime())) return ''
    return `${String(d.getHours()).padStart(2, '0')}:00`
}

function tsToHourMinute(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    if (!Number.isFinite(d.getTime())) return ''
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/* ========== 派生序列 ========== */

/* X 轴：HH:00 */
const categories = computed(() =>
    buckets.value.map((b) => tsToHourLabel(pickField(b, TS_KEYS))),
)

const bikesData = computed(() =>
    buckets.value.map((b) => {
        const v = pickField(b, BIKES_KEYS)
        const n = Number(v)
        return Number.isFinite(n) ? n : 0
    }),
)

const occupancyData = computed(() =>
    buckets.value.map((b) => {
        const v = pickField(b, OCCUPANCY_KEYS)
        const n = Number(v)
        return Number.isFinite(n) ? n : 0
    }),
)

const alertsData = computed(() =>
    buckets.value.map((b) => {
        const v = pickField(b, ALERTS_KEYS)
        const n = Number(v)
        return Number.isFinite(n) ? n : 0
    }),
)

/* y 轴格式化 */
function yFormatBikes(v) {
    return formatNumber(Math.round(Number(v)))
}
function yFormatPercent(v) {
    const n = Number(v)
    if (!Number.isFinite(n)) return '--'
    return `${(n * 100).toFixed(0)}%`
}
function yFormatInt(v) {
    const n = Number(v)
    if (!Number.isFinite(n)) return '--'
    return String(Math.round(n))
}

/* ========== 数据状态卡 ========== */
const pointCount = computed(() => buckets.value.length)

const timeRangeText = computed(() => {
    if (buckets.value.length === 0) return '--'
    const first = pickField(buckets.value[0], TS_KEYS)
    const last = pickField(buckets.value[buckets.value.length - 1], TS_KEYS)
    const a = tsToHourMinute(first)
    const b = tsToHourMinute(last)
    if (!a || !b) return '--'
    return `${a} – ${b}`
})

const lastUpdatedRel = computed(() =>
    lastFetchAt.value ? formatRelativeTime(lastFetchAt.value) : '--',
)

const lastUpdatedFull = computed(() =>
    lastFetchAt.value ? formatDateTime(lastFetchAt.value) : '--',
)

/* ========== 计算字段 ========== */
const isLoading = computed(() => status.value === 'loading')
const isError = computed(() => status.value === 'error')
const hasData = computed(() => buckets.value.length > 0)

const isEmptyAfterSuccess = computed(
    () => status.value === 'success' && buckets.value.length === 0,
)

/* ========== 加载 ========== */
async function load(opts = {}) {
    const force = !!opts.force
    if (status.value === 'loading' && !force) return

    /* 60s 缓存：仅在非强制 + 已有成功数据时生效 */
    if (
        !force &&
        status.value === 'success' &&
        lastFetchAt.value > 0 &&
        Date.now() - lastFetchAt.value < CACHE_TTL_MS
    ) {
        return
    }

    status.value = 'loading'
    if (!opts.silent) errorMsg.value = ''

    try {
        const res = await fetchTrends24h()
        const list = Array.isArray(res?.buckets)
            ? res.buckets
            : Array.isArray(res)
                ? res
                : []
        buckets.value = list
        lastFetchAt.value = Date.now()
        status.value = 'success'
    } catch (err) {
        status.value = 'error'
        errorMsg.value = (err && err.message) || '加载失败，请检查网络与后端服务'
    }
}

/* ========== 生命周期 ========== */
onShow(() => {
    load()
})

onPullDownRefresh(async () => {
    await load({ force: true })
    uni.stopPullDownRefresh()
})

function onRefreshTap() {
    load({ force: true })
}
</script>

<template>
    <view class="page">
        <!-- 顶部：标题 + 刷新按钮 -->
        <view class="header">
            <view class="header-text">
                <text class="title">趋势分析</text>
                <text class="subtitle">过去 24 小时城市级运营趋势</text>
            </view>
            <view
                class="refresh-btn"
                :class="{ 'refresh-loading': isLoading }"
                hover-class="refresh-hover"
                @click="onRefreshTap"
            >
                <text class="refresh-icon">{{ isLoading ? '⏳' : '↻' }}</text>
                <text class="refresh-label">刷新趋势</text>
            </view>
        </view>

        <!-- 数据状态卡 -->
        <view class="card status-card">
            <view class="status-row">
                <view class="status-item">
                    <text class="status-label">数据点</text>
                    <text class="status-value">{{ pointCount }} 个</text>
                </view>
                <view class="status-divider" />
                <view class="status-item">
                    <text class="status-label">时间范围</text>
                    <text class="status-value">{{ timeRangeText }}</text>
                </view>
                <view class="status-divider" />
                <view class="status-item">
                    <text class="status-label">最近更新</text>
                    <text class="status-value" :title="lastUpdatedFull">{{ lastUpdatedRel }}</text>
                </view>
            </view>
        </view>

        <!-- 主体：错误优先 → 空状态 → 三张图 -->

        <!-- 错误（无数据时):全屏卡片 -->
        <view v-if="isError && !hasData" class="card error-card">
            <text class="error-emoji">⚠️</text>
            <text class="error-title">加载失败</text>
            <text class="error-text" selectable>{{ errorMsg }}</text>
            <view class="error-actions">
                <button class="btn btn-primary" @click="load({ force: true })">重试</button>
            </view>
        </view>

        <!-- 空数据（成功但 0 桶） -->
        <view v-else-if="isEmptyAfterSuccess" class="card center-card">
            <text class="loading-emoji">📈</text>
            <text class="loading-text">暂无趋势数据</text>
            <text class="loading-sub">后端尚未生成 24h 趋势桶，请稍后再试</text>
        </view>

        <!-- 三张图（含 loading 占位） -->
        <view v-else class="charts">
            <!-- 可用车辆趋势 -->
            <view class="chart-card">
                <view class="chart-head">
                    <view class="chart-title-wrap">
                        <text class="chart-title">可用车辆趋势</text>
                        <text class="chart-desc">全城可借车辆数量变化</text>
                    </view>
                </view>
                <chart-line
                    canvas-id="trend-bikes"
                    :categories="categories"
                    :series="[{ name: '可用车辆', data: bikesData, color: '#00d4ff' }]"
                    :loading="isLoading && !hasData"
                    :empty="!isLoading && bikesData.length === 0"
                    :height="340"
                    :y-formatter="yFormatBikes"
                />
            </view>

            <!-- 平均占用率趋势 -->
            <view class="chart-card">
                <view class="chart-head">
                    <view class="chart-title-wrap">
                        <text class="chart-title">平均占用率趋势</text>
                        <text class="chart-desc">全城站点平均占用率变化</text>
                    </view>
                </view>
                <chart-line
                    canvas-id="trend-occupancy"
                    :categories="categories"
                    :series="[{ name: '平均占用率', data: occupancyData, color: '#fbbf24' }]"
                    :loading="isLoading && !hasData"
                    :empty="!isLoading && occupancyData.length === 0"
                    :height="340"
                    :y-formatter="yFormatPercent"
                />
            </view>

            <!-- 告警数量趋势 -->
            <view class="chart-card">
                <view class="chart-head">
                    <view class="chart-title-wrap">
                        <text class="chart-title">告警数量趋势</text>
                        <text class="chart-desc">每小时告警数量变化</text>
                    </view>
                </view>
                <chart-line
                    canvas-id="trend-alerts"
                    :categories="categories"
                    :series="[{ name: '告警数', data: alertsData, color: '#fb7185' }]"
                    :loading="isLoading && !hasData"
                    :empty="!isLoading && alertsData.length === 0"
                    :height="340"
                    :y-formatter="yFormatInt"
                />
            </view>
        </view>

        <!-- 静默错误条（已有旧数据时） -->
        <view v-if="isError && hasData" class="silent-error" @click="load({ force: true })">
            <text class="silent-error-text">⚠️ 刷新失败，点击重试</text>
        </view>
    </view>
</template>

<style lang="scss">
.page {
    min-height: 100vh;
    background: #0a0a0f;
    padding: 24rpx 32rpx 60rpx;
    display: flex;
    flex-direction: column;
    gap: 18rpx;
}

/* ===== Header ===== */
.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
    padding: 8rpx 0 4rpx;
}

.header-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
}

.title {
    font-size: 36rpx;
    color: #f3f4f6;
    font-weight: 600;
    letter-spacing: 1rpx;
}

.subtitle {
    font-size: 22rpx;
    color: #6b7280;
    letter-spacing: 1rpx;
}

.refresh-btn {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 12rpx 22rpx;
    background: rgba(0, 212, 255, 0.08);
    border: 1rpx solid rgba(0, 212, 255, 0.3);
    border-radius: 999rpx;
    transition: all 0.2s;
}

.refresh-hover {
    background: rgba(0, 212, 255, 0.15);
}

.refresh-loading {
    opacity: 0.6;
}

.refresh-icon {
    font-size: 26rpx;
    color: #00d4ff;
    line-height: 1;
}

.refresh-label {
    font-size: 22rpx;
    color: #00d4ff;
    letter-spacing: 1rpx;
}

/* ===== 通用卡片 ===== */
.card {
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-radius: 18rpx;
    padding: 22rpx 22rpx;
}

/* ===== 状态卡 ===== */
.status-card {
    padding: 18rpx 22rpx;
}

.status-row {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    gap: 14rpx;
}

.status-item {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
}

.status-label {
    font-size: 20rpx;
    color: #6b7280;
    letter-spacing: 1rpx;
}

.status-value {
    font-size: 26rpx;
    color: #e5e7eb;
    font-weight: 500;
    word-break: break-all;
}

.status-divider {
    flex: 0 0 1rpx;
    background: rgba(255, 255, 255, 0.06);
}

/* ===== 三张图区 ===== */
.charts {
    display: flex;
    flex-direction: column;
    gap: 18rpx;
}

.chart-card {
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-radius: 18rpx;
    padding: 20rpx 18rpx 16rpx;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
}

.chart-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12rpx;
    padding: 0 4rpx;
}

.chart-title-wrap {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
}

.chart-title {
    font-size: 28rpx;
    color: #f3f4f6;
    font-weight: 500;
    letter-spacing: 1rpx;
}

.chart-desc {
    font-size: 22rpx;
    color: #9ca3af;
    line-height: 1.4;
}

/* ===== 错误 / 空 / Loading ===== */
.center-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12rpx;
    padding: 60rpx 32rpx;
}

.loading-emoji {
    font-size: 56rpx;
}

.loading-text {
    font-size: 28rpx;
    color: #e5e7eb;
}

.loading-sub {
    font-size: 22rpx;
    color: #6b7280;
    text-align: center;
    line-height: 1.5;
}

.error-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14rpx;
    padding: 48rpx 32rpx;
    background: rgba(239, 68, 68, 0.04);
    border-color: rgba(239, 68, 68, 0.2);
}

.error-emoji {
    font-size: 56rpx;
}

.error-title {
    font-size: 30rpx;
    color: #fca5a5;
    font-weight: 500;
}

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

.error-actions .btn {
    flex: 1;
}

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

.btn::after {
    border: none;
}

.btn-primary {
    background: linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%);
    color: #0a0a0f;
    box-shadow: 0 8rpx 24rpx rgba(0, 212, 255, 0.2);
}

.silent-error {
    margin: 8rpx auto 0;
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
</style>
