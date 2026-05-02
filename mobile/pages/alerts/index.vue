<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { alerts as fetchAlerts } from '@/api/dashboard'
import AlertItem from '@/components/alert-item.vue'

/* ========== 状态：idle | loading | success | error ========== */
const status = ref('idle')
const errorMsg = ref('')

/* ========== 模式 segment：real | mock ========== */
const mode = ref('real')

const MODE_TABS = [
    { value: 'real', label: '真实告警' },
    { value: 'mock', label: '演示告警' },
]

const modeBanner = computed(() => {
    if (mode.value === 'mock') {
        return {
            tone: 'violet',
            title: '演示模式',
            text: '当前为 Mock 演示告警，仅用于课堂展示，不代表真实 Citi Bike 数据。点击告警不会跳转真实站点。',
        }
    }
    return {
        tone: 'cyan',
        title: '真实告警',
        text: '基于当前活跃数据源（GBFS）和动态风险规则生成的告警，可点击进入对应站点详情。',
    }
})

/* ========== 级别 chips ========== */
const LEVEL_CHIPS = [
    { value: '', label: '全部' },
    { value: 'critical', label: '紧急' },
    { value: 'warning', label: '警告' },
    { value: 'info', label: '提示' },
]

const selectedLevel = ref('')

/* ========== 数据 ========== */
const allAlerts = ref([])

/* ========== 客户端分页 ========== */
const PAGE_SIZE = 30
const visibleCount = ref(PAGE_SIZE)

/* ========== 计算字段 ========== */
const isLoading = computed(() => status.value === 'loading')
const isError = computed(() => status.value === 'error')

const visibleAlerts = computed(() =>
    allAlerts.value.slice(0, visibleCount.value),
)

const hasMore = computed(() => visibleCount.value < allAlerts.value.length)

const totalFetched = computed(() => allAlerts.value.length)

/* ========== 加载 ========== */

async function load(opts = {}) {
    if (status.value === 'loading' && !opts.force) return
    status.value = 'loading'
    if (!opts.silent) errorMsg.value = ''

    try {
        const res = await fetchAlerts({
            mode: mode.value,
            level: selectedLevel.value || undefined,
            limit: 300,
        })
        const list = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : []
        allAlerts.value = list
        visibleCount.value = PAGE_SIZE
        status.value = 'success'
    } catch (err) {
        status.value = 'error'
        errorMsg.value = (err && err.message) || '加载失败，请检查网络与后端服务'
    }
}

/* ========== 切换交互 ========== */

function selectMode(value) {
    if (mode.value === value) return
    mode.value = value
    visibleCount.value = PAGE_SIZE
    load()
}

function selectLevel(value) {
    if (selectedLevel.value === value) return
    selectedLevel.value = value
    visibleCount.value = PAGE_SIZE
    load()
}

/* ========== 生命周期 ========== */
onShow(() => {
    load()
})

onPullDownRefresh(async () => {
    await load({ force: true })
    uni.stopPullDownRefresh()
})

onReachBottom(() => {
    if (!hasMore.value) return
    visibleCount.value = Math.min(
        visibleCount.value + PAGE_SIZE,
        allAlerts.value.length,
    )
})

/* ========== 子组件回调（仅占位埋点） ========== */
function onAlertTap(/* payload */) {
    // alert-item 内部已处理 toast / 跳转逻辑
}
</script>

<template>
    <view class="page">
        <!-- 顶部 sticky：模式 segment + 级别 chips + 计数 -->
        <view class="topbar">
            <!-- 模式切换 -->
            <view class="segment">
                <view
                    v-for="tab in MODE_TABS"
                    :key="tab.value"
                    class="seg-item"
                    :class="{ 'seg-active': mode === tab.value, [`seg-${tab.value}-active`]: mode === tab.value }"
                    hover-class="seg-hover"
                    @click="selectMode(tab.value)"
                >
                    <text class="seg-label">{{ tab.label }}</text>
                </view>
            </view>

            <!-- 模式说明 banner -->
            <view class="banner" :class="`banner-${modeBanner.tone}`">
                <text class="banner-title">{{ modeBanner.title }}</text>
                <text class="banner-text">{{ modeBanner.text }}</text>
            </view>

            <!-- 级别 chips -->
            <scroll-view class="chip-scroll" scroll-x="true" show-scrollbar="false">
                <view class="chip-row">
                    <view
                        v-for="chip in LEVEL_CHIPS"
                        :key="chip.value || 'all'"
                        class="chip"
                        :class="{ 'chip-active': selectedLevel === chip.value }"
                        hover-class="chip-hover"
                        @click="selectLevel(chip.value)"
                    >
                        <text class="chip-label">{{ chip.label }}</text>
                    </view>
                </view>
            </scroll-view>

            <!-- 计数 -->
            <view class="count-row">
                <text class="count-text">
                    已显示 {{ visibleAlerts.length }} / 当前获取 {{ totalFetched }} 条
                </text>
            </view>
        </view>

        <!-- 主体 -->
        <view class="main">
            <!-- Loading 占位 -->
            <view v-if="isLoading && allAlerts.length === 0" class="card center-card">
                <text class="loading-emoji">⏳</text>
                <text class="loading-text">加载中…</text>
                <text class="loading-sub">{{ mode === 'mock' ? '获取 Mock 演示告警' : '获取真实告警' }}</text>
            </view>

            <!-- 错误占位 -->
            <view v-else-if="isError && allAlerts.length === 0" class="card error-card">
                <text class="error-emoji">⚠️</text>
                <text class="error-title">加载失败</text>
                <text class="error-text" selectable>{{ errorMsg }}</text>
                <view class="error-actions">
                    <button class="btn btn-primary" @click="load({ force: true })">重试</button>
                </view>
            </view>

            <!-- 空状态 -->
            <view v-else-if="status === 'success' && totalFetched === 0" class="card center-card">
                <text class="loading-emoji">{{ mode === 'mock' ? '🎭' : '✅' }}</text>
                <text class="loading-text">
                    {{ mode === 'mock' ? '暂无演示告警' : '暂无告警' }}
                </text>
                <text class="loading-sub">
                    <text v-if="selectedLevel">当前级别筛选下无数据，可点「全部」查看所有</text>
                    <text v-else-if="mode === 'real'">系统当前未生成任何告警，状态健康</text>
                    <text v-else>Mock 演示数据暂未配置告警</text>
                </text>
            </view>

            <!-- 列表 -->
            <view v-else class="list">
                <alert-item
                    v-for="(item, i) in visibleAlerts"
                    :key="item.id != null ? `${mode}-${item.id}` : `${mode}-${i}`"
                    :alert="item"
                    :mode="mode"
                    @click="onAlertTap"
                />

                <!-- 加载更多 -->
                <view class="more-row">
                    <text v-if="hasMore" class="more-text">下拉到底加载更多 ↓</text>
                    <text v-else-if="totalFetched > 0" class="more-text-end">— 已加载全部 —</text>
                </view>
            </view>

            <!-- 静默错误条 -->
            <view v-if="isError && allAlerts.length > 0" class="silent-error" @click="load({ force: true })">
                <text class="silent-error-text">⚠️ 刷新失败，点击重试</text>
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

/* ========== 顶部 ========== */
.topbar {
    background: #0a0a0f;
    padding: 24rpx 32rpx 8rpx;
    display: flex;
    flex-direction: column;
    gap: 18rpx;
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1rpx solid rgba(255, 255, 255, 0.04);
}

/* ===== Segment ===== */
.segment {
    display: flex;
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-radius: 14rpx;
    padding: 4rpx;
    gap: 4rpx;
}

.seg-item {
    flex: 1;
    padding: 14rpx 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10rpx;
    transition: all 0.2s;
}

.seg-hover {
    background: rgba(255, 255, 255, 0.02);
}

.seg-active {
    background: rgba(0, 212, 255, 0.1);
    border: 1rpx solid rgba(0, 212, 255, 0.4);
}

.seg-mock-active {
    background: rgba(167, 139, 250, 0.1);
    border-color: rgba(167, 139, 250, 0.4);
}

.seg-label {
    font-size: 26rpx;
    color: #9ca3af;
    letter-spacing: 1rpx;
}

.seg-active .seg-label {
    color: #00d4ff;
    font-weight: 500;
}

.seg-mock-active .seg-label {
    color: #c4b5fd;
}

/* ===== Banner ===== */
.banner {
    padding: 14rpx 18rpx;
    border-radius: 14rpx;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
}

.banner-cyan {
    background: rgba(0, 212, 255, 0.05);
    border: 1rpx solid rgba(0, 212, 255, 0.18);
}

.banner-violet {
    background: rgba(167, 139, 250, 0.06);
    border: 1rpx solid rgba(167, 139, 250, 0.25);
}

.banner-title {
    font-size: 22rpx;
    color: #e5e7eb;
    font-weight: 500;
    letter-spacing: 1rpx;
}

.banner-cyan .banner-title { color: #00d4ff; }
.banner-violet .banner-title { color: #c4b5fd; }

.banner-text {
    font-size: 22rpx;
    color: #9ca3af;
    line-height: 1.5;
}

/* ===== Chips ===== */
.chip-scroll {
    width: 100%;
    white-space: nowrap;
}

.chip-row {
    display: inline-flex;
    gap: 12rpx;
    padding-right: 32rpx;
}

.chip {
    flex: 0 0 auto;
    padding: 10rpx 24rpx;
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-radius: 999rpx;
    transition: all 0.2s;
}

.chip-hover {
    background: #1c1c26;
}

.chip-active {
    background: rgba(0, 212, 255, 0.1);
    border-color: rgba(0, 212, 255, 0.4);
}

.chip-label {
    font-size: 24rpx;
    color: #9ca3af;
    letter-spacing: 1rpx;
}

.chip-active .chip-label {
    color: #00d4ff;
}

/* ===== 计数 ===== */
.count-row {
    display: flex;
    align-items: baseline;
    gap: 8rpx;
    padding-bottom: 4rpx;
}

.count-text {
    font-size: 22rpx;
    color: #9ca3af;
    letter-spacing: 1rpx;
}

/* ========== 主体 ========== */
.main {
    padding: 16rpx 32rpx 0;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.list {
    display: flex;
    flex-direction: column;
    gap: 14rpx;
}

.more-row {
    display: flex;
    justify-content: center;
    padding: 24rpx 0 8rpx;
}

.more-text {
    font-size: 22rpx;
    color: #6b7280;
    letter-spacing: 1rpx;
}

.more-text-end {
    font-size: 22rpx;
    color: #4b5563;
    letter-spacing: 2rpx;
}

/* ========== Loading / Error / Empty ========== */
.card {
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-radius: 24rpx;
    padding: 28rpx;
}

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
