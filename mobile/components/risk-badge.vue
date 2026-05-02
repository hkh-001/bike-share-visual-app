<script setup>
import { computed } from 'vue'
import { riskLabel, riskTone, riskIcon, normalizeRiskType } from '@/utils/risk'

/**
 * 风险类型胶囊徽章
 *
 * Props:
 *   - riskType: 'normal' | 'empty' | 'full' | 'offline' | 'abnormal' | string
 *   - size: 'small' | 'normal'  默认 'normal'
 *   - showIcon: 是否显示 emoji 图标，默认 true
 */
const props = defineProps({
    riskType: { type: String, default: 'unknown' },
    size: { type: String, default: 'normal' },
    showIcon: { type: Boolean, default: true },
})

const normalized = computed(() => normalizeRiskType(props.riskType))
const tone = computed(() => riskTone(normalized.value))
const label = computed(() => riskLabel(normalized.value))
const icon = computed(() => riskIcon(normalized.value))
</script>

<template>
    <view class="risk-badge" :class="[`tone-${tone}`, `size-${size}`]">
        <text v-if="showIcon" class="icon">{{ icon }}</text>
        <text class="label">{{ label }}</text>
    </view>
</template>

<style lang="scss" scoped>
.risk-badge {
    display: inline-flex;
    align-items: center;
    gap: 6rpx;
    padding: 6rpx 14rpx;
    border-radius: 999rpx;
    border: 1rpx solid transparent;
}

.icon {
    font-size: 20rpx;
    line-height: 1;
}

.label {
    font-size: 22rpx;
    letter-spacing: 1rpx;
    line-height: 1;
}

.size-small {
    padding: 4rpx 10rpx;
}

.size-small .icon { font-size: 18rpx; }
.size-small .label { font-size: 20rpx; }

/* tones */
.tone-emerald {
    background: rgba(16, 185, 129, 0.1);
    border-color: rgba(16, 185, 129, 0.3);
}
.tone-emerald .label { color: #34d399; }

.tone-rose {
    background: rgba(244, 63, 94, 0.1);
    border-color: rgba(244, 63, 94, 0.3);
}
.tone-rose .label { color: #fb7185; }

.tone-amber {
    background: rgba(245, 158, 11, 0.1);
    border-color: rgba(245, 158, 11, 0.3);
}
.tone-amber .label { color: #fbbf24; }

.tone-violet {
    background: rgba(167, 139, 250, 0.1);
    border-color: rgba(167, 139, 250, 0.3);
}
.tone-violet .label { color: #c4b5fd; }

.tone-slate {
    background: rgba(100, 116, 139, 0.12);
    border-color: rgba(100, 116, 139, 0.3);
}
.tone-slate .label { color: #cbd5e1; }
</style>
