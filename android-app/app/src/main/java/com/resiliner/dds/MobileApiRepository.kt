package com.resiliner.dds

import android.os.Handler
import android.os.Looper
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

data class MobileDocument(
    val id: String,
    val name: String,
    val category: String?,
    val size_bytes: Long,
    val created_at: String?,
    val path: String?
)

data class MobileUploadResult(
    val name: String,
    val category: String?,
    val sizeBytes: Long,
    val message: String
)

class MobileApiRepository {
    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(90, TimeUnit.SECONDS)
        .writeTimeout(90, TimeUnit.SECONDS)
        .build()
    private val gson = Gson()
    private val mainHandler = Handler(Looper.getMainLooper())

    fun loadDocuments(token: String, callback: (Result<List<MobileDocument>>) -> Unit) {
        val request = supabaseRequest(
            "${BuildConfig.API_BASE_URL}/rest/v1/documents?select=id,name,category,size_bytes,created_at,path&order=created_at.desc",
            token
        ).get().build()

        execute(request, callback) { body ->
            val listType = object : TypeToken<List<MobileDocument>>() {}.type
            gson.fromJson<List<MobileDocument>>(body, listType) ?: emptyList()
        }
    }

    fun uploadDocument(
        file: File,
        mimeType: String,
        category: String,
        token: String,
        fileName: String = file.name,
        callback: (Result<MobileUploadResult>) -> Unit
    ) {
        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("file", file.name, file.asRequestBody(mimeType.toMediaType()))
            .addFormDataPart("fileName", fileName)
            .addFormDataPart("category", category)
            .build()

        val request = Request.Builder()
            .url("${BuildConfig.MOBILE_API_BASE_URL.trimEnd('/')}/api/mobile-upload")
            .header("Authorization", "Bearer $token")
            .post(requestBody)
            .build()

        execute(request, callback) { body ->
            val response = JSONObject(body)
            val document = response.getJSONObject("document")
            MobileUploadResult(
                name = document.optString("name", file.name),
                category = document.optString("category", category),
                sizeBytes = document.optLong("size_bytes", file.length()),
                message = response.optString("message", "Document synchronisé.")
            )
        }
    }

    fun processOcr(file: File, mimeType: String, token: String, callback: (Result<String>) -> Unit) {
        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("file", file.name, file.asRequestBody(mimeType.toMediaType()))
            .addFormDataPart("language", "fra+eng")
            .build()
        val request = Request.Builder()
            .url("${BuildConfig.MOBILE_API_BASE_URL.trimEnd('/')}/api/ocr/process")
            .header("Authorization", "Bearer $token")
            .post(requestBody)
            .build()

        execute(request, callback) { body ->
            val response = JSONObject(body)
            response.getJSONObject("ocr").optString("fullText", "")
        }
    }

    fun verifyAdminPin(pin: String, accessToken: String, callback: (Result<String>) -> Unit) {
        val requestBody = JSONObject()
            .put("pin", pin)
            .toString()
            .toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("${BuildConfig.MOBILE_API_BASE_URL.trimEnd('/')}/api/admin/verify-pin")
            .header("Authorization", "Bearer $accessToken")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : okhttp3.Callback {
            override fun onFailure(call: okhttp3.Call, error: java.io.IOException) {
                deliver(callback, Result.failure(error))
            }

            override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                response.use {
                    val body = it.body?.string().orEmpty()
                    if (!it.isSuccessful) {
                        val message = runCatching {
                            JSONObject(body).optString("error").ifBlank {
                                JSONObject(body).optString("message")
                            }
                        }.getOrNull().orEmpty().ifBlank {
                            "Vérification du PIN refusée (${it.code})."
                        }
                        deliver(callback, Result.failure(Exception(message)))
                        return
                    }

                    val adminCookie = it.headers("Set-Cookie")
                        .firstOrNull { cookie -> cookie.startsWith("dds_admin_pin_session=") }
                        ?.substringBefore(';')
                    if (adminCookie.isNullOrBlank()) {
                        deliver(
                            callback,
                            Result.failure(Exception("Le serveur n’a pas confirmé la session administrateur."))
                        )
                    } else {
                        deliver(callback, Result.success(adminCookie))
                    }
                }
            }
        })
    }

    fun createSignedUrl(path: String, token: String, callback: (Result<String>) -> Unit) {
        val encodedPath = path.split('/').joinToString("/") {
            URLEncoder.encode(it, Charsets.UTF_8.name()).replace("+", "%20")
        }
        val request = supabaseRequest(
            "${BuildConfig.API_BASE_URL}/storage/v1/object/sign/documents/$encodedPath",
            token
        )
            .post("""{"expiresIn":900}""".toRequestBody("application/json".toMediaType()))
            .build()

        execute(request, callback) { body ->
            val json = JSONObject(body)
            val signedPath = json.optString("signedURL").ifBlank { json.getString("signedUrl") }
            if (signedPath.startsWith("http")) signedPath
            else if (signedPath.startsWith("/storage/v1/")) "${BuildConfig.API_BASE_URL}$signedPath"
            else "${BuildConfig.API_BASE_URL}/storage/v1$signedPath"
        }
    }

    private fun supabaseRequest(url: String, token: String) = Request.Builder()
        .url(url)
        .header("apikey", BuildConfig.SUPABASE_ANON_KEY)
        .header("Authorization", "Bearer $token")
        .header("Accept", "application/json")

    private fun <T> execute(
        request: Request,
        callback: (Result<T>) -> Unit,
        parse: (String) -> T
    ) {
        client.newCall(request).enqueue(object : okhttp3.Callback {
            override fun onFailure(call: okhttp3.Call, error: java.io.IOException) {
                deliver(callback, Result.failure(error))
            }

            override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                response.use {
                    val body = it.body?.string().orEmpty()
                    if (!it.isSuccessful) {
                        val message = runCatching {
                            JSONObject(body).optString("message").ifBlank {
                                JSONObject(body).optString("error")
                            }
                        }.getOrNull().orEmpty().ifBlank { "Erreur serveur (${it.code})." }
                        deliver(callback, Result.failure(Exception(message)))
                        return
                    }
                    val result = runCatching { parse(body) }
                    deliver(callback, result)
                }
            }
        })
    }

    private fun <T> deliver(callback: (Result<T>) -> Unit, result: Result<T>) {
        mainHandler.post { callback(result) }
    }
}