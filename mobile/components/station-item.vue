<script setup>
import { computed } from 'vue'
import { formatNumber, formatPercent } from '@/utils/format'
import RiskBadge from './risk-badge.vue'

/**
 * 站点列表卡片
 *
 * Props:
 *   - station: 后端任一形态的站点对象，字段兼容：
 *       code | station_code
 *       name | station_name
 *       region_code | region_name
 *       bikes_available
 *       docks_available
 *       capacity
 *       occupancy_rate (0~1)
 *       risk_type
 *
 * Emits:
 *   - click: 点击整张卡片时抛出，参数为 station code 字符串
 *
 * 默认行为：内置 uni.navigateTo 跳转到 /pages/stations/detail?code=xxx
 * 也可监听 @click 自行处理。
 */
const props = defineProps({
    station: { type: Object, required: true },
})

const emit = defineEmits(['click'])

const code = computed(() => {
    const s = props.station || {}
    return String(s.code || s.station_code || '').trim()
})

const name = computed(() => {
    const s = props.station || {}
    return s.name || s.station_name || '未命名站点'
})

const region = computed(() => {
    const s = props.station || {}
    return s.region_name || s.region_code || ''
})

const bikes = computed(() => formatNumber(props.station?.bikes_available))
const docks = computed(() => formatNumber(props.station?.docks_available))
const capacity = computed(() => formatNumber(props.station?.capacity))
const occupancy = computed(() => formatPercent(props.station?.occupancy_rate, 1))
const riskType = computed(() => props.station?.risk_type || 'unknown')

function onTap() {
    if (!code.value) return
    emit('click', code.value)
    // 默认跳转
    uni.navigateTo({ url: `/pages/stations/detail?code=${encodeURIComponent(code.value)}` })
}
</script>

<template>
    <view class="station-card" hover-class="station-card-hover" @click="onTap">
        <view class="card-head">
            <view class="head-text">
                <text class="name">{{ name }}</text>
                <view class="meta-row">
                    <text v-if="code" class="code">#{{ code }}</text>
                    <text v-if="region" class="region">· {{ region }}</text>
                </view>
            </view>
            <risk-badge :risk-type="riskType" size="small" />
        </view>

        <view class="card-stats">
            <view class="stat">
                <text class="stat-value">{{ bikes }}</text>
                <text class="stat-label">可用车</text>
            </view>
            <view class="stat-divider"></view>
            <view class="stat">
                <text class="stat-value">{{ docks }}</text>
                <text class="stat-label">可用桩</text>
            </view>
            <view class="stat-divider"></view>
            <view class="stat">
                <text class="stat-value">{{ capacity }}</text>
                <text class="stat-label">容量</text>
            </view>
            <view class="stat-divider"></view>
            <view class="stat">
                <text class="stat-value">{{ occupancy }}</text>
                <text class="stat-label">占用率</text>
            </view>
        </view>

        <view class="card-foot">
            <text class="foot-text">查看详情</text>
            <text class="arrow">›</text>
        </view>
    </view>
</template>

<style lang="scss" scoped>
.station-card {
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-radius: 20rpx;
    padding: 24rpx 24rpx 16rpx;
    display: flex;
    flex-direction: column;
    gap: 18rpx;
    transition: border-color 0.2s, background 0.2s;
}

.station-card-hover {
    background: #1a1a24;
    border-color: rgba(0, 212, 255, 0.25);
}

/* head */
.card-head {
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
    gap: 6rpx;
}

.name {
    font-size: 28rpx;
    color: #f3f4f6;
    font-weight: 500;
    line-height: 1.3;
    word-break: break-word;
}

.meta-row {
    display: flex;
    align-items: center;
    gap: 8rpx;
    flex-wrap: wrap;
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

/* stats */
.card-stats {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 14rpx 0;
}

.stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4rpx;
}

.stat-value {
    font-size: 30rpx;
    color: #e5e7eb;
    font-weight: 500;
    font-family: 'SF Pro Display', 'PingFang SC', sans-serif;
}

.stat-label {
    font-size: 20rpx;
    color: #6b7280;
    letter-spacing: 1rpx;
}

.stat-divider {
    width: 1rpx;
    height: 32rpx;
    background: rgba(255, 255, 255, 0.06);
}

/* foot */
.card-foot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4rpx;
    border-top: 1rpx solid rgba(255, 255, 255, 0.04);
    padding-top: 12rpx;
}

.foot-text {
    font-size: 22rpx;
    color: #00d4ff;
    letter-spacing: 1rpx;
}

.arrow {
    font-size: 28rpx;
    color: #00d4ff;
    line-height: 1;
}
</style>
