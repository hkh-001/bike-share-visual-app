<script setup>
/**
 * 风险概览卡片
 *
 * 展示 5 项数值：空车 / 满桩 / 离线 / 异常 / 告警总数
 * 每项支持 number 或 string；显示 '--' 表示数据未提供。
 *
 * Props:
 *   - empty    : 空车风险数（number | string）
 *   - full     : 满桩风险数
 *   - offline  : 离线数
 *   - abnormal : 异常数
 *   - alerts   : 告警总数
 */
defineProps({
    empty: { type: [Number, String], default: '--' },
    full: { type: [Number, String], default: '--' },
    offline: { type: [Number, String], default: '--' },
    abnormal: { type: [Number, String], default: '--' },
    alerts: { type: [Number, String], default: '--' },
})
</script>

<template>
    <view class="risk-grid">
        <view class="risk-item r-empty">
            <text class="dot">●</text>
            <view class="meta">
                <text class="num">{{ empty }}</text>
                <text class="label">空车风险</text>
            </view>
        </view>

        <view class="risk-item r-full">
            <text class="dot">●</text>
            <view class="meta">
                <text class="num">{{ full }}</text>
                <text class="label">满桩风险</text>
            </view>
        </view>

        <view class="risk-item r-offline">
            <text class="dot">●</text>
            <view class="meta">
                <text class="num">{{ offline }}</text>
                <text class="label">离线</text>
            </view>
        </view>

        <view class="risk-item r-abnormal">
            <text class="dot">●</text>
            <view class="meta">
                <text class="num">{{ abnormal }}</text>
                <text class="label">异常</text>
            </view>
        </view>

        <view class="risk-item r-alerts">
            <text class="dot">●</text>
            <view class="meta">
                <text class="num">{{ alerts }}</text>
                <text class="label">告警总数</text>
            </view>
        </view>
    </view>
</template>

<style lang="scss" scoped>
.risk-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
}

.risk-item {
    flex: 1 1 calc(33.333% - 16rpx);
    min-width: 180rpx;
    background: rgba(255, 255, 255, 0.02);
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-radius: 16rpx;
    padding: 18rpx 20rpx;
    display: flex;
    align-items: center;
    gap: 14rpx;
}

.dot {
    font-size: 22rpx;
}

.meta {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    flex: 1;
}

.num {
    font-size: 36rpx;
    font-weight: 600;
    color: #f3f4f6;
    line-height: 1;
    font-family: 'SF Pro Display', 'PingFang SC', sans-serif;
}

.label {
    font-size: 20rpx;
    color: #9ca3af;
    letter-spacing: 1rpx;
}

/* Tones */
.r-empty .dot    { color: #f43f5e; }
.r-full .dot     { color: #f59e0b; }
.r-offline .dot  { color: #6b7280; }
.r-abnormal .dot { color: #a78bfa; }
.r-alerts .dot   { color: #00d4ff; }
</style>
