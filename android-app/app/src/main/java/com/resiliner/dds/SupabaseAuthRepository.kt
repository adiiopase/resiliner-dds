package com.resiliner.dds

import com.google.gson.Gson
import com.resiliner.dds.models.AuthErrorResponse
import com.resiliner.dds.models.AuthResponse
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class SupabaseAuthRepository {
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .writeTimeout(20, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()

    fun signIn(email: String, password: String, callback: (Result<AuthResponse>) -> Unit) {
        Thread {
            try {
                val requestBody = JSONObject()
                    .put("email", email.trim())
                    .put("password", password)
                    .toString()
                    .toRequestBody("application/json".toMediaType())

                val request = Request.Builder()
                    .url("${BuildConfig.API_BASE_URL}/auth/v1/token?grant_type=password")
                    .addHeader("apikey", BuildConfig.SUPABASE_ANON_KEY)
                    .post(requestBody)
                    .build()

                client.newCall(request).execute().use { response ->
                    val rawBody = response.body?.string() ?: ""

                    if (!response.isSuccessful) {
                        val error = gson.fromJson(rawBody, AuthErrorResponse::class.java)
                        val message = error.errorDescription ?: error.error ?: "Échec de connexion"
                        callback(Result.failure(Exception(message)))
                        return@Thread
                    }

                    val authResponse = gson.fromJson(rawBody, AuthResponse::class.java)
                    if (authResponse.accessToken.isNullOrBlank()) {
                        callback(Result.failure(Exception("Réponse de connexion invalide.")))
                    } else {
                        callback(Result.success(authResponse))
                    }
                }
            } catch (error: Exception) {
                callback(Result.failure(error))
            }
        }.start()
    }

    fun refreshSession(refreshToken: String, callback: (Result<AuthResponse>) -> Unit) {
        Thread {
            try {
                val requestBody = org.json.JSONObject()
                    .put("refresh_token", refreshToken)
                    .toString()
                    .toRequestBody("application/json".toMediaType())
                val request = Request.Builder()
                    .url("${BuildConfig.API_BASE_URL}/auth/v1/token?grant_type=refresh_token")
                    .addHeader("apikey", BuildConfig.SUPABASE_ANON_KEY)
                    .post(requestBody)
                    .build()

                client.newCall(request).execute().use { response ->
                    val rawBody = response.body?.string() ?: ""
                    if (!response.isSuccessful) {
                        val error = gson.fromJson(rawBody, AuthErrorResponse::class.java)
                        callback(Result.failure(Exception(error.errorDescription ?: error.error ?: "Session expirée")))
                        return@Thread
                    }
                    val authResponse = gson.fromJson(rawBody, AuthResponse::class.java)
                    if (authResponse.accessToken.isNullOrBlank()) {
                        callback(Result.failure(Exception("Réponse de renouvellement invalide.")))
                    } else {
                        callback(Result.success(authResponse))
                    }
                }
            } catch (error: Exception) {
                callback(Result.failure(error))
            }
        }.start()
    }
}
