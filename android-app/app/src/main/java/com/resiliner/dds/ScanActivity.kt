package com.resiliner.dds

import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import java.io.File
import java.util.UUID

class ScanActivity : AppCompatActivity() {
    private val repository = MobileApiRepository()
    private lateinit var statusText: TextView
    private lateinit var scanButton: Button
    private lateinit var retryButton: Button
    private lateinit var progressBar: ProgressBar
    private var capturedFile: File? = null
    private var extractedText = ""

    private val cameraCapture = registerForActivityResult(ActivityResultContracts.TakePicture()) { captured ->
        val file = capturedFile
        if (captured && file != null) processAndUpload(file)
        else statusText.text = "Capture annulée. Vous pouvez relancer le scan."
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_scan)

        statusText = findViewById(R.id.scanStatusText)
        scanButton = findViewById(R.id.scanTriggerButton)
        retryButton = findViewById(R.id.retryScanUploadButton)
        progressBar = findViewById(R.id.scanProgressBar)
        retryButton.visibility = android.view.View.GONE

        scanButton.setOnClickListener { launchCamera() }
        retryButton.setOnClickListener {
            val file = capturedFile ?: return@setOnClickListener
            uploadScan(file, SessionManager(this).getAccessToken().orEmpty())
        }
    }

    private fun launchCamera() {
        val scansDirectory = File(cacheDir, "scans").apply { mkdirs() }
        capturedFile = File(scansDirectory, "scan-${UUID.randomUUID()}.jpg")
        val imageUri: Uri = FileProvider.getUriForFile(
            this,
            "$packageName.fileprovider",
            capturedFile!!
        )
        runCatching { cameraCapture.launch(imageUri) }
            .onFailure { error -> statusText.text = error.message ?: "Impossible d’ouvrir l’appareil photo." }
    }

    private fun processAndUpload(file: File) {
        val token = SessionManager(this).getAccessToken()
        if (token.isNullOrBlank()) {
            statusText.text = "Votre session a expiré. Reconnectez-vous."
            return
        }

        setBusy(true, "Analyse OCR du document...")
        repository.processOcr(file, "image/jpeg", token) { ocrResult ->
            extractedText = ocrResult.getOrNull().orEmpty()
            val ocrMessage = ocrResult.exceptionOrNull()?.message
            statusText.text = if (extractedText.isBlank()) {
                "OCR indisponible${ocrMessage?.let { ": $it".orEmpty() }.orEmpty()}\nEnregistrement du scan..."
            } else {
                "OCR terminé. Enregistrement du scan..."
            }
            uploadScan(file, token)
        }
    }

    private fun uploadScan(file: File, token: String) {
        if (token.isBlank()) {
            setBusy(false, "Votre session a expiré. Reconnectez-vous.")
            return
        }
        setBusy(true, "Synchronisation du scan...")
        repository.uploadDocument(file, "image/jpeg", "Administratif", token) { result ->
            setBusy(false, "")
            result.onSuccess { uploaded ->
                retryButton.visibility = android.view.View.GONE
                val preview = extractedText.trim().take(240)
                statusText.text = buildString {
                    append("Scan enregistré : ${uploaded.name}")
                    if (preview.isNotBlank()) append("\n\nTexte détecté\n$preview")
                }
                file.delete()
                capturedFile = null
            }.onFailure { error ->
                statusText.text = error.message ?: "Échec de la synchronisation du scan."
                retryButton.visibility = android.view.View.VISIBLE
            }
        }
    }

    private fun setBusy(busy: Boolean, message: String) {
        progressBar.visibility = if (busy) android.view.View.VISIBLE else android.view.View.GONE
        scanButton.isEnabled = !busy
        retryButton.isEnabled = !busy
        if (message.isNotBlank()) statusText.text = message
    }
}
