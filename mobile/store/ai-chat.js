/**
 * AI 聊天 store
 *
 * 设计要点：
 *   - Pinia setup store，沿用 settings store 的写法；
 *   - 本地最多保留最近 50 条消息（含 user / assistant / error）；
 *   - 发送给后端时只取最近 10 条 user/assistant（不含 error），且不发送 system role；
 *   - storage key: 'bike-ai-chat-history'；
 *   - error 消息仅本地展示，绝不发回后端，避免污染上下文。
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { chat as chatApi } from '@/api/ai'

const STORAGE_KEY = 'bike-ai-chat-history'
const MAX_LOCAL_MESSAGES = 50
const CONTEXT_WINDOW = 10

function genId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function nowIso() {
    try {
        return new Date().toISOString()
    } catch (_) {
        return ''
    }
}

function normalizeMessage(raw) {
    if (!raw || typeof raw !== 'object') return null
    const role = raw.role
    if (role !== 'user' && role !== 'assistant' && role !== 'error') return null
    const content = typeof raw.content === 'string' ? raw.content : String(raw.content ?? '')
    return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : genId(),
        role,
        content,
        created_at: typeof raw.created_at === 'string' && raw.created_at ? raw.created_at : nowIso(),
    }
}

export const useAiChatStore = defineStore('ai-chat', () => {
    const messages = ref([])
    const isLoading = ref(false)

    /* ---------- 持久化 ---------- */

    function loadFromStorage() {
        try {
            const raw = uni.getStorageSync(STORAGE_KEY)
            if (Array.isArray(raw)) {
                const list = raw
                    .map(normalizeMessage)
                    .filter(Boolean)
                    .slice(-MAX_LOCAL_MESSAGES)
                messages.value = list
            }
        } catch (e) {
            console.warn('[ai-chat] load from storage failed:', e)
        }
    }

    function persist() {
        try {
            uni.setStorageSync(STORAGE_KEY, messages.value)
        } catch (e) {
            console.warn('[ai-chat] save to storage failed:', e)
        }
    }

    /* ---------- 写入 ---------- */

    function addMessage(message) {
        const m = normalizeMessage(message)
        if (!m) return null
        messages.value.push(m)
        // 截断到最近 MAX_LOCAL_MESSAGES 条
        if (messages.value.length > MAX_LOCAL_MESSAGES) {
            messages.value.splice(0, messages.value.length - MAX_LOCAL_MESSAGES)
        }
        persist()
        return m
    }

    function clear() {
        messages.value = []
        try {
            uni.removeStorageSync(STORAGE_KEY)
        } catch (e) {
            console.warn('[ai-chat] remove storage failed:', e)
        }
    }

    /* ---------- 发送 ---------- */

    /**
     * 取最近 N 条 user/assistant 作为后端上下文，永远不发 error / system。
     */
    function buildContext() {
        const onlyChat = messages.value.filter(
            (m) => m.role === 'user' || m.role === 'assistant',
        )
        const recent = onlyChat.slice(-CONTEXT_WINDOW)
        return recent.map((m) => ({ role: m.role, content: m.content }))
    }

    /**
     * 发送一条用户消息。
     *  1. 校验非空；
     *  2. 追加 user 消息（持久化）；
     *  3. 发起 chat 请求（最近 10 条上下文）；
     *  4. 成功 → 追加 assistant；失败 → 追加 error；
     *  5. 始终复位 isLoading。
     */
    async function send(content) {
        if (isLoading.value) return
        const text = typeof content === 'string' ? content.trim() : ''
        if (!text) return

        addMessage({ role: 'user', content: text })

        const context = buildContext()
        if (context.length === 0) {
            // 兜底：极端情况下 buildContext 为空（不应发生），手动塞当前 user
            context.push({ role: 'user', content: text })
        }

        isLoading.value = true
        try {
            const res = await chatApi(context)
            const replyRaw = (res && typeof res.content === 'string') ? res.content : ''
            const reply = replyRaw.trim() ? replyRaw : 'AI 未返回内容'
            addMessage({ role: 'assistant', content: reply })
        } catch (err) {
            const msg = (err && err.message) || '请求失败'
            addMessage({ role: 'error', content: `请求失败：${msg}` })
        } finally {
            isLoading.value = false
        }
    }

    return {
        messages,
        isLoading,
        loadFromStorage,
        persist,
        addMessage,
        clear,
        send,
    }
})
