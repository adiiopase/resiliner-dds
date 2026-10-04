package com.resiliner.dds.models

import com.google.gson.annotations.SerializedName

data class AuthResponse(
    @SerializedName("access_token") val accessToken: String? = null,
    @SerializedName("refresh_token") val refreshToken: String? = null,
    @SerializedName("token_type") val tokenType: String? = null,
    @SerializedName("expires_in") val expiresIn: Long? = null,
    @SerializedName("user") val user: UserInfo? = null
)

data class UserInfo(
    @SerializedName("id") val id: String? = null,
    @SerializedName("email") val email: String? = null,
    @SerializedName("app_metadata") val appMetadata: AppMetadata? = null
)

data class AppMetadata(
    @SerializedName("role") val role: String? = null
)

data class AuthErrorResponse(
    @SerializedName("error") val error: String? = null,
    @SerializedName("error_description") val errorDescription: String? = null
)
