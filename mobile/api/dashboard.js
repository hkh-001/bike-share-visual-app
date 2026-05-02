/**
 * Dashboard / 健康检查 API
 *
 * M0 阶段仅实现 health()，验证后端可达。
 * 后续阶段（M1+）将在此文件追加 summary / kpi / stations / alerts 等方法。
 */

import { get } from './request'

/**
 * 后端健康检查
 * GET /api/health
 * 返回示例：{ ok: true, version: "0.x.x" }
 */
export function health() {
    return get('/api/health')
}
