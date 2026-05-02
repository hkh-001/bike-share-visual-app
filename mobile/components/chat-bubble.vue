<script setup>
import { computed } from 'vue'
import { formatRelativeTime, formatDateTime } from '@/utils/format'

/**
 * 聊天气泡
 *
 * Props:
 *   - message: { id, role, content, created_at }
 *     role:
 *       - user      右侧 cyan 气泡
 *       - assistant 左侧深色卡片
 *       - error     左侧红色错误气泡
 *
 * 渲染策略：
 *   - 纯文本展示，保留 emoji 和换行；
 *   - 不解析 Markdown；
 *   - 不引入 mp-html。
 */

const props = defineProps({
    message: { type: Object, required: true },
})

const m = computed(() => props.message || {})

const role = computed(() => {
    const r = m.value.role
    if (r === 'user' || r === 'assistant' || r === 'error') return r
    return 'assistant'
})

const isUser = computed(() => role.value === 'user')
const isAssistant = computed(() => role.value === 'assistant')
const isError = computed(() => role.value === 'error')

const content = computed(() =>
    typeof m.value.content === 'string' ? m.value.content : '',
)

const createdAt = computed(() => m.value.created_at || null)
const timeRel = computed(() => formatRelativeTime(createdAt.value))
const timeFull = computed(() => formatDateTime(createdAt.value))

const roleLabel = computed(() => {
    if (isUser.value) return '我'
    if (isError.value) return '错误'
    return 'AI'
})
</script>

<template>
    <view class="row" :class="{ 'row-right': isUser, 'row-left': !isUser }">
        <!-- 左侧（assistant / error）头像 -->
        <view v-if="!isUser" class="avatar" :class="{ 'avatar-error': isError }">
            <text class="avatar-emoji">{{ isError ? '⚠️' : '🤖' }}</text>
        </view>

        <view class="bubble-wrap" :class="{ 'wrap-right': isUser }">
            <view class="meta" :class="{ 'meta-right': isUser }">
                <text class="role-label">{{ roleLabel }}</text>
                <text class="time" :title="timeFull">{{ timeRel }}</text>
            </view>
            <view
                class="bubble"
                :class="{
                    'bubble-user': isUser,
                    'bubble-assistant': isAssistant,
                    'bubble-error': isError,
                }"
            >
                <text class="content" selectable>{{ content }}</text>
            </view>
        </view>

        <!-- 右侧（user）头像 -->
        <view v-if="isUser" class="avatar avatar-user">
            <text class="avatar-emoji">🙂</text>
        </view>
    </view>
</template>

<style lang="scss" scoped>
.row {
    display: flex;
    align-items: flex-start;
    gap: 14rpx;
    padding: 6rpx 0;
}

.row-left {
    justify-content: flex-start;
}

.row-right {
    justify-content: flex-end;
}

/* avatar */
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
    margin-top: 32rpx; /* 与 meta 对齐到气泡顶部 */
}

.avatar-user {
    background: rgba(0, 212, 255, 0.18);
    border-color: rgba(0, 212, 255, 0.4);
}

.avatar-error {
    background: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.3);
}

.avatar-emoji {
    font-size: 28rpx;
    line-height: 1;
}

/* bubble container */
.bubble-wrap {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    max-width: 76%;
    min-width: 0;
}

.wrap-right {
    align-items: flex-end;
}

.meta {
    display: flex;
    align-items: baseline;
    gap: 10rpx;
    padding: 0 6rpx;
}

.meta-right {
    flex-direction: row-reverse;
}

.role-label {
    font-size: 20rpx;
    color: #6b7280;
    letter-spacing: 1rpx;
}

.time {
    font-size: 20rpx;
    color: #4b5563;
}

/* bubble */
.bubble {
    padding: 18rpx 22rpx;
    border-radius: 18rpx;
    border: 1rpx solid transparent;
}

.bubble-user {
    background: linear-gradient(135deg, rgba(0, 212, 255, 0.18) 0%, rgba(0, 168, 204, 0.16) 100%);
    border-color: rgba(0, 212, 255, 0.35);
    border-top-right-radius: 6rpx;
}

.bubble-assistant {
    background: #16161e;
    border-color: rgba(255, 255, 255, 0.08);
    border-top-left-radius: 6rpx;
}

.bubble-error {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.3);
    border-top-left-radius: 6rpx;
}

/* content：保留换行 + 自动换行 */
.content {
    font-size: 28rpx;
    line-height: 1.55;
    color: #f3f4f6;
    word-break: break-word;
    white-space: pre-wrap;
}

.bubble-user .content {
    color: #e0f7ff;
}

.bubble-error .content {
    color: #fca5a5;
}
</style>
