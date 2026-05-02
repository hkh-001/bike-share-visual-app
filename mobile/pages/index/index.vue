<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useSettingsStore } from '@/store/settings'
import { health } from '@/api/dashboard'

const settings = useSettingsStore()

// idle | testing | online | offline
const status = ref('idle')
const errorMsg = ref('')
const responsePreview = ref('')
const lastTestedAt = ref('')

const statusLabel = computed(() => {
    switch (status.value) {
        case 'testing': return '⏳ 连接中...'
        case 'online': return '✅ 后端在线'
        case 'offline': return '❌ 连接失败'
        default: return '⚪ 未测试'
    }
})

const statusClass = computed(() => `s-${status.value}`)

const displayBaseUrl = computed(() => settings.apiBaseUrl || '未配置')

// 获取状态栏高度（Android 顶部留白）
const statusBarHeight = ref(20)
onMounted(() => {
    try {
        const sys = uni.getSystemInfoSync()
        statusBarHeight.value = sys.statusBarHeight || 20
    } catch (e) {
        statusBarHeight.value = 20
    }
})

// 切回首页时不自动刷新，避免误判
onShow(() => {})

async function testConnection() {
    if (status.value === 'testing') return
    status.value = 'testing'
    errorMsg.value = ''
    responsePreview.value = ''
    try {
        const res = await health()
        status.value = 'online'
        responsePreview.value = JSON.stringify(res)
        lastTestedAt.value = formatTime(new Date())
    } catch (err) {
        status.value = 'offline'
        errorMsg.value = (err && err.message) || '未知错误'
        lastTestedAt.value = formatTime(new Date())
    }
}

function gotoSettings() {
    uni.navigateTo({ url: '/pages/settings/index' })
}

function formatTime(d) {
    const p = (n) => String(n).padStart(2, '0')
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
</script>

<template>
    <view class="page">
        <!-- 顶部栏（自定义） -->
        <view class="topbar" :style="{ paddingTop: (statusBarHeight + 16) + 'px' }">
            <view class="topbar-title">
                <text class="title">共享单车移动监控</text>
                <text class="subtitle">BIKEGUARD MOBILE</text>
            </view>
            <view class="topbar-action" @click="gotoSettings" hover-class="topbar-action-hover">
                <text class="settings-icon">⚙</text>
            </view>
        </view>

        <!-- 主体 -->
        <view class="main">
            <!-- 状态卡片 -->
            <view class="card">
                <view class="card-header">
                    <view class="card-label-row">
                        <view class="dot" :class="statusClass"></view>
                        <text class="card-label">后端连接</text>
                    </view>
                    <text v-if="lastTestedAt" class="card-time">{{ lastTestedAt }}</text>
                </view>

                <view class="card-body">
                    <view class="row">
                        <text class="row-label">API 地址</text>
                        <text class="row-value mono" selectable>{{ displayBaseUrl }}</text>
                    </view>
                    <view class="row">
                        <text class="row-label">连接状态</text>
                        <text class="row-value" :class="statusClass">{{ statusLabel }}</text>
                    </view>

                    <view v-if="errorMsg" class="error-box">
                        <text class="error-title">错误信息</text>
                        <text class="error-text" selectable>{{ errorMsg }}</text>
                    </view>

                    <view v-if="responsePreview" class="preview-box">
                        <text class="preview-title">响应预览</text>
                        <text class="preview-text mono" selectable>{{ responsePreview }}</text>
                    </view>
                </view>

                <view class="card-actions">
                    <button
                        class="btn btn-primary"
                        :disabled="status === 'testing'"
                        :loading="status === 'testing'"
                        @click="testConnection"
                    >
                        {{ status === 'testing' ? '测试中...' : '测试后端连接' }}
                    </button>
                </view>
            </view>

            <!-- M0 提示卡 -->
            <view class="card hint-card">
                <view class="hint-title">
                    <text class="hint-emoji">📱</text>
                    <text class="hint-title-text">当前为 Mobile M0 阶段</text>
                </view>
                <view class="hint-list">
                    <text class="hint-item">· 仅完成项目骨架与后端 health 调通</text>
                    <text class="hint-item">· 站点 / 告警 / 趋势 / AI 等功能将在 M1+ 实现</text>
                    <text class="hint-item">· 切换 Wi-Fi 后请到设置页更新 API 地址</text>
                </view>
            </view>

            <!-- 操作快捷区 -->
            <view class="card">
                <view class="card-header">
                    <view class="card-label-row">
                        <text class="card-label">快捷操作</text>
                    </view>
                </view>
                <view class="quick-grid">
                    <view class="quick-item" @click="gotoSettings" hover-class="quick-item-hover">
                        <text class="quick-icon">⚙</text>
                        <text class="quick-label">设置</text>
                    </view>
                    <view class="quick-item" @click="testConnection" hover-class="quick-item-hover">
                        <text class="quick-icon">🔌</text>
                        <text class="quick-label">测试连接</text>
                    </view>
                </view>
            </view>

            <!-- 版本信息 -->
            <view class="footer">
                <text class="footer-text">BikeGuard v0.1.0 · Mobile M0</text>
            </view>
        </view>
    </view>
</template>

<style lang="scss">
.page {
    min-height: 100vh;
    background: linear-gradient(180deg, #0a0a0f 0%, #0c0c14 100%);
    padding-bottom: 40rpx;
}

/* ========== 顶部栏 ========== */
.topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-left: 32rpx;
    padding-right: 32rpx;
    padding-bottom: 24rpx;
}

.topbar-title {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
}

.title {
    font-size: 36rpx;
    font-weight: 600;
    color: #e5e7eb;
    letter-spacing: 1rpx;
}

.subtitle {
    font-size: 20rpx;
    color: #6b7280;
    letter-spacing: 4rpx;
}

.topbar-action {
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 212, 255, 0.06);
    border: 1rpx solid rgba(0, 212, 255, 0.18);
    border-radius: 18rpx;
    transition: all 0.2s;
}

.topbar-action-hover {
    background: rgba(0, 212, 255, 0.12);
    border-color: rgba(0, 212, 255, 0.3);
}

.settings-icon {
    font-size: 36rpx;
    color: #00d4ff;
}

/* ========== 主体 ========== */
.main {
    padding: 16rpx 32rpx;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.card {
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-radius: 24rpx;
    padding: 32rpx;
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24rpx;
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid rgba(255, 255, 255, 0.04);
}

.card-label-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
}

.dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
    background: #6b7280;
}

.dot.s-idle { background: #6b7280; }
.dot.s-testing { background: #f59e0b; box-shadow: 0 0 12rpx rgba(245, 158, 11, 0.6); }
.dot.s-online { background: #10b981; box-shadow: 0 0 12rpx rgba(16, 185, 129, 0.6); }
.dot.s-offline { background: #ef4444; box-shadow: 0 0 12rpx rgba(239, 68, 68, 0.6); }

.card-label {
    font-size: 24rpx;
    color: #9ca3af;
    letter-spacing: 2rpx;
    text-transform: uppercase;
}

.card-time {
    font-size: 22rpx;
    color: #6b7280;
    font-family: 'Menlo', monospace;
}

.card-body {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.row {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.row-label {
    font-size: 22rpx;
    color: #6b7280;
    letter-spacing: 1rpx;
}

.row-value {
    font-size: 28rpx;
    color: #e5e7eb;
}

.row-value.mono {
    font-family: 'SF Mono', 'Menlo', monospace;
    word-break: break-all;
}

.row-value.s-idle { color: #9ca3af; }
.row-value.s-testing { color: #f59e0b; }
.row-value.s-online { color: #10b981; }
.row-value.s-offline { color: #ef4444; }

/* ========== 错误 / 预览 ========== */
.error-box {
    padding: 20rpx 24rpx;
    background: rgba(239, 68, 68, 0.06);
    border: 1rpx solid rgba(239, 68, 68, 0.2);
    border-radius: 14rpx;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.error-title {
    font-size: 22rpx;
    color: #ef4444;
    letter-spacing: 1rpx;
    text-transform: uppercase;
}

.error-text {
    font-size: 24rpx;
    color: #fca5a5;
    line-height: 1.5;
}

.preview-box {
    padding: 20rpx 24rpx;
    background: rgba(16, 185, 129, 0.05);
    border: 1rpx solid rgba(16, 185, 129, 0.18);
    border-radius: 14rpx;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.preview-title {
    font-size: 22rpx;
    color: #10b981;
    letter-spacing: 1rpx;
    text-transform: uppercase;
}

.preview-text {
    font-size: 22rpx;
    color: #6ee7b7;
    line-height: 1.5;
    word-break: break-all;
}

/* ========== 按钮 ========== */
.card-actions {
    margin-top: 24rpx;
}

.btn {
    width: 100%;
    height: 88rpx;
    line-height: 88rpx;
    border-radius: 16rpx;
    font-size: 28rpx;
    font-weight: 500;
    border: none;
    margin: 0;
    padding: 0;
}

.btn::after {
    border: none;
}

.btn-primary {
    background: linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%);
    color: #0a0a0f;
    box-shadow: 0 8rpx 24rpx rgba(0, 212, 255, 0.2);
}

.btn-primary[disabled] {
    background: #2a2a35;
    color: #6b7280;
    box-shadow: none;
}

/* ========== 提示卡 ========== */
.hint-card {
    background: rgba(0, 212, 255, 0.04);
    border: 1rpx solid rgba(0, 212, 255, 0.15);
}

.hint-title {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 16rpx;
}

.hint-emoji {
    font-size: 28rpx;
}

.hint-title-text {
    font-size: 26rpx;
    color: #00d4ff;
    font-weight: 500;
}

.hint-list {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.hint-item {
    font-size: 24rpx;
    color: #9ca3af;
    line-height: 1.6;
}

/* ========== 快捷区 ========== */
.quick-grid {
    display: flex;
    gap: 16rpx;
}

.quick-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    height: 144rpx;
    background: rgba(255, 255, 255, 0.02);
    border: 1rpx solid rgba(255, 255, 255, 0.05);
    border-radius: 16rpx;
    transition: all 0.2s;
}

.quick-item-hover {
    background: rgba(0, 212, 255, 0.04);
    border-color: rgba(0, 212, 255, 0.2);
}

.quick-icon {
    font-size: 40rpx;
}

.quick-label {
    font-size: 24rpx;
    color: #9ca3af;
}

/* ========== 底部 ========== */
.footer {
    display: flex;
    justify-content: center;
    margin-top: 24rpx;
}

.footer-text {
    font-size: 22rpx;
    color: #4b5563;
    letter-spacing: 2rpx;
}
</style>
