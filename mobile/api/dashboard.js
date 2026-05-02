/**
 * Dashboard / 健康检查 / ETL / Stations API
 *
 * 复用 ./request 统一封装，不重写底层逻辑。
 * Code 类参数统一使用 encodeURIComponent，避免特殊字符导致 URL 错误。
 */

import { get } from './request'

/* ========== 工具：把 query object 拼成 ?k=v&k=v ========== */
function buildQuery(params) {
    if (!params) return ''
    const parts = []
    for (const k of Object.keys(params)) {
        const v = params[k]
        if (v === undefined || v === null || v === '') continue
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    }
    return parts.length ? `?${parts.join('&')}` : ''
}

/* ========== M0：health ========== */

/**
 * 后端健康检查
 * GET /api/health
 */
export function health() {
    return get('/api/health')
}

/* ========== M1：dashboard summary + ETL ========== */

/**
 * 首页大屏汇总（KPI + 风险站点 + 最近告警 + ETL 健康）
 * GET /api/dashboard/summary
 */
export function summary() {
    return get('/api/dashboard/summary')
}

/**
 * ETL 整体状态（数据源 / 新鲜度 / 调度器）
 * GET /api/etl/status
 */
export function etlStatus() {
    return get('/api/etl/status')
}

/* ========== M2：站点列表 + 单站详情 + 历史 + 告警 ========== */

/**
 * 站点列表
 * GET /api/dashboard/stations?risk_type=
 *
 * 后端目前只支持 risk_type 一个查询参数（normal/empty/full/offline/abnormal）；
 * limit / offset 后端未支持，移动端在前端做客户端分页。
 *
 * @param {object} [params]
 * @param {string} [params.risk_type] 'normal' | 'empty' | 'full' | 'offline' | 'abnormal'
 * @returns {Promise<Array>} list[RiskStationItem]
 */
export function stations(params = {}) {
    const { risk_type } = params || {}
    const qs = buildQuery({ risk_type })
    return get(`/api/dashboard/stations${qs}`)
}

/**
 * 单站详情（静态信息 + 当前状态）
 * GET /api/dashboard/stations/{code}
 *
 * @param {string} code 站点 station_code
 * @returns {Promise<object>} StationDetail
 */
export function stationDetail(code) {
    if (!code) return Promise.reject(new Error('缺少站点 code'))
    return get(`/api/dashboard/stations/${encodeURIComponent(code)}`)
}

/**
 * 单站 24h 历史快照
 * GET /api/dashboard/stations/{code}/history?hours=24
 *
 * @param {string} code  站点 station_code
 * @param {number} [hours=24] 1~168
 * @returns {Promise<object>} StationHistoryResponse
 */
export function stationHistory(code, hours = 24) {
    if (!code) return Promise.reject(new Error('缺少站点 code'))
    const qs = buildQuery({ hours })
    return get(`/api/dashboard/stations/${encodeURIComponent(code)}/history${qs}`)
}

/**
 * 单站告警
 * GET /api/dashboard/stations/{code}/alerts?limit=20
 *
 * @param {string} code  站点 station_code
 * @param {number} [limit=20] 1~100
 * @returns {Promise<object>} StationAlertsResponse
 */
export function stationAlerts(code, limit = 20) {
    if (!code) return Promise.reject(new Error('缺少站点 code'))
    const qs = buildQuery({ limit })
    return get(`/api/dashboard/stations/${encodeURIComponent(code)}/alerts${qs}`)
}

/* ========== M3：告警中心 ========== */

/**
 * 告警列表（真实 / Mock 演示）
 * GET /api/dashboard/alerts?mode=real&level=&status=&limit=
 *
 * 后端约定（routes_dashboard.py / dashboard_service.py）：
 *   - mode  : "real" | "mock"，默认 real
 *   - level : "info" | "warning" | "critical"，可选
 *   - status: 字符串，后端默认 "open"。不传时只会返回 status=open 的告警；
 *             如果业务上想看其它状态，可显式传 "resolved" / "acknowledged" 等。
 *             M3 暂不做状态筛选 UI，因此默认不显式传 status，由后端按 "open" 处理。
 *   - limit : 1~500，默认后端 100；移动端默认请求 300，再做客户端分页。
 *
 * 返回数组（list[RecentAlertItem]），不是包装对象。
 *
 * @param {object} [params]
 * @param {'real'|'mock'} [params.mode='real']
 * @param {'info'|'warning'|'critical'} [params.level]
 * @param {string} [params.status]
 * @param {number} [params.limit=300]
 * @returns {Promise<Array>}
 */
export function alerts(params = {}) {
    const {
        mode = 'real',
        level,
        status,
        limit = 300,
    } = params || {}
    const qs = buildQuery({ mode, level, status, limit })
    return get(`/api/dashboard/alerts${qs}`)
}

/* ========== M4：城市级 24h 趋势 ========== */

/**
 * 城市级 24h 趋势（每小时桶）
 * GET /api/dashboard/trends/24h
 *
 * 后端返回 DashboardTrend24h:
 *   {
 *     range: "24h",
 *     interval: "1h",
 *     buckets: [{
 *       ts: ISO datetime,
 *       city_total_bikes: int,
 *       city_avg_occupancy: float (0~1),
 *       alerts_count: int
 *     }, ...],
 *     region_series: [...]   // M4 暂不消费
 *   }
 *
 * 移动端 M4 仅消费 buckets，不消费 region_series。
 *
 * @returns {Promise<object>} DashboardTrend24h
 */
export function trends24h() {
    return get('/api/dashboard/trends/24h')
}
