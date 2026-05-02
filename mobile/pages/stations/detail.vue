<script setup>
const milestone = 'M2'
</script>

<template>
    <view class="page">
        <view class="empty">
            <text class="emoji">🏷</text>
            <text class="title">站点详情</text>
            <text class="subtitle">STATION DETAIL</text>
            <view class="badge">即将上线 · {{ milestone }}</view>
            <text class="desc">单站当前状态、24h 历史趋势图、站点告警列表将在 Mobile {{ milestone }} 阶段实现</text>
            <text class="hint">Coming soon</text>
        </view>
    </view>
</template>

<style lang="scss">
.page {
    min-height: 100vh;
    background: #0a0a0f;
    display: flex;
    align-items: center;
    justify-content: center;
}

.empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20rpx;
    padding: 60rpx 48rpx;
    text-align: center;
}

.emoji { font-size: 100rpx; margin-bottom: 12rpx; }
.title { font-size: 44rpx; font-weight: 600; color: #e5e7eb; }
.subtitle { font-size: 22rpx; color: #6b7280; letter-spacing: 4rpx; }
.badge {
    margin-top: 16rpx;
    padding: 12rpx 32rpx;
    background: rgba(0, 212, 255, 0.08);
    border: 1rpx solid rgba(0, 212, 255, 0.25);
    border-radius: 999rpx;
    font-size: 24rpx;
    color: #00d4ff;
}
.desc {
    margin-top: 16rpx;
    font-size: 26rpx;
    color: #9ca3af;
    line-height: 1.6;
    max-width: 540rpx;
}
.hint {
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #4b5563;
    letter-spacing: 4rpx;
    text-transform: uppercase;
}
</style>
