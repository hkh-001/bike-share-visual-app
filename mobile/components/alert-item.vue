<script setup>
import { computed } from 'vue'
import { formatRelativeTime, formatDateTime } from '@/utils/format'

/**
 * 告警卡片
 *
 * Props:
 *   - alert: 后端 RecentAlertItem，字段兼容：
 *       id, level, type | alert_type, title, message,
 *       station_code, station_name, region_code, region_name,
 *       status, created_at, updated_at
 *   - mode: 'real' | 'mock'，可选，默认 'real'
 *
 * 交互：
 *   - real + 有 station_code  → 跳转 /pages/stations/detail?code=...
 *   - mock                    → uni.showToast「演示告警不跳转真实站点」
 *   - 无 station_code         → 不跳转，显示「无站点信息」占位
 *
 * 视觉：
 *   - critical → rose
 *   - warning  → amber
 *   - info     → cyan
 *   - 其它     → slate
 */

const props = defineProps({
    alert: { type: Object, required: true },
    mode: { type: String, default: 'real' },
})

const emit = defineEmits(['click'])

const a = computed(() => props.alert || {})

const id = computed(() => a.value.id ?? null)

const levelRaw = computed(() => String(a.value.level || '').toLowerCase())

const tone = computed(() => {
    const l = levelRaw.value
    if (l === 'critical' || l === 'high') return 'rose'
    if (l === 'warning' || l === 'medium' || l === 'warn') return 'amber'
    if (l === 'info' || l === 'low' || l === 'notice') return 'cyan'
    return 'slate'
})

const levelLabel = computed(() => {
    const l = levelRaw.value
    if (l === 'critical') return '紧急'
    if (l === 'warning' || l === 'warn') return '警告'
    if (l === 'info') return '提示'
    return a.value.level || '未知'
})

const typeText = computed(() => a.value.type || a.value.alert_type || '')

const title = computed(() => {
    const t = a.value.title
    if (t && String(t).trim()) return t
    return typeText.value || '告警'
})

const message = computed(() => a.value.message || '')

const stationCode = computed(() => {
    const c = a.value.station_code
    return c ? String(c).trim() : ''
})

const stationName = computed(() => a.value.station_name || '')

const regionText = computed(() => a.value.region_name || a.value.region_code || '')

const stationDisplay = computed(() => {
    const name = stationName.value
    const code = stationCode.value
    if (name && code) return `${name} (#${code})`
    if (name) return name
    if (code) return `#${code}`
    return ''
})

const hasStation = computed(() => Boolean(stationCode.value))

const statusRaw = computed(() => String(a.value.status || '').toLowerCase())
const statusLabel = computed(() => {
    const s = statusRaw.value
    if (s === 'open' || s === 'active' || s === 'unresolved') return '未处理'
    if (s === 'resolved' || s === 'closed') return '已处理'
    if (s === 'acknowledged' || s === 'ack') return '已确认'
    return a.value.status || '--'
})

const createdAt = computed(() => a.value.created_at || a.value.updated_at || null)
const createdRel = computed(() => formatRelativeTime(createdAt.value))
const createdFull = computed(() => formatDateTime(createdAt.value))

const isMock = computed(() => props.mode === 'mock')
const canNavigate = computed(() => !isMock.value && hasStation.value)

function onTap() {
    emit('click', { id: id.value, mode: props.mode, station_code: stationCode.value })
    if (isMock.value) {
        uni.showToast({ title: '演示告警不跳转真实站点', icon: 'none', duration: 1800 })
        return
    }
    if (!hasStation.value) {
        uni.showToast({ title: '该告警无关联站点', icon: 'none', duration: 1500 })
        return
    }
    uni.navigateTo({
        url: `/pages/stations/detail?code=${encodeURIComponent(stationCode.value)}`,
    })
}
</script>

<template>
    <view
        class="alert-card"
        :class="[`tone-${tone}`, { 'is-mock': isMock, 'no-station': !hasStation && !isMock }]"
        hover-class="alert-card-hover"
        @click="onTap"
    >
        <!-- 头部：级别 + (mock badge) + 时间 -->
        <view class="head">
            <view class="badges">
                <text class="level-badge">{{ levelLabel }}</text>
                <text v-if="isMock" class="mock-badge">演示数据</text>
                <text v-if="typeText" class="type-text">· {{ typeText }}</text>
            </view>
            <text class="time" :title="createdFull">{{ createdRel }}</text>
        </view>

        <!-- 标题 -->
        <text class="title">{{ title }}</text>

        <!-- 消息 -->
        <text v-if="message" class="message">{{ message }}</text>

        <!-- 站点信息 -->
        <view class="station-row">
            <text class="pin">📍</text>
            <view class="station-text">
                <text v-if="stationDisplay" class="station-main">{{ stationDisplay }}</text>
                <text v-else class="station-empty">无站点信息</text>
                <text v-if="regionText" class="region">{{ regionText }}</text>
            </view>
        </view>

        <!-- 底部：状态 + cta -->
        <view class="foot">
            <text class="status">状态：{{ statusLabel }}</text>
            <view v-if="canNavigate" class="cta">
                <text class="cta-text">查看站点</text>
                <text class="cta-arrow">›</text>
            </view>
            <view v-else-if="isMock" class="cta cta-disabled">
                <text class="cta-text">演示数据</text>
            </view>
            <view v-else-if="!hasStation" class="cta cta-disabled">
                <text class="cta-text">无站点</text>
            </view>
        </view>
    </view>
</template>

<style lang="scss" scoped>
.alert-card {
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-left: 6rpx solid rgba(255, 255, 255, 0.1);
    border-radius: 18rpx;
    padding: 22rpx 22rpx 18rpx;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
    transition: background 0.2s, border-color 0.2s;
}

.alert-card-hover {
    background: #1a1a24;
    border-color: rgba(255, 255, 255, 0.12);
}

.alert-card.is-mock {
    background: rgba(167, 139, 250, 0.04);
    border-color: rgba(167, 139, 250, 0.15);
}

.alert-card.no-station {
    opacity: 0.85;
}

/* head */
.head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12rpx;
}

.badges {
    display: flex;
    align-items: center;
    gap: 10rpx;
    flex-wrap: wrap;
    flex: 1;
    min-width: 0;
}

.level-badge {
    font-size: 22rpx;
    padding: 4rpx 14rpx;
    border-radius: 8rpx;
    background: rgba(255, 255, 255, 0.06);
    color: #e5e7eb;
    letter-spacing: 1rpx;
}

.mock-badge {
    font-size: 20rpx;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
    background: rgba(167, 139, 250, 0.15);
    border: 1rpx solid rgba(167, 139, 250, 0.35);
    color: #c4b5fd;
    letter-spacing: 1rpx;
}

.type-text {
    font-size: 22rpx;
    color: #6b7280;
}

.time {
    font-size: 22rpx;
    color: #6b7280;
    flex: 0 0 auto;
}

/* body */
.title {
    font-size: 28rpx;
    color: #f3f4f6;
    font-weight: 500;
    line-height: 1.35;
    word-break: break-word;
}

.message {
    font-size: 24rpx;
    color: #9ca3af;
    line-height: 1.5;
    word-break: break-word;
}

.station-row {
    display: flex;
    align-items: flex-start;
    gap: 8rpx;
    background: rgba(255, 255, 255, 0.025);
    border-radius: 12rpx;
    padding: 12rpx 14rpx;
}

.pin {
    font-size: 22rpx;
    line-height: 1.4;
}

.station-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
}

.station-main {
    font-size: 24rpx;
    color: #e5e7eb;
    word-break: break-word;
}

.station-empty {
    font-size: 24rpx;
    color: #6b7280;
    font-style: italic;
}

.region {
    font-size: 20rpx;
    color: #9ca3af;
}

/* foot */
.foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1rpx solid rgba(255, 255, 255, 0.04);
    padding-top: 12rpx;
}

.status {
    font-size: 22rpx;
    color: #9ca3af;
    letter-spacing: 1rpx;
}

.cta {
    display: flex;
    align-items: center;
    gap: 4rpx;
}

.cta-text {
    font-size: 22rpx;
    color: #00d4ff;
    letter-spacing: 1rpx;
}

.cta-arrow {
    font-size: 26rpx;
    color: #00d4ff;
    line-height: 1;
}

.cta-disabled .cta-text {
    color: #6b7280;
}

/* tones */
.tone-rose {
    border-left-color: #fb7185;
}
.tone-rose .level-badge {
    background: rgba(244, 63, 94, 0.18);
    color: #fb7185;
}

.tone-amber {
    border-left-color: #fbbf24;
}
.tone-amber .level-badge {
    background: rgba(245, 158, 11, 0.18);
    color: #fbbf24;
}

.tone-cyan {
    border-left-color: #00d4ff;
}
.tone-cyan .level-badge {
    background: rgba(0, 212, 255, 0.18);
    color: #00d4ff;
}

.tone-slate {
    border-left-color: #64748b;
}
.tone-slate .level-badge {
    background: rgba(100, 116, 139, 0.18);
    color: #cbd5e1;
}
</style>
