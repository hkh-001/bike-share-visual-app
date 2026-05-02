/**
 * 应用设置 store
 *
 * 持久化字段（写入 uni.setStorageSync）：
 *   - apiBaseUrl   后端 API 地址（不带 /api 前缀，例如 http://192.168.0.105:8765）
 *   - theme        主题（dark / light）
 *   - refreshInterval  自动刷新间隔（ms）
 *
 * 启动时由 App.vue 的 onLaunch 调用 loadFromStorage()。
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'bike-guard-settings'

const DEFAULT_SETTINGS = {
    apiBaseUrl: 'http://192.168.0.100:8765',
    theme: 'dark',
    refreshInterval: 30000,
}

export const useSettingsStore = defineStore('settings', () => {
    const apiBaseUrl = ref(DEFAULT_SETTINGS.apiBaseUrl)
    const theme = ref(DEFAULT_SETTINGS.theme)
    const refreshInterval = ref(DEFAULT_SETTINGS.refreshInterval)

    function loadFromStorage() {
        try {
            const raw = uni.getStorageSync(STORAGE_KEY)
            if (raw && typeof raw === 'object') {
                if (typeof raw.apiBaseUrl === 'string' && raw.apiBaseUrl) {
                    apiBaseUrl.value = raw.apiBaseUrl
                }
                if (raw.theme === 'dark' || raw.theme === 'light') {
                    theme.value = raw.theme
                }
                if (typeof raw.refreshInterval === 'number' && raw.refreshInterval > 0) {
                    refreshInterval.value = raw.refreshInterval
                }
            }
        } catch (e) {
            console.warn('[settings] load from storage failed:', e)
        }
    }

    function saveToStorage() {
        try {
            uni.setStorageSync(STORAGE_KEY, {
                apiBaseUrl: apiBaseUrl.value,
                theme: theme.value,
                refreshInterval: refreshInterval.value,
            })
        } catch (e) {
            console.warn('[settings] save to storage failed:', e)
        }
    }

    function setApiBaseUrl(url) {
        const trimmed = (url || '').trim().replace(/\/+$/, '')
        apiBaseUrl.value = trimmed
        saveToStorage()
    }

    function setTheme(t) {
        if (t === 'dark' || t === 'light') {
            theme.value = t
            saveToStorage()
        }
    }

    function setRefreshInterval(ms) {
        const n = Number(ms)
        if (Number.isFinite(n) && n > 0) {
            refreshInterval.value = n
            saveToStorage()
        }
    }

    function reset() {
        apiBaseUrl.value = DEFAULT_SETTINGS.apiBaseUrl
        theme.value = DEFAULT_SETTINGS.theme
        refreshInterval.value = DEFAULT_SETTINGS.refreshInterval
        saveToStorage()
    }

    return {
        apiBaseUrl,
        theme,
        refreshInterval,
        loadFromStorage,
        saveToStorage,
        setApiBaseUrl,
        setTheme,
        setRefreshInterval,
        reset,
    }
})
