package com.resiliner.dds

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.ListView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class DocumentsActivity : AppCompatActivity() {
    private val repository = MobileApiRepository()
    private lateinit var listView: ListView
    private lateinit var statusText: TextView
    private lateinit var adapter: ArrayAdapter<String>
    private var documents: List<MobileDocument> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_documents)

        listView = findViewById(R.id.documentsList)
        statusText = findViewById(R.id.documentsStatusText)
        adapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, mutableListOf())
        listView.adapter = adapter
        findViewById<Button>(R.id.refreshDocumentsButton).setOnClickListener { loadDocuments() }
        listView.setOnItemClickListener { _, _, position, _ -> openDocument(position) }
        loadDocuments()
    }

    private fun loadDocuments() {
        val token = SessionManager(this).getAccessToken()
        if (token.isNullOrBlank()) {
            statusText.text = "Votre session a expiré. Reconnectez-vous."
            return
        }

        statusText.text = "Chargement de vos documents..."
        repository.loadDocuments(token) { result ->
            result.onSuccess { loadedDocuments ->
                documents = loadedDocuments
                adapter.clear()
                adapter.addAll(loadedDocuments.map { document ->
                    val size = "%.1f Ko".format(document.size_bytes / 1024.0)
                    "${document.name}\n${document.category ?: "Sans catégorie"} · $size"
                })
                statusText.text = if (loadedDocuments.isEmpty()) {
                    "Aucun document pour le moment."
                } else {
                    "${loadedDocuments.size} document(s)"
                }
            }.onFailure { error ->
                statusText.text = error.message ?: "Impossible de charger les documents."
            }
        }
    }

    private fun openDocument(position: Int) {
        val document = documents.getOrNull(position) ?: return
        val path = document.path
        val token = SessionManager(this).getAccessToken()
        if (path.isNullOrBlank() || token.isNullOrBlank()) {
            statusText.text = "Ce document ne peut pas être ouvert."
            return
        }

        statusText.text = "Préparation de l’ouverture..."
        repository.createSignedUrl(path, token) { result ->
            result.onSuccess { signedUrl ->
                statusText.text = "${documents.size} document(s)"
                runCatching {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(signedUrl)))
                }.onFailure {
                    statusText.text = "Aucune application ne peut ouvrir ce document."
                }
            }.onFailure { error ->
                statusText.text = error.message ?: "Impossible d’ouvrir le document."
            }
        }
    }
}
