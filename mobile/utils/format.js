/**
 * 通用格式化工具（移动端版本）
 *
 * 全部函数对 null / undefined / NaN / 非法字符串 友好，
 * 永远返回字符串占位 '--' 而不是抛异常 / 输出 'NaN'。
 */

const PLACEHOLDER = '--'

/**
 * 数字千分位
 * 2407       → "2,407"
 * 2407.5     → "2,407.5"
 * null/NaN   → "--"
 */
export function formatNumber(value) {
    if (value === null || value === undefined) return PLACEHOLDER
    const num = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(num)) return PLACEHOLDER
    try {
        return num.toLocaleString('en-US')
    } catch (_) {
        return String(num)
    }
}

/**
 * 百分比
 * 0.523, 1   → "52.3%"
 * 0.5234, 2  → "52.34%"
 * null/NaN   → "--"
 */
export function formatPercent(value, fractionDigits = 1) {
    if (value === null || value === undefined) return PLACEHOLDER
    const num = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(num)) return PLACEHOLDER
    return `${(num * 100).toFixed(fractionDigits)}%`
}

/**
 * 把任意输入解析为 Date（失败返回 null）
 */
function toDate(value) {
    if (!value) return null
    if (value instanceof Date) {
        return Number.isFinite(value.getTime()) ? value : null
    }
    if (typeof value === 'number') {
        // 既支持秒级时间戳，也支持毫秒级
        const ms = value < 1e12 ? value * 1000 : value
        const d = new Date(ms)
        return Number.isFinite(d.getTime()) ? d : null
    }
    if (typeof value === 'string') {
        // 后端 datetime 序列化通常带 'T' 但可能不带时区
        // 这里做一次最朴素的兼容：如果没有 'Z' / '+' / '-' 时区，按本地时间解析。
        const d = new Date(value)
        return Number.isFinite(d.getTime()) ? d : null
    }
    return null
}

const pad = (n) => String(n).padStart(2, '0')

/**
 * ISO / Date / 时间戳 → "YYYY-MM-DD HH:mm:ss"
 * null/无效         → "--"
 */
export function formatDateTime(value) {
    const d = toDate(value)
    if (!d) return PLACEHOLDER
    return (
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    )
}

/**
 * 仅日期 "YYYY-MM-DD"
 */
export function formatDate(value) {
    const d = toDate(value)
    if (!d) return PLACEHOLDER
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * 仅时间 "HH:mm:ss"
 */
export function formatTime(value) {
    const d = toDate(value)
    if (!d) return PLACEHOLDER
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * 相对时间
 *  < 60s        → "刚刚"
 *  < 60min      → "X 分钟前"
 *  < 24h        → "X 小时前"
 *  < 7d         → "X 天前"
 *  其它          → 回退为 formatDateTime()
 *  null/无效    → "--"
 */
export function formatRelativeTime(value) {
    const d = toDate(value)
    if (!d) return PLACEHOLDER

    const diffMs = Date.now() - d.getTime()
    if (!Number.isFinite(diffMs)) return PLACEHOLDER

    const absSec = Math.abs(diffMs) / 1000
    const future = diffMs < 0
    const suffix = future ? '后' : '前'

    if (absSec < 30) return '刚刚'
    if (absSec < 60) return `${Math.round(absSec)} 秒${suffix}`

    const min = absSec / 60
    if (min < 60) return `${Math.round(min)} 分钟${suffix}`

    const hr = min / 60
    if (hr < 24) return `${Math.round(hr)} 小时${suffix}`

    const day = hr / 24
    if (day < 7) return `${Math.round(day)} 天${suffix}`

    return formatDateTime(d)
}

/**
 * 秒数 → 友好时长（用于 active_source_age_seconds）
 * 75    → "1 分 15 秒"
 * 3725  → "1 小时 2 分"
 */
export function formatDurationSeconds(value) {
    if (value === null || value === undefined) return PLACEHOLDER
    const sec = Math.max(0, Math.floor(Number(value)))
    if (!Number.isFinite(sec)) return PLACEHOLDER

    if (sec < 60) return `${sec} 秒`
    if (sec < 3600) {
        const m = Math.floor(sec / 60)
        const s = sec % 60
        return s ? `${m} 分 ${s} 秒` : `${m} 分钟`
    }
    if (sec < 86400) {
        const h = Math.floor(sec / 3600)
        const m = Math.floor((sec % 3600) / 60)
        return m ? `${h} 小时 ${m} 分` : `${h} 小时`
    }
    const d = Math.floor(sec / 86400)
    const h = Math.floor((sec % 86400) / 3600)
    return h ? `${d} 天 ${h} 小时` : `${d} 天`
}

export const PLACEHOLDER_TEXT = PLACEHOLDER
