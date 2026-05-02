/**
 * 风险类型工具
 *
 * 兼容后端实际返回的所有 risk_type 值（normal / empty / full / offline / abnormal）
 * 以及任何非法 / 空 / 大小写不一致的输入 → 统一归为 'unknown'。
 */

const VALID = new Set(['normal', 'empty', 'full', 'offline', 'abnormal'])

/**
 * 把任意输入归一化为合法 risk_type
 * null / undefined / 非法字符串 → 'unknown'
 */
export function normalizeRiskType(value) {
    if (typeof value !== 'string') return 'unknown'
    const v = value.trim().toLowerCase()
    return VALID.has(v) ? v : 'unknown'
}

/**
 * 中文标签
 */
export function riskLabel(value) {
    const t = normalizeRiskType(value)
    switch (t) {
        case 'normal': return '正常'
        case 'empty': return '空车'
        case 'full': return '满桩'
        case 'offline': return '离线'
        case 'abnormal': return '异常'
        default: return '未知'
    }
}

/**
 * 色调 token，与组件库色调约定一致
 *   normal   → emerald
 *   empty    → rose
 *   full     → amber
 *   offline  → slate
 *   abnormal → violet
 *   unknown  → slate
 */
export function riskTone(value) {
    const t = normalizeRiskType(value)
    switch (t) {
        case 'normal': return 'emerald'
        case 'empty': return 'rose'
        case 'full': return 'amber'
        case 'offline': return 'slate'
        case 'abnormal': return 'violet'
        default: return 'slate'
    }
}

/**
 * Emoji 图标
 */
export function riskIcon(value) {
    const t = normalizeRiskType(value)
    switch (t) {
        case 'normal': return '🟢'
        case 'empty': return '🔴'
        case 'full': return '🟠'
        case 'offline': return '⚫'
        case 'abnormal': return '🟣'
        default: return '⚪'
    }
}

/**
 * 一次性返回完整描述对象，方便组件 props 传递
 */
export function riskDescriptor(value) {
    const t = normalizeRiskType(value)
    return {
        type: t,
        label: riskLabel(t),
        tone: riskTone(t),
        icon: riskIcon(t),
    }
}
