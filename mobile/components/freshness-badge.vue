<script setup>
import { computed } from 'vue'

/**
 * 数据新鲜度徽章
 *
 * Props:
 *   - status: 'fresh' | 'stale' | 'mock' | 'unknown'  默认 'unknown'
 *   - label : 自定义标签文字；不填则使用默认中文标签
 */
const props = defineProps({
    status: { type: String, default: 'unknown' },
    label: { type: String, default: '' },
})

const normalized = computed(() => {
    const s = String(props.status || '').toLowerCase()
    if (s === 'fresh' || s === 'stale' || s === 'mock') return s
    return 'unknown'
})

const text = computed(() => {
    if (props.label) return props.label
    switch (normalized.value) {
        case 'fresh': return '实时数据'
        case 'stale': return '数据滞后'
        case 'mock':  return '演示数据'
        default:      return '未知状态'
    }
})
</script>

<template>
    <view class="badge" :class="`b-${normalized}`">
        <view class="dot"></view>
        <text class="badge-text">{{ text }}</text>
    </view>
</template>

<style lang="scss" scoped>
.badge {
    display: inline-flex;
    align-items: center;
    gap: 10rpx;
    padding: 8rpx 18rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
    border: 1rpx solid transparent;
}

.dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
}

.badge-text {
    font-size: 22rpx;
    letter-spacing: 1rpx;
}

/* fresh — emerald */
.b-fresh {
    background: rgba(16, 185, 129, 0.1);
    border-color: rgba(16, 185, 129, 0.3);
}
.b-fresh .dot {
    background: #10b981;
    box-shadow: 0 0 10rpx rgba(16, 185, 129, 0.7);
}
.b-fresh .badge-text { color: #34d399; }

/* stale — amber */
.b-stale {
    background: rgba(245, 158, 11, 0.1);
    border-color: rgba(245, 158, 11, 0.3);
}
.b-stale .dot {
    background: #f59e0b;
    box-shadow: 0 0 10rpx rgba(245, 158, 11, 0.7);
}
.b-stale .badge-text { color: #fbbf24; }

/* mock — violet */
.b-mock {
    background: rgba(167, 139, 250, 0.1);
    border-color: rgba(167, 139, 250, 0.3);
}
.b-mock .dot {
    background: #a78bfa;
    box-shadow: 0 0 10rpx rgba(167, 139, 250, 0.7);
}
.b-mock .badge-text { color: #c4b5fd; }

/* unknown — slate */
.b-unknown {
    background: rgba(100, 116, 139, 0.12);
    border-color: rgba(100, 116, 139, 0.3);
}
.b-unknown .dot { background: #94a3b8; }
.b-unknown .badge-text { color: #cbd5e1; }
</style>
