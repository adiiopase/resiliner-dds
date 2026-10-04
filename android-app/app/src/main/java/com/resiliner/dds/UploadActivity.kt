package com.resiliner.dds

import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.Spinner
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import java.io.File
import java.util.UUID

class UploadActivity : AppCompatActivity() {
    private val repository = MobileApiRepository()
    private var selectedFile: File? = null
    private var selectedDisplayName = ""
    private var selectedMimeType = "application/octet-stream"
    private lateinit var uploadButton: Button
    private lateinit var uploadHint: TextView

    private val filePicker = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) copySelectedFile(uri)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_upload)

        uploadHint = findViewById(R.id.uploadHint)
        val chooseButton = findViewById<Button>(R.id.uploadTriggerButton)
        uploadButton = findViewById(R.id.sendUploadButton)
        val categorySpinner = findViewById<Spinner>(R.id.uploadCategorySpinner)
        categorySpinner.adapter = ArrayAdapter.createFromResource(
            this,
            R.array.document_categories,
            android.R.layout.simple_spinner_item
        ).also { it.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item) }
        uploadButton.isEnabled = false

        chooseButton.setOnClickListener {
            filePicker.launch(arrayOf("application/pdf", "image/*"))
        }
        uploadButton.setOnClickListener {
            val file = selectedFile ?: return@setOnClickListener
            val token = SessionManager(this).getAccessToken()
            if (token.isNullOrBlank()) {
                uploadHint.text = "Votre session a expiré. Reconnectez-vous."
                return@setOnClickListener
            }

            val category = categorySpinner.selectedItem.toString()
            uploadButton.isEnabled = false
            uploadButton.text = "Envoi en cours..."
            repository.uploadDocument(
                file = file,
                mimeType = selectedMimeType,
                category = category,
                token = token,
                fileName = selectedDisplayName
            ) { result ->
                uploadButton.isEnabled = true
                uploadButton.text = "Envoyer le document"
                result.onSuccess { uploaded ->
                    uploadHint.text = "${uploaded.message}\n${uploaded.name} · ${"%.1f".format(uploaded.sizeBytes / 1024.0)} Ko"
                    selectedFile = null
                    selectedDisplayName = ""
                    file.delete()
                }.onFailure { error ->
                    uploadHint.text = error.message ?: "L’envoi a échoué. Réessayez."
                }
            }
        }
    }

    private fun copySelectedFile(uri: Uri) {
        selectedFile = null
        selectedDisplayName = ""
        uploadButton.isEnabled = false
        val displayName = contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val nameColumn = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (cursor.moveToFirst() && nameColumn >= 0) cursor.getString(nameColumn) else null
        } ?: "document-${UUID.randomUUID()}"
        selectedMimeType = contentResolver.getType(uri) ?: "application/octet-stream"
        val extension = displayName.substringAfterLast('.', "bin").takeIf { it != displayName } ?: "bin"
        val file = File(cacheDir, "upload-${UUID.randomUUID()}.$extension")

        runCatching {
            contentResolver.openInputStream(uri)?.use { input ->
                file.outputStream().use { output -> input.copyTo(output) }
            }
                ?: error("Impossible de lire le fichier sélectionné.")
        }.onSuccess {
            selectedFile = file
            selectedDisplayName = displayName
            uploadHint.text = "$displayName\nPrêt à être envoyé."
            uploadButton.isEnabled = true
        }.onFailure { error ->
            file.delete()
            uploadHint.text = error.message ?: "Impossible de lire ce fichier."
            uploadButton.isEnabled = false
        }
    }
}
