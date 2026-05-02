<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useAiChatStore } from '@/store/ai-chat'
import { health as aiHealth } from '@/api/ai'
import ChatBubble from '@/components/chat-bubble.vue'

const store = useAiChatStore()

/* ========== AI 健康状态 ==========
 *  status:
 *    'idle'        未检测
 *    'checking'    检测中
 *    'ok'          可用
 *    'unavailable' 不可用（key 未加载 / ok=false）
 *    'error'       请求失败
 */
const aiStatus = ref('idle')
const aiModel = ref('')
const aiMessage = ref('')

async function checkAiHealth() {
    if (aiStatus.value === 'checking') return
    aiStatus.value = 'checking'
    aiMessage.value = ''
    try {
        const res = await aiHealth()
        aiModel.value = (res && res.model) || ''
        if (res && res.ok && res.key_loaded) {
            aiStatus.value = 'ok'
            aiMessage.value = (res && res.message) || 'AI 服务已就绪'
        } else {
            aiStatus.value = 'unavailable'
            aiMessage.value = (res && res.message) || 'AI 服务暂不可用'
        }
    } catch (err) {
        aiStatus.value = 'error'
        aiMessage.value = (err && err.message) || '健康检查失败'
    }
}

const aiStatusText = computed(() => {
    switch (aiStatus.value) {
        case 'checking': return '检测中…'
        case 'ok': return '可用'
        case 'unavailable': return '不可用'
        case 'error': return '检测失败'
        default: return '未检测'
    }
})

const aiStatusTone = computed(() => {
    switch (aiStatus.value) {
        case 'ok': return 'cyan'
        case 'checking': return 'slate'
        case 'unavailable':
        case 'error': return 'rose'
        default: return 'slate'
    }
})

/* ========== 推荐问题（首次或清空后展示） ========== */
const SUGGESTIONS = [
    '当前系统运行状态怎么样？',
    '哪些站点需要优先处理？',
    '当前有多少满桩风险？',
    '数据是否新鲜？',
]

const showSuggestions = computed(() =>
    !store.isLoading && (store.messages || []).length === 0,
)

/* ========== 输入区 ========== */
const inputText = ref('')

const canSend = computed(
    () => !store.isLoading && inputText.value.trim().length > 0,
)

async function sendCurrent() {
    if (!canSend.value) return
    const text = inputText.value
    inputText.value = ''
    await store.send(text)
}

async function sendSuggestion(text) {
    if (store.isLoading) return
    await store.send(text)
}

/* ========== 清空 ========== */
function onClearTap() {
    if (store.messages.length === 0 && !store.isLoading) {
        uni.showToast({ title: '没有可清空的对话', icon: 'none' })
        return
    }
    uni.showModal({
        title: '清空对话',
        content: '将清空当前对话历史并删除本地缓存，确定继续？',
        confirmText: '清空',
        confirmColor: '#fb7185',
        success: (res) => {
            if (res.confirm) {
                store.clear()
                uni.showToast({ title: '已清空', icon: 'none' })
            }
        },
    })
}

/* ========== 自动滚动到底 ========== */
const scrollIntoView = ref('')

async function scrollToBottom() {
    await nextTick()
    if (store.isLoading) {
        scrollIntoView.value = 'loading-anchor'
        return
    }
    const list = store.messages
    if (!list || list.length === 0) {
        scrollIntoView.value = ''
        return
    }
    scrollIntoView.value = `msg-${list[list.length - 1].id}`
}

watch(
    () => [store.messages.length, store.isLoading],
    () => { scrollToBottom() },
)

/* ========== 生命周期 ========== */
onLoad(() => {
    store.loadFromStorage()
    checkAiHealth()
    scrollToBottom()
})

onShow(() => {
    // 进页面再次滚动到底（tabBar 切回）
    scrollToBottom()
})
</script>

<template>
    <view class="page">
        <!-- 顶部：标题 + 清空 -->
        <view class="header">
            <view class="header-text">
                <text class="title">AI 运营助手</text>
                <text class="subtitle">基于当前运营数据回答问题</text>
            </view>
            <view
                class="clear-btn"
                hover-class="clear-hover"
                @click="onClearTap"
            >
                <text class="clear-icon">🗑</text>
                <text class="clear-label">清空</text>
            </view>
        </view>

        <!-- AI 健康状态卡 -->
        <view class="card status-card">
            <view class="status-row">
                <view class="status-left">
                    <view class="status-dot" :class="`dot-${aiStatusTone}`" />
                    <view class="status-text">
                        <text class="status-title">AI 服务：{{ aiStatusText }}</text>
                        <text v-if="aiModel" class="status-sub">模型 {{ aiModel }}</text>
                        <text v-if="aiMessage" class="status-sub">{{ aiMessage }}</text>
                    </view>
                </view>
                <view
                    class="check-btn"
                    :class="{ 'check-loading': aiStatus === 'checking' }"
                    hover-class="check-hover"
                    @click="checkAiHealth"
                >
                    <text class="check-label">检测 AI 服务</text>
                </view>
            </view>
        </view>

        <!-- 主体：消息列表（fill 余下空间） -->
        <scroll-view
            class="messages"
            scroll-y
            :scroll-into-view="scrollIntoView"
            :scroll-with-animation="true"
            :enhanced="true"
            :show-scrollbar="false"
        >
            <!-- 推荐问题（无消息时） -->
            <view v-if="showSuggestions" class="suggest-block">
                <view class="suggest-card">
                    <text class="suggest-title">试试这些问题</text>
                    <view class="suggest-list">
                        <view
                            v-for="(s, i) in SUGGESTIONS"
                            :key="i"
                            class="suggest-item"
                            hover-class="suggest-hover"
                            @click="sendSuggestion(s)"
                        >
                            <text class="suggest-text">{{ s }}</text>
                            <text class="suggest-arrow">›</text>
                        </view>
                    </view>
                    <text class="suggest-hint">点击即发送，AI 会基于当前后端数据回答</text>
                </view>
            </view>

            <!-- 消息气泡 -->
            <view
                v-for="msg in store.messages"
                :key="msg.id"
                :id="`msg-${msg.id}`"
                class="msg-row"
            >
                <chat-bubble :message="msg" />
            </view>

            <!-- loading 占位气泡 -->
            <view v-if="store.isLoading" id="loading-anchor" class="msg-row">
                <view class="loading-row">
                    <view class="avatar avatar-loading">
                        <text class="avatar-emoji">🤖</text>
                    </view>
                    <view class="loading-bubble">
                        <text class="loading-dots">●●●</text>
                        <text class="loading-text">AI 正在分析…</text>
                    </view>
                </view>
            </view>

            <!-- 末尾留白，避免被输入框遮挡 -->
            <view class="scroll-end-spacer" />
        </scroll-view>

        <!-- 输入区 -->
        <view class="input-bar">
            <view class="input-wrap">
                <textarea
                    class="input"
                    v-model="inputText"
                    auto-height
                    placeholder="向 AI 提问运营问题…"
                    placeholder-class="input-ph"
                    :maxlength="500"
                    :show-confirm-bar="false"
                    :adjust-position="true"
                    :cursor-spacing="20"
                    :disabled="store.isLoading"
                />
            </view>
            <view
                class="send-btn"
                :class="{ 'send-disabled': !canSend }"
                hover-class="send-hover"
                @click="sendCurrent"
            >
                <text class="send-label">{{ store.isLoading ? '发送中…' : '发送' }}</text>
            </view>
        </view>
    </view>
</template>

<style lang="scss">
page {
    height: 100%;
    background: #0a0a0f;
}

.page {
    height: 100vh;
    background: #0a0a0f;
    padding: 24rpx 32rpx 0;
    display: flex;
    flex-direction: column;
    gap: 14rpx;
    box-sizing: border-box;
}

/* ===== Header ===== */
.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
    padding: 8rpx 0 0;
    flex: 0 0 auto;
}

.header-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
}

.title {
    font-size: 36rpx;
    color: #f3f4f6;
    font-weight: 600;
    letter-spacing: 1rpx;
}

.subtitle {
    font-size: 22rpx;
    color: #6b7280;
    letter-spacing: 1rpx;
}

.clear-btn {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 12rpx 22rpx;
    background: rgba(239, 68, 68, 0.06);
    border: 1rpx solid rgba(239, 68, 68, 0.25);
    border-radius: 999rpx;
    transition: all 0.2s;
}

.clear-hover {
    background: rgba(239, 68, 68, 0.15);
}

.clear-icon {
    font-size: 24rpx;
    line-height: 1;
}

.clear-label {
    font-size: 22rpx;
    color: #fca5a5;
    letter-spacing: 1rpx;
}

/* ===== Status Card ===== */
.card {
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-radius: 18rpx;
}

.status-card {
    flex: 0 0 auto;
    padding: 16rpx 22rpx;
}

.status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
}

.status-left {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 14rpx;
}

.status-dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    flex: 0 0 auto;
}

.dot-cyan { background: #00d4ff; box-shadow: 0 0 8rpx rgba(0, 212, 255, 0.6); }
.dot-rose { background: #fb7185; box-shadow: 0 0 8rpx rgba(251, 113, 133, 0.5); }
.dot-slate { background: #6b7280; }

.status-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2rpx;
}

.status-title {
    font-size: 24rpx;
    color: #e5e7eb;
    font-weight: 500;
    letter-spacing: 1rpx;
}

.status-sub {
    font-size: 20rpx;
    color: #9ca3af;
    word-break: break-all;
}

.check-btn {
    flex: 0 0 auto;
    padding: 10rpx 18rpx;
    background: rgba(0, 212, 255, 0.08);
    border: 1rpx solid rgba(0, 212, 255, 0.3);
    border-radius: 999rpx;
}

.check-hover {
    background: rgba(0, 212, 255, 0.15);
}

.check-loading {
    opacity: 0.6;
}

.check-label {
    font-size: 22rpx;
    color: #00d4ff;
    letter-spacing: 1rpx;
}

/* ===== Messages ===== */
.messages {
    flex: 1 1 auto;
    min-height: 0;
    background: transparent;
    padding: 4rpx 0 8rpx;
    box-sizing: border-box;
}

.msg-row {
    display: flex;
    flex-direction: column;
    padding: 6rpx 0;
}

/* 推荐问题 */
.suggest-block {
    padding: 16rpx 0 12rpx;
}

.suggest-card {
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.06);
    border-radius: 18rpx;
    padding: 22rpx 22rpx;
    display: flex;
    flex-direction: column;
    gap: 14rpx;
}

.suggest-title {
    font-size: 26rpx;
    color: #e5e7eb;
    font-weight: 500;
    letter-spacing: 1rpx;
}

.suggest-list {
    display: flex;
    flex-direction: column;
    gap: 10rpx;
}

.suggest-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12rpx;
    padding: 14rpx 18rpx;
    background: rgba(0, 212, 255, 0.05);
    border: 1rpx solid rgba(0, 212, 255, 0.18);
    border-radius: 12rpx;
    transition: all 0.2s;
}

.suggest-hover {
    background: rgba(0, 212, 255, 0.12);
}

.suggest-text {
    font-size: 26rpx;
    color: #e0f7ff;
    flex: 1;
    min-width: 0;
    word-break: break-word;
}

.suggest-arrow {
    font-size: 28rpx;
    color: #00d4ff;
    line-height: 1;
}

.suggest-hint {
    font-size: 20rpx;
    color: #6b7280;
    line-height: 1.5;
    text-align: center;
}

/* ===== Loading bubble ===== */
.loading-row {
    display: flex;
    align-items: flex-start;
    gap: 14rpx;
}

.avatar {
    flex: 0 0 auto;
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: rgba(0, 212, 255, 0.12);
    border: 1rpx solid rgba(0, 212, 255, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
}

.avatar-loading {
    background: rgba(0, 212, 255, 0.08);
    border-color: rgba(0, 212, 255, 0.2);
}

.avatar-emoji {
    font-size: 28rpx;
    line-height: 1;
}

.loading-bubble {
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.08);
    border-radius: 18rpx;
    border-top-left-radius: 6rpx;
    padding: 18rpx 22rpx;
    display: flex;
    align-items: center;
    gap: 10rpx;
}

.loading-dots {
    font-size: 18rpx;
    color: #00d4ff;
    letter-spacing: 4rpx;
    animation: pulse 1.4s ease-in-out infinite;
}

.loading-text {
    font-size: 24rpx;
    color: #9ca3af;
    letter-spacing: 1rpx;
}

@keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
}

.scroll-end-spacer {
    height: 24rpx;
}

/* ===== Input Bar ===== */
.input-bar {
    flex: 0 0 auto;
    padding: 12rpx 0 calc(12rpx + env(safe-area-inset-bottom));
    background: #0a0a0f;
    border-top: 1rpx solid rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: flex-end;
    gap: 12rpx;
}

.input-wrap {
    flex: 1;
    min-width: 0;
    background: #16161e;
    border: 1rpx solid rgba(255, 255, 255, 0.08);
    border-radius: 18rpx;
    padding: 14rpx 18rpx;
    box-sizing: border-box;
}

.input {
    width: 100%;
    min-height: 56rpx;
    max-height: 240rpx;
    font-size: 28rpx;
    color: #f3f4f6;
    line-height: 1.5;
    background: transparent;
}

.input-ph {
    color: #4b5563;
    font-size: 26rpx;
}

.send-btn {
    flex: 0 0 auto;
    padding: 18rpx 28rpx;
    background: linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%);
    border-radius: 18rpx;
    box-shadow: 0 8rpx 18rpx rgba(0, 212, 255, 0.18);
    transition: opacity 0.2s, transform 0.1s;
}

.send-hover {
    transform: translateY(1rpx);
}

.send-disabled {
    opacity: 0.45;
    box-shadow: none;
}

.send-label {
    font-size: 26rpx;
    color: #0a0a0f;
    font-weight: 600;
    letter-spacing: 1rpx;
}
</style>
