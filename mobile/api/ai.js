/**
 * AI 接口
 *
 * 设计要点：
 *   - 完全复用 ./request 统一封装；
 *   - 不直连 Kimi，所有调用都走移动端 ↔ FastAPI ↔ Kimi；
 *   - apikey.txt 永远在后端，移动端绝不读取 / 存储 API Key；
 *   - chat() 默认 timeout 180000（kimi-k2.6 单次响应可能 30~120s，含工具调用）。
 */

import { get, post } from './request'

const DEFAULT_MODEL = 'kimi-k2.6'
const CHAT_TIMEOUT = 180_000

/**
 * AI 健康检查
 * GET /api/ai/health
 *
 * 后端返回 AiHealthResponse：
 *   { ok: bool, key_loaded: bool, model: string, message: string }
 *
 * @returns {Promise<{ ok:boolean, key_loaded:boolean, model:string, message:string }>}
 */
export function health() {
    return get('/api/ai/health')
}

/**
 * 非流式问答
 * POST /api/ai/chat
 *
 * 重要约束：
 *   - 仅发送 role=user/assistant 的消息（system prompt 由后端注入）；
 *   - 移动端只取最近 10 条作为上下文；
 *   - timeout = 180s，覆盖 request.js 默认 30s。
 *
 * 后端返回 ChatResponse：
 *   { role: 'assistant', content: string, finish_reason: 'stop'|'length'|'tool_calls' }
 *
 * @param {Array<{role:'user'|'assistant',content:string}>} messages
 * @param {object} [options]
 * @param {string} [options.model='kimi-k2.6']
 * @param {number} [options.timeout=180000]
 * @returns {Promise<{ role:string, content:string, finish_reason:string }>}
 */
export function chat(messages, options = {}) {
    const list = Array.isArray(messages) ? messages : []
    if (list.length === 0) {
        return Promise.reject(new Error('messages 不能为空'))
    }
    const model = options.model || DEFAULT_MODEL
    const timeout = options.timeout || CHAT_TIMEOUT
    return post(
        '/api/ai/chat',
        { messages: list, model },
        { timeout },
    )
}
