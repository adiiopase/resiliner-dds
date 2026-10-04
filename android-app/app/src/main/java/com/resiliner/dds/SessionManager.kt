package com.resiliner.dds

import android.content.Context

class SessionManager(context: Context) {
    private val prefs = context.getSharedPreferences("dds_mobile_session", Context.MODE_PRIVATE)

    fun saveSession(
        email: String,
        accessToken: String,
        refreshToken: String,
        expiresInSeconds: Long = 3600,
        userRole: String = "user",
        adminPinCookie: String? = null
    ) {
        prefs.edit()
            .putString("email", email)
            .putString("access_token", accessToken)
            .putString("refresh_token", refreshToken)
            .putLong("expires_at", System.currentTimeMillis() + expiresInSeconds * 1000)
            .putString("user_role", userRole)
            .putBoolean("is_admin", userRole == "manager" || isAdminEmail(email))
            .putString("admin_pin_cookie", adminPinCookie)
            .apply()
    }

    fun getUserEmail(): String? = prefs.getString("email", null)
    fun getUserRole(): String? = prefs.getString("user_role", null)
    fun getAccessToken(): String? = prefs.getString("access_token", null)
    fun getRefreshToken(): String? = prefs.getString("refresh_token", null)
    fun getAdminPinCookie(): String? = prefs.getString("admin_pin_cookie", null)

    fun isLoggedIn(): Boolean = !getAccessToken().isNullOrBlank()
    fun isAdminAccount(): Boolean =
        prefs.getBoolean("is_admin", false) ||
            getUserRole() == "manager" ||
            isAdminEmail(getUserEmail().orEmpty())

    fun hasValidAdminPinSession(): Boolean {
        val cookieValue = getAdminPinCookie()?.substringAfter('=', "") ?: return false
        val expiresAt = cookieValue.substringBefore('.').toLongOrNull() ?: return false
        return expiresAt > System.currentTimeMillis() / 1000
    }

    fun isAccessTokenExpired(): Boolean =
        System.currentTimeMillis() >= prefs.getLong("expires_at", 0L) - 60_000

    fun clear() {
        prefs.edit().clear().apply()
    }

    private fun isAdminEmail(email: String): Boolean =
        email.trim().lowercase() in setOf("adiiopase@gmail.com", "adiopa@yahoo.fr")
}
