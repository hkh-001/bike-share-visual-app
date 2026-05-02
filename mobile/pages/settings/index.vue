<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/store/settings'
import { health } from '@/api/dashboard'

const settings = useSettingsStore()

const apiInput = ref('')
const status = ref('idle')
const errorMsg = ref('')
const savedHint = ref('')

onMounted(() => {
    apiInput.value = settings.apiBaseUrl
})

const statusLabel = computed(() => {
    switch (status.value) {
        case 'testing': return '⏳ 测试中...'
        case 'online': return '✅ 后端在线'
        case 'offline': return '❌ 连接失败'
        default: return '⚪ 未测试'
    }
})

function onSave() {
    const trimmed = (apiInput.value || '').trim()
    if (!trimmed) {
        uni.showToast({ title: 'API 地址不能为空', icon: 'none' })
        return
    }
    if (!/^https?:\/\//i.test(trimmed)) {
        uni.showToast({
            title: '需以 http:// 或 https:// 开头',
            icon: 'none',
            duration: 2500,
        })
        return
    }
    settings.setApiBaseUrl(trimmed)
    apiInput.value = settings.apiBaseUrl
    savedHint.value = '✅ 已保存到本地'
    setTimeout(() => { savedHint.value = '' }, 2000)
}

async function onTest() {
    if (status.value === 'testing') return
    // 测试前先保存当前输入（避免用户改了不点保存就测试）
    const trimmed = (apiInput.value || '').trim()
    if (trimmed && /^https?:\/\//i.test(trimmed)) {
        settings.setApiBaseUrl(trimmed)
    }

    status.value = 'testing'
    errorMsg.value = ''
    try {
        const res = await health()
        status.value = 'online'
        uni.showToast({ title: '后端在线', icon: 'success' })
    } catch (err) {
        status.value = 'offline'
        errorMsg.value = (err && err.message) || '未知错误'
        uni.showToast({ title: '连接失败', icon: 'none' })
    }
}

function goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
        uni.navigateBack({ delta: 1 })
    } else {
        uni.switchTab({ url: '/pages/index/index' })
    }
}

function onReset() {
    uni.showModal({
        title: '重置设置',
        content: '将恢复 API 地址、主题、刷新间隔为默认值。是否继续？',
        success: (r) => {
            if (r.confirm) {
                settings.reset()
                apiInput.value = settings.apiBaseUrl
                status.value = 'idle'
                errorMsg.value = ''
                savedHint.value = '✅ 已重置'
                setTimeout(() => { savedHint.value = '' }, 2000)
            }
        },
    })
}
</script>

<template>
    <view class="page">
        <view class="main">
            <!-- API 地址 -->
            <view class="card">
                <view class="card-header">
                    <text class="card-label">后端 API 地址</text>
                </view>

                <view class="form-group">
                    <input
                        class="input"
                        v-model="apiInput"
                        placeholder="http://192.168.x.x:8765"
                        placeholder-class="input-placeholder"
                        confirm-type="done"
                    />
                    <text class="hint">不要带 /api 前缀。例如：http://192.168.0.105:8765</text>
                </view>

                <view class="actions">
                    <button class="btn btn-primary" @click="onSave">保存</button>
                    <button
                        class="btn btn-outline"
                        :disabled="status === 'testing'"
                        @click="onTest"
                    >
                        {{ status === 'testing' ? '测试中...' : '测试连接' }}
                    </button>
                </view>

                <view v-if="savedHint" class="saved-hint">{{ savedHint }}</view>
            </view>

            <!-- 连接状态 -->
            <view class="card">
                <view class="card-header">
                    <text class="card-label">连接状态</text>
                </view>
                <view class="status-row">
                    <text class="status-text" :class="`s-${status}`">{{ statusLabel }}</text>
                </view>
                <view v-if="errorMsg" class="error-box">
                    <text class="error-title">错误信息</text>
                    <text class="error-text" selectable>{{ errorMsg }}</text>
                </view>
            </view>

            <!-- 应用信息 -->
            <view class="card">
                <view class="card-header">
                    <text class="card-label">应用信息</text>
                </view>
                <view class="info-row">
                    <text class="info-key">应用名</text>
                    <text class="info-value">BikeGuard</text>
                </view>
                <view class="info-row">
                    <text class="info-key">版本</text>
                    <text class="info-value">0.1.0 (Mobile M0)</text>
                </view>
                <view class="info-row">
                    <text class="info-key">主题</text>
                    <text class="info-value">{{ settings.theme }}</text>
                </view>
                <view class="info-row">
                    <text class="info-key">刷新间隔</text>
                    <text class="info-value">{{ Math.round(settings.refreshInterval / 1000) }}s</text>
                </view>
            </view>

            <!-- 操作 -->
            <view class="bottom-actions">
                <button class="btn btn-ghost" @click="goBack">返回首页</button>
                <button class="btn btn-danger-outline" @click="onReset">恢复默认设置</button>
            </view>

            <!-- 文档提示 -->
            <view class="doc-card">
                <text class="doc-title">💡 配置说明</text>
                <text class="doc-line">1. 后端必须用 <text class="mono">--host 0.0.0.0</text> 启动</text>
                <text class="doc-line">2. 手机和电脑必须在同一 Wi-Fi 下</text>
                <text class="doc-line">3. 电脑 IPv4 地址通过 <text class="mono">ipconfig</text> 查看</text>
                <text class="doc-line">4. 防火墙需放行 8765 端口</text>
            </view>
        </view>
    </view>
</template>

<style lang="scss">
.page {
    min-height: 100vh;
    background: #0a0a0f;
}

.main {
    padding: 24rpx 32rpx 60rpx;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

/* ========== 卡片 ========== */
.card {
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-radius: 24rpx;
    padding: 32rpx;
}

.card-header {
    margin-bottom: 24rpx;
    padding-bottom: 16rpx;
    border-bottom: 1rpx solid rgba(255, 255, 255, 0.04);
}

.card-label {
    font-size: 24rpx;
    color: #9ca3af;
    letter-spacing: 2rpx;
    text-transform: uppercase;
}

/* ========== 表单 ========== */
.form-group {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
    margin-bottom: 24rpx;
}

.input {
    background: #0a0a0f;
    border: 1rpx solid rgba(255, 255, 255, 0.1);
    border-radius: 14rpx;
    padding: 0 24rpx;
    height: 88rpx;
    font-size: 28rpx;
    color: #e5e7eb;
    font-family: 'SF Mono', 'Menlo', monospace;
}

.input-placeholder {
    color: #4b5563;
}

.hint {
    font-size: 22rpx;
    color: #6b7280;
    line-height: 1.5;
}

/* ========== 按钮 ========== */
.actions {
    display: flex;
    gap: 16rpx;
}

.btn {
    flex: 1;
    height: 80rpx;
    line-height: 80rpx;
    border-radius: 14rpx;
    font-size: 26rpx;
    margin: 0;
    padding: 0;
    border: none;
}

.btn::after {
    border: none;
}

.btn-primary {
    background: linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%);
    color: #0a0a0f;
    font-weight: 500;
    box-shadow: 0 4rpx 16rpx rgba(0, 212, 255, 0.18);
}

.btn-primary[disabled] {
    background: #2a2a35;
    color: #6b7280;
    box-shadow: none;
}

.btn-outline {
    background: transparent;
    color: #00d4ff;
    border: 1rpx solid rgba(0, 212, 255, 0.3);
}

.btn-outline[disabled] {
    color: #6b7280;
    border-color: rgba(255, 255, 255, 0.1);
}

.btn-ghost {
    background: rgba(255, 255, 255, 0.04);
    color: #9ca3af;
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    height: 88rpx;
    line-height: 88rpx;
    border-radius: 16rpx;
    font-size: 28rpx;
}

.btn-danger-outline {
    background: transparent;
    color: #ef4444;
    border: 1rpx solid rgba(239, 68, 68, 0.3);
    height: 88rpx;
    line-height: 88rpx;
    border-radius: 16rpx;
    font-size: 28rpx;
}

.bottom-actions {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.saved-hint {
    margin-top: 16rpx;
    text-align: center;
    font-size: 24rpx;
    color: #10b981;
}

/* ========== 状态展示 ========== */
.status-row {
    padding: 8rpx 0;
}

.status-text {
    font-size: 30rpx;
    font-weight: 500;
}

.s-idle { color: #9ca3af; }
.s-testing { color: #f59e0b; }
.s-online { color: #10b981; }
.s-offline { color: #ef4444; }

.error-box {
    margin-top: 20rpx;
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
    word-break: break-all;
}

/* ========== 应用信息 ========== */
.info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14rpx 0;
    border-bottom: 1rpx solid rgba(255, 255, 255, 0.03);
}

.info-row:last-child {
    border-bottom: none;
}

.info-key {
    font-size: 26rpx;
    color: #9ca3af;
}

.info-value {
    font-size: 26rpx;
    color: #e5e7eb;
    font-family: 'SF Mono', 'Menlo', monospace;
}

/* ========== 文档卡 ========== */
.doc-card {
    background: rgba(0, 212, 255, 0.03);
    border: 1rpx solid rgba(0, 212, 255, 0.12);
    border-radius: 18rpx;
    padding: 24rpx;
    display: flex;
    flex-direction: column;
    gap: 10rpx;
}

.doc-title {
    font-size: 24rpx;
    color: #00d4ff;
    margin-bottom: 8rpx;
    font-weight: 500;
}

.doc-line {
    font-size: 22rpx;
    color: #9ca3af;
    line-height: 1.6;
}

.mono {
    font-family: 'SF Mono', 'Menlo', monospace;
    color: #c4b5fd;
    background: rgba(196, 181, 253, 0.06);
    padding: 0 6rpx;
    border-radius: 4rpx;
}
</style>
