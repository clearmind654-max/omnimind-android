/**
 * OmniMind Storage Module
 * Bridges Native Android SQLite via WebAppInterface with browser localStorage fallback.
 */

export const Storage = {
    async getItem(key, defaultValue = null) {
        try {
            if (window.AndroidNative && typeof window.AndroidNative.getData === 'function') {
                const val = window.AndroidNative.getData(key);
                if (val !== null && val !== undefined && val !== '') {
                    try { return JSON.parse(val); } catch (e) { return val; }
                }
            }
            const localVal = localStorage.getItem(key);
            if (localVal !== null) {
                try { return JSON.parse(localVal); } catch (e) { return localVal; }
            }
        } catch (e) {
            console.warn('[Storage] getItem error:', e);
        }
        return defaultValue;
    },

    async setItem(key, value) {
        try {
            const stringVal = typeof value === 'string' ? value : JSON.stringify(value);
            if (window.AndroidNative && typeof window.AndroidNative.saveData === 'function') {
                window.AndroidNative.saveData(key, stringVal);
            }
            localStorage.setItem(key, stringVal);
            return true;
        } catch (e) {
            console.error('[Storage] setItem error:', e);
            return false;
        }
    },

    async removeItem(key) {
        try {
            if (window.AndroidNative && typeof window.AndroidNative.saveData === 'function') {
                window.AndroidNative.saveData(key, '');
            }
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('[Storage] removeItem error:', e);
            return false;
        }
    }
};
