package com.resiliner.dds

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import com.resiliner.dds.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        binding.titleText.text = "Resiliner DDS"
        binding.subtitleText.text = "Connexion au portail mobile"

        val sessionManager = SessionManager(this)
        Handler(Looper.getMainLooper()).postDelayed({
            if (!sessionManager.isLoggedIn()) {
                openScreen(HomeActivity::class.java)
                return@postDelayed
            }

            if (sessionManager.getUserRole().isNullOrBlank() ||
                (sessionManager.isAdminAccount() && !sessionManager.hasValidAdminPinSession())
            ) {
                sessionManager.clear()
                openScreen(HomeActivity::class.java)
                return@postDelayed
            }

            val refreshToken = sessionManager.getRefreshToken()
            if (!sessionManager.isAccessTokenExpired()) {
                openScreen(DashboardActivity::class.java)
                return@postDelayed
            }

            if (refreshToken.isNullOrBlank()) {
                sessionManager.clear()
                openScreen(HomeActivity::class.java)
                return@postDelayed
            }

            SupabaseAuthRepository().refreshSession(refreshToken) { result ->
                runOnUiThread {
                    result.onSuccess { auth ->
                        sessionManager.saveSession(
                            email = auth.user?.email ?: sessionManager.getUserEmail().orEmpty(),
                            accessToken = auth.accessToken.orEmpty(),
                            refreshToken = auth.refreshToken ?: refreshToken,
                            expiresInSeconds = auth.expiresIn ?: 3600,
                            userRole = auth.user?.appMetadata?.role ?: sessionManager.getUserRole() ?: "user",
                            adminPinCookie = sessionManager.getAdminPinCookie()
                        )
                        openScreen(DashboardActivity::class.java)
                    }.onFailure {
                        sessionManager.clear()
                        openScreen(HomeActivity::class.java)
                    }
                }
            }
        }, 900)
    }

    private fun openScreen(screen: Class<*>) {
        startActivity(Intent(this, screen))
        finish()
    }
}
