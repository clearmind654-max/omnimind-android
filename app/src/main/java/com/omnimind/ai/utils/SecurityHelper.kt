package com.omnimind.ai.utils

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import java.nio.charset.StandardCharsets

object SecurityHelper {
    private const val PREF_NAME = "omnimind_secure_prefs"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    }

    fun saveEncrypted(context: Context, key: String, value: String) {
        val encoded = Base64.encodeToString(value.toByteArray(StandardCharsets.UTF_8), Base64.NO_WRAP)
        getPrefs(context).edit().putString(key, encoded).apply()
    }

    fun getDecrypted(context: Context, key: String, defaultValue: String = ""): String {
        val encoded = getPrefs(context).getString(key, null) ?: return defaultValue
        return try {
            val decodedBytes = Base64.decode(encoded, Base64.NO_WRAP)
            String(decodedBytes, StandardCharsets.UTF_8)
        } catch (e: Exception) {
            defaultValue
        }
    }

    fun removeKey(context: Context, key: String) {
        getPrefs(context).edit().remove(key).apply()
    }
}
