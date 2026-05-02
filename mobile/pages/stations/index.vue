<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { stations as fetchStations } from '@/api/dashboard'
import StationItem from '@/components/station-item.vue'

/* ========== 加载状态：idle | loading | success | error ========== */
const status = ref('idle')
const errorMsg = ref('')

const allStations = ref([])
const lastQueryRiskType = ref('') // 仅用于展示，避免请求中筛选错乱

/* ========== 风险筛选 chips ========== */
const RISK_CHIPS = [
    { value: '', label: '全部' },
    { value: 'normal', label: '正常' },
    { value: 'empty', label: '空车' },
    { value: 'full', label: '满桩' },
    { value: 'offline', label: '离线' },
    { value: 'abnormal', label: '异常' },
]

const selectedRisk = ref('')

/* ========== 搜索（本地过滤名称 / 编码） ========== */
const searchQuery = ref('')

/* ========== 客户端分页 ========== */
const PAGE_SIZE = 50
const visibleCount = ref(PAGE_SIZE)

/* ========== 计算字段 ========== */

const isLoading = computed(() => status.value === 'loading')
const isError = computed(() => status.value === 'error')

const filteredStations = computed(() => {
    const list = Array.isArray(allStations.value) ? allStations.value : []
    const q = (searchQuery.value || '').trim().toLowerCase()
    if (!q) return list
    return list.filter((s) => {
        const code = String(s?.code || s?.station_code || '').toLowerCase()
        const name = String(s?.name || s?.station_name || '').toLowerCase()
        return code.includes(q) || name.includes(q)
    })
})

const visibleStations = computed(() =>
    filteredStations.value.slice(0, visibleCount.value),
)

const hasMore = computed(() => visibleCount.value < filteredStations.value.length)

const totalCount = computed(() => filteredStations.value.length)
const totalAll = computed(() => allStations.value.length)

/* ========== 数据加载 ========== */

async function load(opts = {}) {
    if (status.value === 'loading' && !opts.force) return
    status.value = 'loading'
    if (!opts.silent) errorMsg.value = ''

    const risk = selectedRisk.value
    lastQueryRiskType.value = risk

    try {
        const res = await fetchStations(risk ? { risk_type: risk } : {})
        // 后端可能返回数组 或 { items: [...] }
        const list = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : []
        allStations.value = list
        // 任何成功的列表加载都重置可见条数
        visibleCount.value = PAGE_SIZE
        status.value = 'success'
    } catch (err) {
        status.value = 'error'
        errorMsg.value = (err && err.message) || '加载失败，请检查网络与后端服务'
    }
}

/* ========== 风险 chip 切换 ========== */
function selectRisk(value) {
    if (selectedRisk.value === value) return
    selectedRisk.value = value
    visibleCount.value = PAGE_SIZE
    load()
}

/* ========== 搜索输入 ========== */
function onSearchInput(e) {
    searchQuery.value = String(e.detail.value || '')
    // 搜索是本地过滤，重置可见条数即可
    visibleCount.value = PAGE_SIZE
}

function clearSearch() {
    searchQuery.value = ''
    visibleCount.value = PAGE_SIZE
}

/* ========== 列表点击（station-item 已自带跳转，这里仅作埋点位） ========== */
function onItemTap(/* code */) {
    // station-item 内部已 uni.navigateTo，无需重复
}

/* ========== uni-app 生命周期 ========== */
onShow(() => {
    // 首次进入或从详情页返回都刷新一次
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
        filteredStations.value.length,
    )
})
</script>

<template>
    <view class="page">
        <!-- 顶部固定区：搜索框 + 风险筛选 -->
        <view class="topbar">
            <!-- 搜索框 -->
            <view class="search-row">
                <text class="search-icon">🔍</text>
                <input
                    class="search-input"
                    type="text"
                    placeholder="搜索站点名称或编码"
                    placeholder-class="search-placeholder"
                    :value="searchQuery"
                    confirm-type="search"
                    @input="onSearchInput"
                />
                <text v-if="searchQuery" class="search-clear" @click="clearSearch">✕</text>
            </view>

            <!-- 风险 chips -->
            <scroll-view class="chip-scroll" scroll-x="true" show-scrollbar="false">
                <view class="chip-row">
                    <view
                        v-for="chip in RISK_CHIPS"
                        :key="chip.value || 'all'"
                        class="chip"
                        :class="{ 'chip-active': selectedRisk === chip.value }"
                        hover-class="chip-hover"
                        @click="selectRisk(chip.value)"
                    >
                        <text class="chip-label">{{ chip.label }}</text>
                    </view>
                </view>
            </scroll-view>

            <!-- 计数行 -->
            <view class="count-row">
                <text class="count-text">
                    <text v-if="searchQuery">搜索结果：</text>
                    已显示 {{ visibleStations.length }} / 共 {{ totalCount }}
                </text>
                <text class="count-sub" v-if="!searchQuery && totalAll && totalCount !== totalAll">
                    （筛选自 {{ totalAll }}）
                </text>
            </view>
        </view>

        <!-- 主体 -->
        <view class="main">
            <!-- Loading 全屏占位 -->
            <view v-if="isLoading && allStations.length === 0" class="card center-card">
                <text class="loading-emoji">⏳</text>
                <text class="loading-text">加载中…</text>
                <text class="loading-sub">正在获取站点列表</text>
            </view>

            <!-- 错误占位 -->
            <view v-else-if="isError && allStations.length === 0" class="card error-card">
                <text class="error-emoji">⚠️</text>
                <text class="error-title">加载失败</text>
                <text class="error-text" selectable>{{ errorMsg }}</text>
                <view class="error-actions">
                    <button class="btn btn-primary" @click="load({ force: true })">重试</button>
                </view>
            </view>

            <!-- 空状态 -->
            <view v-else-if="status === 'success' && totalCount === 0" class="card center-card">
                <text class="loading-emoji">📭</text>
                <text class="loading-text">暂无站点</text>
                <text class="loading-sub">
                    <text v-if="searchQuery">没有匹配「{{ searchQuery }}」的站点</text>
                    <text v-else-if="selectedRisk">当前筛选条件下无数据</text>
                    <text v-else>后端未返回站点</text>
                </text>
            </view>

            <!-- 列表 -->
            <view v-else class="list">
                <station-item
                    v-for="(s, i) in visibleStations"
                    :key="s.code || s.station_code || s.station_id || i"
                    :station="s"
                    @click="onItemTap"
                />

                <!-- 加载更多 -->
                <view class="more-row">
                    <text v-if="hasMore" class="more-text">下拉到底加载更多 ↓</text>
                    <text v-else-if="totalCount > 0" class="more-text-end">— 已加载全部 —</text>
                </view>
            </view>

            <!-- 底部静默重试条（已有数据但本次失败） -->
            <view v-if="isError && allStations.length > 0" class="silent-error" @click="load({ force: true })">
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

.search-row {
    display: flex;
    align-items: center;
    gap: 14rpx;
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-radius: 16rpx;
    padding: 14rpx 22rpx;
}

.search-icon {
    font-size: 26rpx;
    color: #6b7280;
}

.search-input {
    flex: 1;
    font-size: 28rpx;
    color: #e5e7eb;
    background: transparent;
    height: 48rpx;
    line-height: 48rpx;
}

.search-placeholder {
    color: #4b5563;
    font-size: 26rpx;
}

.search-clear {
    font-size: 24rpx;
    color: #6b7280;
    padding: 6rpx 14rpx;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 999rpx;
}

/* ========== chips ========== */
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

/* ========== 计数 ========== */
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

.count-sub {
    font-size: 20rpx;
    color: #6b7280;
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
    gap: 16rpx;
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

.btn::after { border: none; }

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
