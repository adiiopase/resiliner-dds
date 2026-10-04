package com.resiliner.dds

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.resiliner.dds.databinding.ActivityHomeBinding

class HomeActivity : AppCompatActivity() {
    private lateinit var binding: ActivityHomeBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val sessionManager = SessionManager(this)
        val isLoggedIn = sessionManager.isLoggedIn() && !sessionManager.isAccessTokenExpired()

        if (isLoggedIn) {
            binding.topPortalButton.text = "Mon Espace"
            binding.heroPortalButton.text = "📊 Accéder à mon Tableau de bord"
            binding.footerPortalButton.text = "📊 Ouvrir mon Tableau de bord"
        }

        val openPortalAction = {
            if (isLoggedIn) {
                startActivity(Intent(this, DashboardActivity::class.java))
            } else {
                startActivity(Intent(this, LoginActivity::class.java))
            }
        }

        binding.topPortalButton.setOnClickListener { openPortalAction() }
        binding.heroPortalButton.setOnClickListener { openPortalAction() }
        binding.footerPortalButton.setOnClickListener { openPortalAction() }

        binding.heroServicesButton.setOnClickListener {
            binding.homeScrollView.smoothScrollTo(0, binding.sectionSolution.top - 40)
        }

        binding.pillServices.setOnClickListener {
            binding.homeScrollView.smoothScrollTo(0, binding.sectionSolution.top - 40)
        }

        binding.pillProduits.setOnClickListener {
            showProductsDialog()
        }

        binding.pillTarifs.setOnClickListener {
            binding.homeScrollView.smoothScrollTo(0, binding.sectionTarifs.top - 40)
        }

        binding.pillAbout.setOnClickListener {
            showAboutDialog()
        }
    }

    private fun showProductsDialog() {
        AlertDialog.Builder(this)
            .setTitle("📦 Catalogue Produits DDS")
            .setMessage(
                "Digital Docs Solutions propose une suite complète de solutions souveraines :\n\n" +
                        "• 📱 Studio Scanner Mobile HD\n" +
                        "• 🔍 Moteur OCR & Extraction IA\n" +
                        "• 🔒 Coffre-fort documentaire Cloud souverain\n" +
                        "• ⚡ Connecteurs API REST & Automatisation ERP\n" +
                        "• 🏛️ Module de Gestion de l'état civil & Registres"
            )
            .setPositiveButton("Fermer", null)
            .setNeutralButton("Voir en ligne") { _, _ ->
                val url = "${BuildConfig.MOBILE_API_BASE_URL.trimEnd('/')}/produits"
                runCatching {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                }
            }
            .show()
    }

    private fun showAboutDialog() {
        AlertDialog.Builder(this)
            .setTitle("ℹ️ À propos de Digital Docs Solutions")
            .setMessage(
                "Digital Docs Solutions est votre partenaire de confiance pour la numérisation, " +
                        "l'archivage légal et le traitement intelligent de vos documents.\n\n" +
                        "✓ Hébergement 100% sécurisé et conforme RGPD\n" +
                        "✓ Chiffrement de bout en bout des fichiers\n" +
                        "✓ Tarification transparente à l'usage réel (0,10 € / Mo)"
            )
            .setPositiveButton("Compris", null)
            .show()
    }
}
