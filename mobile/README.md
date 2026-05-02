# BikeGuard 移动端

基于 **HBuilderX + uni-app + Vue 3 + JavaScript** 的共享单车监控移动端，对接现有 FastAPI 后端。

> **当前进度：M0 ✅ · M1 ✅ · M2 ✅ · M3 ✅ · M4 ✅**
> 下一步：M5 AI 助手（非流式）。

---

## 目录结构

```
mobile/
├── pages/                   # 业务页面
│   ├── index/index.vue            首页（连接测试 + 应用入口）
│   ├── stations/index.vue         站点列表（M2 占位）
│   ├── stations/detail.vue        站点详情（M2 占位）
│   ├── alerts/index.vue           告警中心（M3 占位）
│   ├── trends/index.vue           趋势分析（M4 占位）
│   ├── ai/index.vue               AI 助手（M5 占位）
│   └── settings/index.vue         设置页（API 地址 / 测试连接 / 应用信息）
├── components/              # 可复用组件（M1+ 填充）
├── api/
│   ├── request.js                 uni.request 统一封装
│   └── dashboard.js               health() 接口
├── store/
│   └── settings.js                Pinia 设置 store（apiBaseUrl / theme / refreshInterval）
├── utils/                   # 工具函数（M1+ 填充）
├── static/                  # 静态资源（图标等）
├── App.vue
├── main.js                  # createApp + Pinia
├── manifest.json            # 应用元信息（含 Android 明文 HTTP 配置）
├── pages.json               # 路由 + tabBar
├── uni.scss                 # SCSS 变量（暗色科技风）
├── .gitignore
└── README.md                # 本文件
```

---

## 一、运行前准备

### 1.1 修改后端启动方式（重要）

后端默认监听 `127.0.0.1`（仅本机可达），手机无法连接。
**必须改为** 监听所有网卡：

```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8765 --reload
```

启动成功的标志：终端显示 `Uvicorn running on http://0.0.0.0:8765`。

### 1.2 查询电脑局域网 IP

**Windows**：

```bash
ipconfig
```

找到无线网卡（"无线局域网适配器 WLAN"）下的 **IPv4 地址**，形如：

```
IPv4 地址 . . . . . . . . . . . . : 192.168.0.105
```

记下这个 IP（每次连不同 Wi-Fi 可能会变）。

### 1.3 防火墙放行 8765 端口

首次启动时 Windows 通常会弹出"是否允许专用网络访问"，**必须勾选"允许"**。
如果之前误点拒绝，可在 "Windows Defender 防火墙 → 高级设置 → 入站规则" 中重新添加 Python 或 8765 的允许规则。

### 1.4 手机与电脑同 Wi-Fi

手机和电脑必须连接到 **同一个无线网络**。
公共网络（如学校 Wi-Fi）开启 "客户端隔离" 时会失败 —— 此时需用手机开热点共享。

### 1.5 在浏览器电脑端 / 手机端预先验证

**电脑浏览器**：访问 `http://192.168.0.105:8765/api/health`，应返回类似：
```json
{"ok": true, "version": "0.x.x"}
```

**手机浏览器**：同样访问 `http://192.168.0.105:8765/api/health`。
如果手机浏览器都打不开，说明网络/防火墙问题，App 也连不上 —— 必须先修复这一步。

---

## 二、用 HBuilderX 打开和运行

### 2.1 打开项目

1. 打开 HBuilderX（建议 **3.6+** 版本，确保内置 Vue 3 + Pinia 支持）
2. 菜单栏 "文件 → 打开目录"
3. 选择 `c:\Users\huang\Desktop\bike-claude-APP\mobile`
4. HBuilderX 应自动识别为 uni-app 项目（左侧目录树会出现蓝色 uni 图标）

### 2.2 真机运行（推荐）

1. 手机连接 USB，开启 **开发者选项 + USB 调试**
2. HBuilderX → "运行 → 运行到手机或模拟器 → 运行到 Android App 基座"
3. 首次运行会让你安装 "HBuilderX 标准基座 App" —— 按提示安装即可
4. 等待编译，App 自动启动

### 2.3 模拟器运行

1. 安装 Android 模拟器（HBuilderX 推荐 mumu / 雷电 / 夜神 / 官方 AVD）
2. HBuilderX → "运行 → 运行到手机或模拟器 → 选择对应模拟器"

### 2.4 H5 预览（可选，仅用于 UI 调试）

1. HBuilderX → "运行 → 运行到浏览器 → Chrome"
2. ⚠️ H5 模式下 **会受 CORS 限制**，需后端添加白名单：
   ```
   # backend/.env
   CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000","http://localhost:5173","*"]
   ```
   或直接用 App 真机模式（不受 CORS 限制）。

---

## 三、首次使用流程

1. App 启动后，首页会显示当前 API 地址（默认占位 `http://192.168.0.100:8765`）
2. 点击右上角 **⚙ 设置图标** 进入设置页
3. 修改 **API 地址** 输入框为你的电脑实际 IP，例如：
   ```
   http://192.168.0.105:8765
   ```
   注意：**不要带 `/api` 前缀**
4. 点击 **保存** → 显示 "✅ 已保存"
5. 点击 **测试连接** → 应显示 "✅ 后端在线"
6. 点击 **返回首页**，再点首页的 **"测试后端连接"**，同样应显示后端在线

---

## 四、连接失败排查

| 现象 | 可能原因 | 排查方法 |
|---|---|---|
| 显示"未配置 API 地址" | 设置页未保存 | 进入设置页，输入 IP 后点保存 |
| 长时间转圈后超时 | 网络不通 / 防火墙 / 后端没启 | 用手机浏览器访问 `http://IP:8765/api/health` 验证 |
| `errMsg: "request:fail"` | DNS / 网络解析问题 | 确认手机与电脑同一 Wi-Fi |
| HTTP `403` / `404` | 路径或端口错误 | 确认 baseURL 不带 `/api`、端口为 8765 |
| Android 白屏 / 拒绝 | 明文 HTTP 被禁 | 已在 `manifest.json` 配置 `usesCleartextTraffic: true`，重新打包基座即可 |
| 切换 Wi-Fi 后失效 | 电脑 IP 变了 | 重新 `ipconfig` 查 IP，到设置页更新 |

---

## 五、技术栈

| 维度 | 选型 |
|---|---|
| IDE | HBuilderX 3.6+ |
| 框架 | uni-app + Vue 3（`<script setup>`） |
| 语言 | JavaScript（不开 TypeScript） |
| 状态管理 | Pinia |
| 网络 | uni.request 自封装 |
| 持久化 | uni.setStorageSync / getStorageSync |
| 主题 | 暗色科技风（CSS 变量定义在 `uni.scss`） |
| 平台 | Android（首选）/ iOS / H5（次选） |

---

## 六、安全约束

- ❌ **API Key 不会出现在移动端**。Kimi/Moonshot 的 `apikey.txt` 始终保留在后端 `backend/`，移动端只调用 `/api/ai/chat`，永远不直连 Kimi。
- ❌ **不在客户端存储敏感信息**。本地 storage 只保存 API 地址、主题、刷新间隔等配置项。
- ⚠️ **明文 HTTP** 仅适用于局域网调试。生产部署应改用 HTTPS 域名，并关闭 `usesCleartextTraffic`。

---

## 七、与现有项目的关系

```
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  Web 端           │      │  FastAPI 后端     │      │  移动端 App       │
│  (frontend/)     │ ───► │  (backend/)      │ ◄─── │  (mobile/) ★ 本目录│
│  Next.js 16      │      │  --host 0.0.0.0  │      │  uni-app + Vue 3  │
└──────────────────┘      └──────────────────┘      └──────────────────┘
                                  │
                                  ├─ SQLite (bike.db)
                                  ├─ APScheduler (GBFS ETL)
                                  └─ Kimi AI (apikey.txt)
```

- **不替代** Web 端，**不修改** backend 代码（仅启动命令需带 `--host 0.0.0.0`）
- 移动端是新增子项目，与 Web 端共用同一套 FastAPI API
- 课程展示时可同时打开 Web 与 App，数据完全一致

---

## 八、已知限制 / 注意事项

1. **tabBar 暂无图标**：M0 阶段为简化未提供 PNG 图标，HBuilderX 会渲染为文本标签。如需图标，可在 `static/tabs/` 下放置 81x81 PNG 文件并在 `pages.json` 的 tabBar 中补 `iconPath` / `selectedIconPath`。
2. **iOS 真机调试**需要 Apple ID，本阶段以 Android 为主。
3. **小程序平台**未做适配（M0 仅验证 Android App 与 H5）。
4. **Pinia 依赖** 由 HBuilderX 3.4+ 内置；若旧版本报错，请升级 HBuilderX 或在项目根目录执行 `npm install pinia`。

---

## 九、下一步：Mobile M5

M4 已完成（趋势分析：城市级 24h 可用车 / 占用率 / 告警数三张折线图，复用 `chart-line.vue` 原生 canvas 图表，60s 缓存 + 下拉刷新 + 手动刷新按钮）。下一步进入 M5 AI 助手（非流式）。

### M2 关键说明

- **图表实现**：本阶段未引入 `qiun-data-charts` / `uCharts` 等第三方图表库，`mobile/components/chart-line.vue` 是基于 uni-app 原生 `<canvas>` 的轻量自封装组件，无需安装任何插件即可在 HBuilderX 中直接运行。
- **接口契约稳定**：`chart-line.vue` 的 Props (`categories`、`series`、`loading`、`empty`、`height`、`canvasId`、`yFormatter`) 与 qiun-data-charts 保持兼容，后续如需升级，仅替换内部实现，调用方无需改动。
- **客户端分页**：站点列表使用 `allStations → filteredStations → visibleStations` 三层结构，初始显示 50 条，触底再加载 50 条，避免 2400+ 站点全量渲染卡顿。
- **风险筛选 vs 搜索**：风险 chips 通过后端 `?risk_type=` 参数筛选；名称 / 编码搜索为本地过滤，不发起网络请求。

### M3 关键说明

- **接口**：`GET /api/dashboard/alerts?mode=&level=&limit=` 一次请求最多 300 条，前端 `visibleCount` 初始 30，触底 +30，避免一次性 v-for 800+ 条卡顿。
- **真实 vs Mock 隔离**：`mode=real|mock` 由后端按 `Station.source_system` 分流，前端绝不混合显示；Mock 模式下卡片有「演示数据」徽章，点击只 toast，不跳转真实站点详情。
- **状态筛选**：M3 暂未在 UI 暴露状态筛选（后端 `status` 默认 `"open"`，已能覆盖主要场景）；如未来后端把 status 取值规范化，可直接在级别 chips 后追加一组状态 chips。

### M4 关键说明

- **接口**：`GET /api/dashboard/trends/24h`，复用 `mobile/api/request.js` 与 `chart-line.vue`，**不引入任何第三方图表库**。
- **三张图同源**：可用车（cyan / 整数千分位）、平均占用率（amber / `0~1 → %`）、告警数（rose / 整数）共用同一份 `categories = buckets[].ts → 'HH:00'`，仅 series 数据 + yFormatter + color 不同。
- **字段兼容**：`ts/timestamp/time`、`city_total_bikes/total_bikes/bikes_available/total_bikes_available`、`city_avg_occupancy/avg_occupancy_rate/occupancy_rate`、`alerts_count/alert_count/alerts` 均通过 `pickField` 兜底；缺失填 0 或 `--`，不会崩溃。
- **缓存策略**：`onShow` 进页面 60s 内不重复请求；下拉刷新 / 「刷新趋势」按钮强制 force；刷新失败时若已有旧数据，**保留图表** + 底部红色「点击重试」条，不白屏。
- **`region_series` 暂不消费**：M4 仅渲染 `buckets`，区域级 Top3 趋势留给后续阶段。

### M5 需求要点

- 调用 `POST /api/ai/chat`（非流式，不做 SSE）
- request body：`{ messages: [{ role, content }, ...], model: "kimi-k2.6" }`，**system prompt 由后端注入，移动端不要传**
- 历史保存到 `uni.setStorageSync('ai_chat_history', ...)`，仅保留最近 10 条
- `uni.request` timeout 调到 180000（kimi-k2.6 单次响应 30~120s）
- 首版纯文本展示（保留 emoji / 换行），暂不解析 Markdown
- 清空对话按钮 → `uni.removeStorageSync` + 重置状态
