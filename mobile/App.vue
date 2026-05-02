<script>
import { useSettingsStore } from '@/store/settings'

export default {
    onLaunch() {
        // 启动时从本地 storage 加载用户设置（API 地址、主题等）
        const settings = useSettingsStore()
        settings.loadFromStorage()
        console.log('[BikeGuard] App launched. apiBaseUrl =', settings.apiBaseUrl)
    },
    onShow() {
        // App 从后台切回前台时触发
    },
    onHide() {
        // App 切到后台时触发
    },
}
</script>

<style lang="scss">
/* uni-app 全局样式（uni.scss 仅含 SCSS 变量，不会被全局注入到 DOM） */

page {
    background-color: #0a0a0f;
    color: #e5e7eb;
    font-size: 28rpx;
    line-height: 1.5;
}

view, scroll-view, text {
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC",
        "Helvetica Neue", "Microsoft YaHei", Arial, sans-serif;
}

/* 通用工具类 */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-1 { flex: 1; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }

/* 文本截断 */
.truncate {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

/* 按钮基线（uni-app button 默认样式覆盖） */
button {
    margin: 0;
    padding: 0;
    border: none;
}

button::after {
    border: none;
}

/* 输入框默认 */
input {
    background: transparent;
    color: inherit;
}
</style>
