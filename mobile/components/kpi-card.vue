<script setup>
/**
 * KPI 数字卡片
 *
 * Props:
 *   - label   : 标签文字（必填）
 *   - value   : 主数值，已格式化的字符串或数字（必填）
 *   - hint    : 副标题 / 单位 / 备注（选填）
 *   - tone    : 色调，可选 'cyan' | 'violet' | 'amber' | 'emerald' | 'rose' | 'slate'
 *               默认 'cyan'
 */
defineProps({
    label: { type: String, required: true },
    value: { type: [String, Number], required: true },
    hint: { type: String, default: '' },
    tone: { type: String, default: 'cyan' },
})
</script>

<template>
    <view class="kpi-card" :class="`tone-${tone}`">
        <view class="kpi-label-row">
            <view class="kpi-bar"></view>
            <text class="kpi-label">{{ label }}</text>
        </view>
        <text class="kpi-value">{{ value }}</text>
        <text v-if="hint" class="kpi-hint">{{ hint }}</text>
    </view>
</template>

<style lang="scss" scoped>
.kpi-card {
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-radius: 20rpx;
    padding: 24rpx 24rpx 28rpx;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
    min-height: 180rpx;
    position: relative;
    overflow: hidden;
}

.kpi-card::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 2rpx;
    opacity: 0.6;
}

.kpi-label-row {
    display: flex;
    align-items: center;
    gap: 10rpx;
}

.kpi-bar {
    width: 6rpx;
    height: 22rpx;
    border-radius: 4rpx;
    background: #00d4ff;
}

.kpi-label {
    font-size: 22rpx;
    color: #9ca3af;
    letter-spacing: 1rpx;
}

.kpi-value {
    font-size: 56rpx;
    font-weight: 600;
    color: #f3f4f6;
    line-height: 1.05;
    letter-spacing: 1rpx;
    font-family: 'SF Pro Display', 'PingFang SC', sans-serif;
}

.kpi-hint {
    font-size: 22rpx;
    color: #6b7280;
}

/* ========== Tones ========== */

.tone-cyan .kpi-bar { background: #00d4ff; }
.tone-cyan::before { background: linear-gradient(90deg, #00d4ff, transparent); }

.tone-violet .kpi-bar { background: #a78bfa; }
.tone-violet::before { background: linear-gradient(90deg, #a78bfa, transparent); }

.tone-amber .kpi-bar { background: #f59e0b; }
.tone-amber::before { background: linear-gradient(90deg, #f59e0b, transparent); }

.tone-emerald .kpi-bar { background: #10b981; }
.tone-emerald::before { background: linear-gradient(90deg, #10b981, transparent); }

.tone-rose .kpi-bar { background: #f43f5e; }
.tone-rose::before { background: linear-gradient(90deg, #f43f5e, transparent); }

.tone-slate .kpi-bar { background: #64748b; }
.tone-slate::before { background: linear-gradient(90deg, #64748b, transparent); }
</style>
