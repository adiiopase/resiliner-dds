package com.resiliner.dds

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.resiliner.dds.databinding.ActivityDashboardBinding

class DashboardActivity : AppCompatActivity() {
    private lateinit var binding: ActivityDashboardBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityDashboardBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val sessionManager = SessionManager(this)
        val email = sessionManager.getUserEmail() ?: "Compte connecté"
        val isAdmin = sessionManager.isAdminAccount()
        val hasAdminPinSession = sessionManager.hasValidAdminPinSession()

        // 1. Haut de page intact
        binding.welcomeTitle.text = if (isAdmin) "Espace administrateur" else "Bienvenue"
        binding.userEmailText.text = email
        binding.tokenLabel.text = if (isAdmin) "Double vérification validée" else "Session sécurisée"

        // 2. Section Administration conditionnelle
        binding.adminMenuSection.visibility = if (isAdmin && hasAdminPinSession) {
            android.view.View.VISIBLE
        } else {
            android.view.View.GONE
        }

        binding.billingButton.setOnClickListener { openAdminPage("billing") }
        binding.accountingButton.setOnClickListener { openAdminPage("accounting") }
        binding.usersButton.setOnClickListener { openAdminPage("users") }
        binding.bannersButton.setOnClickListener { openAdminPage("users#carousel-banners") }

        // 3. Forfaits & Licences de stockage
        binding.plansButton.setOnClickListener { showStoragePlansDialog() }

        // 4. Documents & Numérisation
        val openScan = { startActivity(Intent(this, ScanActivity::class.java)) }
        val openDocs = { startActivity(Intent(this, DocumentsActivity::class.java)) }
        val openUpload = { startActivity(Intent(this, UploadActivity::class.java)) }

        binding.scanCard.setOnClickListener { openScan() }
        binding.scanButton.setOnClickListener { openScan() }

        binding.documentsCard.setOnClickListener { openDocs() }
        binding.documentsButton.setOnClickListener { openDocs() }

        binding.uploadCard.setOnClickListener { openUpload() }
        binding.uploadButton.setOnClickListener { openUpload() }

        binding.vaultCard.setOnClickListener { showCloudVaultDialog() }

        // 5. Services & Commandes DDS
        binding.productsRow.setOnClickListener { showProductsDialog() }
        binding.orderRow.setOnClickListener { openWebPage("commande") }
        binding.quoteRow.setOnClickListener { openWebPage("devis") }
        binding.apiRow.setOnClickListener { openWebPage("api-docs") }

        // 6. Navigation Accueil
        binding.viewHomeButton.setOnClickListener {
            startActivity(Intent(this, HomeActivity::class.java))
        }

        // 7. Déconnexion
        binding.logoutButton.setOnClickListener {
            sessionManager.clear()
            val intent = Intent(this, HomeActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        }
    }

    private fun showStoragePlansDialog() {
        AlertDialog.Builder(this)
            .setTitle("💳 Forfaits & Stockage Souverain")
            .setMessage(
                "Choisissez votre formule de stockage souverain ou payez à l'usage réel :\n\n" +
                        "1️⃣ Recharge au Mo (À l'usage) :\n" +
                        "• 0,10 € TTC / Mo consommé\n" +
                        "• Sans engagement, idéal pour scans ponctuels\n\n" +
                        "2️⃣ Licence Mensuelle Pro :\n" +
                        "• 9,90 € / mois\n" +
                        "• 50 Mo inclus, Scans mobiles illimités, OCR prioritaire\n\n" +
                        "3️⃣ Licence Annuelle Entreprise :\n" +
                        "• 99,00 € / an (2 mois offerts)\n" +
                        "• Volume extensible, support VIP & archivage légal"
            )
            .setPositiveButton("Fermer", null)
            .setNeutralButton("Souscrire en ligne") { _, _ ->
                openWebPage("pricing")
            }
            .show()
    }

    private fun showCloudVaultDialog() {
        AlertDialog.Builder(this)
            .setTitle("🔒 Coffre-fort Documentaire Cloud")
            .setMessage(
                "Le Coffre-fort Cloud DDS protège vos documents sensibles avec un chiffrement souverain de bout en bout.\n\n" +
                        "• Mode Cloud ON : Synchronisation instantanée multi-appareils\n" +
                        "• Anti-Chambre : Zone tampon de vérification avant archivage\n" +
                        "• Mode Cloud OFF : Archivage hors-ligne étanche"
            )
            .setPositiveButton("Compris", null)
            .setNeutralButton("Gérer le coffre") { _, _ ->
                openWebPage("cloud-vault")
            }
            .show()
    }

    private fun showProductsDialog() {
        AlertDialog.Builder(this)
            .setTitle("📦 Catalogue Produits DDS")
            .setMessage(
                "Solutions logicielles et matérielles disponibles :\n\n" +
                        "• 📱 Studio Scanner Mobile HD\n" +
                        "• 🔍 Moteur OCR Souverain & IA d'extraction\n" +
                        "• 🔒 Coffre Cloud souverain sécurisé\n" +
                        "• ⚡ Connecteurs API REST pour ERP/CRM\n" +
                        "• 🏛️ Pack État civil & Registres légaux"
            )
            .setPositiveButton("Fermer", null)
            .setNeutralButton("Voir le catalogue") { _, _ ->
                openWebPage("produits")
            }
            .show()
    }

    private fun openWebPage(path: String) {
        val pageUrl = "${BuildConfig.MOBILE_API_BASE_URL.trimEnd('/')}/$path"
        runCatching {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(pageUrl)))
        }.onFailure {
            Toast.makeText(this, "Impossible d’ouvrir cette page.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun openAdminPage(path: String) {
        val sessionManager = SessionManager(this)
        if (!sessionManager.isAdminAccount() || !sessionManager.hasValidAdminPinSession()) {
            Toast.makeText(this, "Accès administrateur expiré. Reconnectez-vous.", Toast.LENGTH_LONG).show()
            return
        }

        openWebPage(path)
    }
}
