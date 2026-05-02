<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useSettingsStore } from '@/store/settings'
import { health, summary, etlStatus } from '@/api/dashboard'
import {
    formatNumber,
    formatPercent,
    formatRelativeTime,
    formatDateTime,
    formatTime,
} from '@/utils/format'

import KpiCard from '@/components/kpi-card.vue'
import FreshnessBadge from '@/components/freshness-badge.vue'
import RiskSummary from '@/components/risk-summary.vue'

const settings = useSettingsStore()

/* ========== 数据状态 ========== */

// idle | loading | success | error
const dataStatus = ref('idle')
const errorMsg = ref('')

const summaryData = ref(null)
const etlData = ref(null)
const lastRefreshedAt = ref('')

const isLoading = computed(() => dataStatus.value === 'loading')
const isError = computed(() => dataStatus.value === 'error')
const hasData = computed(() => summaryData.value !== null)

/* ========== 顶部栏 / 状态栏高度 ========== */

const statusBarHeight = ref(20)
onMounted(() => {
    try {
        const sys = uni.getSystemInfoSync()
        statusBarHeight.value = sys.statusBarHeight || 20
    } catch (e) {
        statusBarHeight.value = 20
    }
})

/* ========== 计算字段 ========== */

const displayBaseUrl = computed(() => settings.apiBaseUrl || '未配置')

const kpi = computed(() => summaryData.value?.kpi || null)

const totalStations = computed(() => formatNumber(kpi.value?.total_stations))
const activeStations = computed(() => formatNumber(kpi.value?.active_stations))
const availableBikes = computed(() => formatNumber(kpi.value?.total_bikes_available))
const availableDocks = computed(() => formatNumber(kpi.value?.total_docks_available))
const occupancyRate = computed(() => formatPercent(kpi.value?.avg_occupancy_rate, 1))

// 告警总数：兼容 { info, warning, critical } 对象 / 数组 / 数字 / null
const alertsTotal = computed(() => {
    const a = kpi.value?.alerts
    if (a === null || a === undefined) return '--'
    if (typeof a === 'number') return formatNumber(a)
    if (Array.isArray(a)) return formatNumber(a.length)
    if (typeof a === 'object') {
        const sum =
            (Number(a.info) || 0) +
            (Number(a.warning) || 0) +
            (Number(a.critical) || 0)
        return formatNumber(sum)
    }
    return '--'
})

// 风险概览：从 summary.risk_stations 中按 risk_type 计数
const riskCounts = computed(() => {
    const placeholder = { empty: '--', full: '--', offline: '--', abnormal: '--' }
    if (!summaryData.value) return placeholder
    const list = Array.isArray(summaryData.value.risk_stations)
        ? summaryData.value.risk_stations
        : []
    const count = (t) => list.filter((s) => s && s.risk_type === t).length
    return {
        empty: count('empty'),
        full: count('full'),
        offline: count('offline'),
        abnormal: count('abnormal'),
    }
})

// 数据源 / 新鲜度
const freshness = computed(() => {
    const f = etlData.value?.data_freshness
    if (f === 'fresh' || f === 'stale' || f === 'mock') return f
    return 'unknown'
})

const activeSource = computed(() => etlData.value?.active_source || '--')

const sourceFresh = computed(() => Boolean(etlData.value?.active_source_is_fresh))

// 最近抓取时间（系统侧 / 官方上报）
const systemUpdatedAt = computed(() => kpi.value?.system_updated_at || etlData.value?.last_success_fetch_at)
const sourceReportedAt = computed(() => kpi.value?.source_reported_at)

const systemUpdatedRel = computed(() => formatRelativeTime(systemUpdatedAt.value))
const systemUpdatedFull = computed(() => formatDateTime(systemUpdatedAt.value))
const sourceReportedRel = computed(() => formatRelativeTime(sourceReportedAt.value))

/* ========== 加载逻辑 ========== */

async function loadData(opts = {}) {
    if (dataStatus.value === 'loading') return
    dataStatus.value = 'loading'
    if (!opts.silent) errorMsg.value = ''

    try {
        const [s, e] = await Promise.all([summary(), etlStatus()])
        summaryData.value = s
        etlData.value = e
        dataStatus.value = 'success'
        lastRefreshedAt.value = formatTime(new Date())
    } catch (err) {
        dataStatus.value = 'error'
        errorMsg.value = (err && err.message) || '加载失败，请检查网络与后端服务'
    }
}

// 数据获取放在 onShow，从设置页改完 baseURL 返回首页能立即生效
onShow(() => {
    loadData()
})

onPullDownRefresh(async () => {
    await loadData()
    uni.stopPullDownRefresh()
})

/* ========== 后端连通性测试（M0 保留，弱化为辅助） ========== */

// idle | testing | online | offline
const testStatus = ref('idle')
const testError = ref('')
const testTimeAt = ref('')

const testStatusLabel = computed(() => {
    switch (testStatus.value) {
        case 'testing': return '测试中...'
        case 'online': return '后端在线'
        case 'offline': return '连接失败'
        default: return '未测试'
    }
})

async function testConnection() {
    if (testStatus.value === 'testing') return
    testStatus.value = 'testing'
    testError.value = ''
    try {
        await health()
        testStatus.value = 'online'
        testTimeAt.value = formatTime(new Date())
    } catch (err) {
        testStatus.value = 'offline'
        testError.value = (err && err.message) || '未知错误'
        testTimeAt.value = formatTime(new Date())
    }
}

function gotoSettings() {
    uni.navigateTo({ url: '/pages/settings/index' })
}
</script>

<template>
    <view class="page">
        <!-- 顶部栏（自定义） -->
        <view class="topbar" :style="{ paddingTop: (statusBarHeight + 16) + 'px' }">
            <view class="topbar-title">
                <text class="title">共享单车移动监控</text>
                <text class="subtitle">BIKEGUARD MOBILE</text>
            </view>
            <view class="topbar-action" @click="gotoSettings" hover-class="topbar-action-hover">
                <text class="settings-icon">⚙</text>
            </view>
        </view>

        <!-- 主体 -->
        <view class="main">
            <!-- 数据源状态卡 -->
            <view class="card">
                <view class="card-header">
                    <view class="card-label-row">
                        <text class="card-label">数据源</text>
                    </view>
                    <freshness-badge :status="freshness" />
                </view>

                <view class="card-body">
                    <view class="row">
                        <text class="row-label">API 地址</text>
                        <text class="row-value mono" selectable>{{ displayBaseUrl }}</text>
                    </view>

                    <view class="row-grid">
                        <view class="info-cell">
                            <text class="cell-label">活跃数据源</text>
                            <text class="cell-value">{{ activeSource }}</text>
                        </view>
                        <view class="info-cell">
                            <text class="cell-label">系统抓取</text>
                            <text class="cell-value">{{ systemUpdatedRel }}</text>
                            <text v-if="systemUpdatedAt" class="cell-sub">{{ systemUpdatedFull }}</text>
                        </view>
                        <view class="info-cell">
                            <text class="cell-label">官方上报</text>
                            <text class="cell-value">{{ sourceReportedRel }}</text>
                        </view>
                        <view class="info-cell">
                            <text class="cell-label">数据状态</text>
                            <text class="cell-value" :class="sourceFresh ? 'ok' : 'warn'">
                                {{ sourceFresh ? '新鲜' : '需关注' }}
                            </text>
                        </view>
                    </view>
                </view>
            </view>

            <!-- Loading 状态 -->
            <view v-if="isLoading && !hasData" class="card center-card">
                <text class="loading-emoji">⏳</text>
                <text class="loading-text">加载中...</text>
                <text class="loading-sub">请求 dashboard 与 ETL 状态</text>
            </view>

            <!-- 错误状态 -->
            <view v-else-if="isError && !hasData" class="card error-card">
                <text class="error-emoji">⚠️</text>
                <text class="error-title">数据加载失败</text>
                <text class="error-text" selectable>{{ errorMsg }}</text>
                <view class="error-tips">
                    <text class="tip">· 检查后端是否已启动</text>
                    <text class="tip">· 确认设置页 API 地址正确</text>
                    <text class="tip">· 手机和电脑是否同一 Wi-Fi</text>
                </view>
                <view class="error-actions">
                    <button class="btn btn-secondary" @click="gotoSettings">前往设置</button>
                    <button class="btn btn-primary" @click="loadData()">重试</button>
                </view>
            </view>

            <!-- 数据正常区 -->
            <template v-if="hasData">
                <!-- 顶部标签 -->
                <view class="section-label">核心 KPI</view>

                <!-- KPI 网格 -->
                <view class="kpi-grid">
                    <kpi-card label="总站点" :value="totalStations" hint="Total stations" tone="cyan" />
                    <kpi-card label="活跃站点" :value="activeStations" hint="Active" tone="emerald" />
                    <kpi-card label="可用车辆" :value="availableBikes" hint="Bikes available" tone="cyan" />
                    <kpi-card label="可用桩位" :value="availableDocks" hint="Docks available" tone="violet" />
                    <kpi-card label="平均占用率" :value="occupancyRate" hint="Avg occupancy" tone="amber" />
                    <kpi-card label="告警数量" :value="alertsTotal" hint="Open alerts" tone="rose" />
                </view>

                <!-- 风险概览 -->
                <view class="section-label">风险概览</view>
                <view class="card">
                    <risk-summary
                        :empty="riskCounts.empty"
                        :full="riskCounts.full"
                        :offline="riskCounts.offline"
                        :abnormal="riskCounts.abnormal"
                        :alerts="alertsTotal"
                    />
                    <view class="risk-note">
                        <text class="risk-note-text">
                            空车 / 满桩来自 summary.risk_stations；
                            离线 / 异常受后端字段限制可能为 0。
                        </text>
                    </view>
                </view>
            </template>

            <!-- 操作区 -->
            <view class="card">
                <view class="card-header">
                    <view class="card-label-row">
                        <text class="card-label">操作</text>
                    </view>
                    <text v-if="lastRefreshedAt" class="card-time">{{ lastRefreshedAt }}</text>
                </view>

                <view class="action-rows">
                    <button
                        class="btn btn-primary"
                        :disabled="isLoading"
                        :loading="isLoading"
                        @click="loadData()"
                    >
                        {{ isLoading ? '刷新中...' : '🔄 刷新数据' }}
                    </button>

                    <view class="diag-row">
                        <view class="diag-text">
                            <text class="diag-label">连通性测试</text>
                            <text class="diag-status" :class="`s-${testStatus}`">
                                {{ testStatusLabel }}<text v-if="testTimeAt"> · {{ testTimeAt }}</text>
                            </text>
                            <text v-if="testError" class="diag-error" selectable>{{ testError }}</text>
                        </view>
                        <button
                            class="btn-mini"
                            :disabled="testStatus === 'testing'"
                            @click="testConnection"
                        >
                            {{ testStatus === 'testing' ? '...' : '测试' }}
                        </button>
                    </view>
                </view>
            </view>

            <!-- 版本信息 -->
            <view class="footer">
                <text class="footer-text">BikeGuard v0.1.0 · Mobile M1</text>
            </view>
        </view>
    </view>
</template>

<style lang="scss">
.page {
    min-height: 100vh;
    background: linear-gradient(180deg, #0a0a0f 0%, #0c0c14 100%);
    padding-bottom: 40rpx;
}

/* ========== 顶部栏 ========== */
.topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-left: 32rpx;
    padding-right: 32rpx;
    padding-bottom: 24rpx;
}

.topbar-title {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
}

.title {
    font-size: 36rpx;
    font-weight: 600;
    color: #e5e7eb;
    letter-spacing: 1rpx;
}

.subtitle {
    font-size: 20rpx;
    color: #6b7280;
    letter-spacing: 4rpx;
}

.topbar-action {
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 212, 255, 0.06);
    border: 1rpx solid rgba(0, 212, 255, 0.18);
    border-radius: 18rpx;
    transition: all 0.2s;
}

.topbar-action-hover {
    background: rgba(0, 212, 255, 0.12);
    border-color: rgba(0, 212, 255, 0.3);
}

.settings-icon {
    font-size: 36rpx;
    color: #00d4ff;
}

/* ========== 主体布局 ========== */
.main {
    padding: 16rpx 32rpx;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.section-label {
    font-size: 22rpx;
    color: #6b7280;
    letter-spacing: 4rpx;
    text-transform: uppercase;
    margin: 8rpx 4rpx -4rpx;
}

/* ========== 通用卡片 ========== */
.card {
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-radius: 24rpx;
    padding: 28rpx;
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24rpx;
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid rgba(255, 255, 255, 0.04);
}

.card-label-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
}

.card-label {
    font-size: 24rpx;
    color: #9ca3af;
    letter-spacing: 2rpx;
    text-transform: uppercase;
}

.card-time {
    font-size: 22rpx;
    color: #6b7280;
    font-family: 'Menlo', monospace;
}

.card-body {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
}

.row {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.row-label {
    font-size: 22rpx;
    color: #6b7280;
    letter-spacing: 1rpx;
}

.row-value {
    font-size: 28rpx;
    color: #e5e7eb;
}

.row-value.mono {
    font-family: 'SF Mono', 'Menlo', monospace;
    word-break: break-all;
}

.row-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 14rpx;
}

.info-cell {
    flex: 1 1 calc(50% - 14rpx);
    background: rgba(255, 255, 255, 0.02);
    border: 1rpx solid rgba(255, 255, 255, 0.04);
    border-radius: 14rpx;
    padding: 16rpx 18rpx;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
}

.cell-label {
    font-size: 20rpx;
    color: #6b7280;
    letter-spacing: 1rpx;
}

.cell-value {
    font-size: 26rpx;
    color: #e5e7eb;
}

.cell-value.ok { color: #34d399; }
.cell-value.warn { color: #fbbf24; }

.cell-sub {
    font-size: 20rpx;
    color: #6b7280;
}

/* ========== Loading / Error ========== */
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

.error-tips {
    margin-top: 8rpx;
    align-self: stretch;
    background: rgba(239, 68, 68, 0.05);
    border: 1rpx solid rgba(239, 68, 68, 0.15);
    border-radius: 14rpx;
    padding: 18rpx 22rpx;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
}

.tip {
    font-size: 22rpx;
    color: #fca5a5;
    line-height: 1.5;
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

/* ========== KPI 网格 ========== */
.kpi-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16rpx;
}

/* ========== 风险卡片附加说明 ========== */
.risk-note {
    margin-top: 18rpx;
    padding: 14rpx 18rpx;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 12rpx;
}

.risk-note-text {
    font-size: 20rpx;
    color: #6b7280;
    line-height: 1.5;
}

/* ========== 操作区 ========== */
.action-rows {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
}

.diag-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
    padding: 16rpx 18rpx;
    background: rgba(255, 255, 255, 0.02);
    border: 1rpx solid rgba(255, 255, 255, 0.04);
    border-radius: 14rpx;
}

.diag-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
}

.diag-label {
    font-size: 22rpx;
    color: #9ca3af;
    letter-spacing: 1rpx;
}

.diag-status {
    font-size: 22rpx;
    color: #6b7280;
}

.diag-status.s-online { color: #10b981; }
.diag-status.s-offline { color: #ef4444; }
.diag-status.s-testing { color: #f59e0b; }

.diag-error {
    font-size: 20rpx;
    color: #f87171;
    word-break: break-all;
    margin-top: 4rpx;
}

/* ========== 按钮 ========== */
.btn {
    height: 88rpx;
    line-height: 88rpx;
    border-radius: 16rpx;
    font-size: 28rpx;
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

.btn-primary[disabled] {
    background: #2a2a35;
    color: #6b7280;
    box-shadow: none;
}

.btn-secondary {
    background: rgba(255, 255, 255, 0.06);
    color: #e5e7eb;
    border: 1rpx solid rgba(255, 255, 255, 0.12);
}

.btn-secondary[disabled] {
    color: #6b7280;
}

.btn-mini {
    height: 56rpx;
    line-height: 56rpx;
    padding: 0 24rpx;
    border-radius: 12rpx;
    font-size: 24rpx;
    background: rgba(0, 212, 255, 0.1);
    color: #00d4ff;
    border: 1rpx solid rgba(0, 212, 255, 0.3);
    margin: 0;
}

.btn-mini::after {
    border: none;
}

.btn-mini[disabled] {
    background: rgba(255, 255, 255, 0.04);
    color: #6b7280;
    border-color: rgba(255, 255, 255, 0.08);
}

/* ========== 底部 ========== */
.footer {
    display: flex;
    justify-content: center;
    margin-top: 24rpx;
}

.footer-text {
    font-size: 22rpx;
    color: #4b5563;
    letter-spacing: 2rpx;
}
</style>
