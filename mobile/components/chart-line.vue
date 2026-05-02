<script setup>
import { computed, getCurrentInstance, nextTick, onMounted, ref, watch } from 'vue'

/**
 * 简易折线图组件（基于 uni-app 原生 <canvas>）
 *
 * 选择实现方式：
 *   - 课程展示需求下，没有额外引入 qiun-data-charts / uCharts，避免插件安装与依赖配置；
 *   - 后续若希望升级，可保留本组件的 Props 契约（categories / series / loading / empty / height），
 *     直接替换内部实现为 qiun-data-charts，无需修改调用方。
 *
 * Props:
 *   - categories: string[]                     横轴标签（如 ['00:00','01:00',...]）
 *   - series: [{ name, data:number[], color? }]纵轴数据，多组绘多条线
 *   - loading: boolean                         显示骨架占位
 *   - empty:   boolean                         显示「暂无数据」占位
 *   - height:  number                          画布高度（rpx，默认 360）
 *   - canvasId: string                         同页多个图表时需手动传不同 id
 *   - yFormatter: (n)=>string                  纵轴刻度文本格式化器（默认 toFixed(1)）
 */

const props = defineProps({
    categories: { type: Array, default: () => [] },
    series: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    empty: { type: Boolean, default: false },
    height: { type: Number, default: 360 },
    canvasId: { type: String, default: 'mobile-chart-line' },
    yFormatter: { type: Function, default: null },
})

const instance = getCurrentInstance()

const DEFAULT_COLORS = ['#00d4ff', '#fbbf24', '#34d399', '#fb7185', '#c4b5fd']

const canvasWidthPx = ref(0)
const canvasHeightPx = ref(0)

const heightStyle = computed(() => `${props.height}rpx`)

const seriesNormalized = computed(() => {
    return (props.series || []).map((s, i) => ({
        name: s?.name || `Series ${i + 1}`,
        data: Array.isArray(s?.data) ? s.data : [],
        color: s?.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    }))
})

const isEmpty = computed(() => {
    if (props.empty) return true
    if (!props.categories || props.categories.length === 0) return true
    const total = seriesNormalized.value.reduce((sum, s) => sum + s.data.length, 0)
    return total === 0
})

/* ---------- 计算尺寸（rpx → px） ---------- */
function measure() {
    return new Promise((resolve) => {
        const query = uni.createSelectorQuery().in(instance.proxy)
        query.select(`#wrap-${props.canvasId}`).boundingClientRect((rect) => {
            if (rect && rect.width && rect.height) {
                canvasWidthPx.value = Math.floor(rect.width)
                canvasHeightPx.value = Math.floor(rect.height)
            }
            resolve()
        }).exec()
    })
}

/* ---------- 绘制 ---------- */
function draw() {
    if (props.loading || isEmpty.value) return
    if (!canvasWidthPx.value || !canvasHeightPx.value) return

    const ctx = uni.createCanvasContext(props.canvasId, instance.proxy)
    const W = canvasWidthPx.value
    const H = canvasHeightPx.value

    // 内边距
    const padding = { top: 24, right: 16, bottom: 36, left: 44 }
    const plotW = W - padding.left - padding.right
    const plotH = H - padding.top - padding.bottom

    // 计算 Y 轴范围
    let yMin = Infinity
    let yMax = -Infinity
    for (const s of seriesNormalized.value) {
        for (const v of s.data) {
            if (v === null || v === undefined) continue
            const n = Number(v)
            if (!Number.isFinite(n)) continue
            if (n < yMin) yMin = n
            if (n > yMax) yMax = n
        }
    }
    if (!Number.isFinite(yMin) || !Number.isFinite(yMax)) {
        yMin = 0; yMax = 1
    }
    if (yMin === yMax) {
        // 平直线情况，给 ±1 余量
        yMin = yMin - 1
        yMax = yMax + 1
    }
    // 给上下各留 5% 余量
    const pad = (yMax - yMin) * 0.08
    yMin -= pad
    yMax += pad

    // 背景
    ctx.setFillStyle('#16161e')
    ctx.fillRect(0, 0, W, H)

    // Y 轴网格 + 刻度（4 段）
    const ySteps = 4
    ctx.setStrokeStyle('rgba(255,255,255,0.06)')
    ctx.setLineWidth(1)
    ctx.setFontSize(10)
    ctx.setFillStyle('#6b7280')
    ctx.setTextAlign('right')
    ctx.setTextBaseline('middle')
    for (let i = 0; i <= ySteps; i++) {
        const y = padding.top + (plotH * i) / ySteps
        const value = yMax - ((yMax - yMin) * i) / ySteps
        // 网格
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(padding.left + plotW, y)
        ctx.stroke()
        // 标签
        const label = props.yFormatter ? props.yFormatter(value) : value.toFixed(1)
        ctx.fillText(String(label), padding.left - 6, y)
    }

    // X 轴标签（最多 6 个均匀采样）
    const cats = props.categories || []
    if (cats.length > 0) {
        const maxLabels = 6
        const step = Math.max(1, Math.ceil(cats.length / maxLabels))
        ctx.setTextAlign('center')
        ctx.setTextBaseline('top')
        ctx.setFillStyle('#6b7280')
        for (let i = 0; i < cats.length; i += step) {
            const x = padding.left + (cats.length === 1 ? plotW / 2 : (plotW * i) / (cats.length - 1))
            ctx.fillText(String(cats[i] ?? ''), x, padding.top + plotH + 6)
        }
    }

    // 绘制每一组 series
    for (const s of seriesNormalized.value) {
        const data = s.data || []
        if (data.length === 0) continue

        // 路径
        ctx.beginPath()
        ctx.setStrokeStyle(s.color)
        ctx.setLineWidth(2)
        let started = false
        for (let i = 0; i < data.length; i++) {
            const v = data[i]
            if (v === null || v === undefined) continue
            const n = Number(v)
            if (!Number.isFinite(n)) continue
            const x = padding.left + (data.length === 1 ? plotW / 2 : (plotW * i) / (data.length - 1))
            const y = padding.top + plotH - ((n - yMin) / (yMax - yMin)) * plotH
            if (!started) {
                ctx.moveTo(x, y)
                started = true
            } else {
                ctx.lineTo(x, y)
            }
        }
        ctx.stroke()

        // 数据点
        ctx.setFillStyle(s.color)
        for (let i = 0; i < data.length; i++) {
            const v = data[i]
            if (v === null || v === undefined) continue
            const n = Number(v)
            if (!Number.isFinite(n)) continue
            const x = padding.left + (data.length === 1 ? plotW / 2 : (plotW * i) / (data.length - 1))
            const y = padding.top + plotH - ((n - yMin) / (yMax - yMin)) * plotH
            ctx.beginPath()
            ctx.arc(x, y, 2.5, 0, 2 * Math.PI)
            ctx.fill()
        }
    }

    ctx.draw()
}

async function redraw() {
    await nextTick()
    await measure()
    draw()
}

onMounted(() => {
    redraw()
})

watch(
    () => [props.categories, props.series, props.loading, props.empty, props.height],
    () => { redraw() },
    { deep: true },
)

defineExpose({ redraw })
</script>

<template>
    <view class="chart-wrap" :style="{ height: heightStyle }">
        <!-- legend -->
        <view v-if="!loading && !isEmpty" class="legend">
            <view
                v-for="(s, i) in seriesNormalized"
                :key="i"
                class="legend-item"
            >
                <text class="dot" :style="{ background: s.color }"></text>
                <text class="legend-label">{{ s.name }}</text>
            </view>
        </view>

        <view :id="`wrap-${canvasId}`" class="canvas-wrap">
            <canvas
                v-if="!loading && !isEmpty"
                :canvas-id="canvasId"
                :id="canvasId"
                class="canvas"
            />
            <view v-else-if="loading" class="placeholder">
                <text class="ph-text">加载中…</text>
            </view>
            <view v-else class="placeholder">
                <text class="ph-emoji">📈</text>
                <text class="ph-text">暂无数据</text>
            </view>
        </view>
    </view>
</template>

<style lang="scss" scoped>
.chart-wrap {
    width: 100%;
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-radius: 16rpx;
    padding: 16rpx;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}

.legend {
    display: flex;
    flex-wrap: wrap;
    gap: 24rpx;
    padding: 0 8rpx 8rpx;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 8rpx;
}

.dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    display: inline-block;
}

.legend-label {
    font-size: 22rpx;
    color: #9ca3af;
    letter-spacing: 1rpx;
}

.canvas-wrap {
    flex: 1;
    width: 100%;
    min-height: 0;
    position: relative;
}

.canvas {
    width: 100%;
    height: 100%;
}

.placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
}

.ph-emoji {
    font-size: 48rpx;
}

.ph-text {
    font-size: 24rpx;
    color: #6b7280;
    letter-spacing: 1rpx;
}
</style>
