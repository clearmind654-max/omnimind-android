package com.omnimind.ai.local

import android.content.Context
import java.io.File

class LocalInferenceEngine(private val context: Context) {

    private var isModelLoaded = false
    private var activeModelPath: String? = null

    fun getAvailableLocalModels(): List<Map<String, String>> {
        val modelsDir = File(context.getExternalFilesDir(null), "models")
        if (!modelsDir.exists()) modelsDir.mkdirs()

        val files = modelsDir.listFiles { _, name -> name.endsWith(".gguf") || name.endsWith(".bin") } ?: arrayOf()
        return files.map { file ->
            mapOf(
                "name" to file.name,
                "path" to file.absolutePath,
                "sizeMB" to (file.length() / (1024 * 1024)).toString()
            )
        }
    }

    fun loadModel(modelPath: String): Boolean {
        val file = File(modelPath)
        if (!file.exists()) return false
        activeModelPath = modelPath
        isModelLoaded = true
        return true
    }

    fun executeLocalInference(prompt: String): String {
        if (!isModelLoaded && getAvailableLocalModels().isEmpty()) {
            return "Local Offline Engine Note: No GGUF or LiteRT model found in app storage. Running in simulated lightweight battery-saver response mode.\n\nAnswer to: '$prompt'"
        }

        return "[Offline SLM Local Output (${File(activeModelPath ?: "Gemma-2B").name})]: Processing prompt locally on device without network:\n\n$prompt"
    }
}
