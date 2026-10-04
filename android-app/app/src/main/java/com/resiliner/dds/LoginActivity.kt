package com.resiliner.dds

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import com.resiliner.dds.databinding.ActivityLoginBinding

class LoginActivity : AppCompatActivity() {
    private lateinit var binding: ActivityLoginBinding
    private val repository = SupabaseAuthRepository()
    private val mobileApiRepository = MobileApiRepository()
    private var pendingAdminAuth: com.resiliner.dds.models.AuthResponse? = null
    private var pendingAdminEmail = ""
    private var pendingAdminRole = "manager"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.loginButton.setOnClickListener {
            val email = binding.emailInput.text?.toString()?.trim().orEmpty()
            val password = binding.passwordInput.text?.toString().orEmpty()

            if (email.isBlank() || password.isBlank()) {
                binding.errorText.text = "Veuillez saisir votre email et votre mot de passe."
                return@setOnClickListener
            }

            setLoading(true)
            repository.signIn(email, password) { result ->
                runOnUiThread {
                    setLoading(false)
                    result.onSuccess { auth ->
                        val authenticatedEmail = auth.user?.email ?: email
                        val role = auth.user?.appMetadata?.role.orEmpty()
                        if (role == "manager" || isAdminEmail(authenticatedEmail)) {
                            pendingAdminAuth = auth
                            pendingAdminEmail = authenticatedEmail
                            pendingAdminRole = role.ifBlank { "manager" }
                            showAdminPinStep()
                        } else {
                            completeLogin(auth, authenticatedEmail, role.ifBlank { "user" })
                        }
                    }.onFailure { error ->
                        val message = error.message.orEmpty().lowercase()
                        binding.errorText.text = if (
                            message.contains("invalid login credentials") ||
                            message.contains("invalid_credentials") ||
                            message.contains("invalid_grant")
                        ) {
                            "Vous devez créer un compte avant de vous connecter si vous n’êtes pas encore inscrit. Si vous avez déjà un compte, vérifiez votre e-mail et votre mot de passe."
                        } else {
                            error.message ?: "Erreur de connexion"
                        }
                    }
                }
            }
        }

        binding.createAccountButton.setOnClickListener {
            val signUpUrl = "${BuildConfig.MOBILE_API_BASE_URL.trimEnd('/')}/signup"
            runCatching {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(signUpUrl)))
            }.onFailure {
                binding.errorText.text = "Impossible d’ouvrir la création de compte. Réessayez."
            }
        }

        binding.adminPinButton.setOnClickListener { validateAdminPin() }
        binding.cancelAdminPinButton.setOnClickListener {
            pendingAdminAuth = null
            pendingAdminEmail = ""
            binding.adminPinInput.text?.clear()
            binding.adminPinPanel.isVisible = false
            binding.loginPanel.isVisible = true
            binding.errorText.text = ""
        }
    }

    private fun showAdminPinStep() {
        binding.loginPanel.isVisible = false
        binding.adminPinPanel.isVisible = true
        binding.adminPinInput.requestFocus()
        binding.adminPinErrorText.text = ""
    }

    private fun validateAdminPin() {
        val auth = pendingAdminAuth
        val pin = binding.adminPinInput.text?.toString().orEmpty().trim()
        if (auth?.accessToken.isNullOrBlank()) {
            binding.adminPinErrorText.text = "Session de connexion manquante. Reconnectez-vous."
            return
        }
        if (pin.isBlank()) {
            binding.adminPinErrorText.text = "Saisissez votre code PIN administrateur."
            return
        }

        setAdminPinLoading(true)
        mobileApiRepository.verifyAdminPin(pin, auth?.accessToken.orEmpty()) { result ->
            setAdminPinLoading(false)
            result.onSuccess { adminCookie ->
                completeLogin(auth!!, pendingAdminEmail, pendingAdminRole, adminCookie)
            }.onFailure { error ->
                binding.adminPinErrorText.text = error.message ?: "Code PIN invalide. Réessayez."
                binding.adminPinInput.text?.clear()
            }
        }
    }

    private fun completeLogin(
        auth: com.resiliner.dds.models.AuthResponse,
        email: String,
        role: String,
        adminPinCookie: String? = null
    ) {
        SessionManager(this).saveSession(
            email = email,
            accessToken = auth.accessToken.orEmpty(),
            refreshToken = auth.refreshToken.orEmpty(),
            expiresInSeconds = auth.expiresIn ?: 3600,
            userRole = role,
            adminPinCookie = adminPinCookie
        )
        pendingAdminAuth = null
        val intent = Intent(this, DashboardActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        startActivity(intent)
        finish()
    }

    private fun setAdminPinLoading(loading: Boolean) {
        binding.adminPinProgressBar.isVisible = loading
        binding.adminPinButton.isEnabled = !loading
        binding.cancelAdminPinButton.isEnabled = !loading
        binding.adminPinButton.text = if (loading) "Vérification..." else "Valider le code PIN"
    }

    private fun isAdminEmail(email: String): Boolean =
        email.trim().lowercase() in setOf("adiiopase@gmail.com", "adiopa@yahoo.fr")

    private fun setLoading(loading: Boolean) {
        binding.progressBar.isVisible = loading
        binding.loginButton.isEnabled = !loading
        binding.loginButton.text = if (loading) "Connexion..." else "Se connecter"
    }
}
