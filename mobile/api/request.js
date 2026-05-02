/**
 * 网络请求统一封装（基于 uni.request）
 *
 * 设计要点：
 *   - baseURL 从 settings store 动态读取，修改后立即生效；
 *   - 默认 GET，支持 POST / PUT / DELETE 等；
 *   - 自动 JSON Content-Type；
 *   - 默认超时 30s（AI 接口可在调用处覆盖）；
 *   - 状态码 200~299 视为成功，否则抛出携带 statusCode 的 Error。
 */

import { useSettingsStore } from '@/store/settings'

const DEFAULT_TIMEOUT = 30000

/**
 * 发起请求
 * @param {string} path  接口路径，建议以 /api 开头
 * @param {object} [options]  uni.request 风格选项
 * @param {string} [options.method]  HTTP 方法
 * @param {object|string} [options.data]  请求体
 * @param {object} [options.headers]  额外请求头
 * @param {number} [options.timeout]  超时（ms）
 * @returns {Promise<any>}  解析后的响应体
 */
export function request(path, options = {}) {
    const settings = useSettingsStore()
    const baseUrl = (settings.apiBaseUrl || '').replace(/\/+$/, '')

    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const url = `${baseUrl}${normalizedPath}`

    const method = (options.method || 'GET').toUpperCase()
    const data = options.data
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    }
    const timeout = options.timeout || DEFAULT_TIMEOUT

    return new Promise((resolve, reject) => {
        if (!baseUrl) {
            reject(new Error('未配置 API 地址，请先到设置页填写'))
            return
        }

        uni.request({
            url,
            method,
            data,
            header: headers,
            timeout,
            success: (res) => {
                const code = res.statusCode
                if (code >= 200 && code < 300) {
                    resolve(res.data)
                } else {
                    let msg = `请求失败：${code}`
                    if (res.data && typeof res.data === 'object') {
                        if (typeof res.data.detail === 'string') msg = res.data.detail
                        else if (typeof res.data.message === 'string') msg = res.data.message
                    }
                    const err = new Error(msg)
                    err.statusCode = code
                    err.body = res.data
                    reject(err)
                }
            },
            fail: (err) => {
                const e = new Error((err && err.errMsg) || '网络请求失败')
                e.cause = err
                reject(e)
            },
        })
    })
}

/** 快捷方法：GET */
export function get(path, options) {
    return request(path, { ...(options || {}), method: 'GET' })
}

/** 快捷方法：POST */
export function post(path, data, options) {
    return request(path, { ...(options || {}), method: 'POST', data })
}

/** 快捷方法：PUT */
export function put(path, data, options) {
    return request(path, { ...(options || {}), method: 'PUT', data })
}

/** 快捷方法：DELETE */
export function del(path, options) {
    return request(path, { ...(options || {}), method: 'DELETE' })
}
