package com.omnimind.ai.services

import android.content.Context
import androidx.work.*
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.omnimind.ai.bridge.NativeBridge
import com.omnimind.ai.database.AppDatabase
import com.omnimind.ai.database.JobEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

class BackgroundWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    private val db = AppDatabase.getInstance(context)
    private val nativeBridge = NativeBridge(context)
    private val gson = Gson()

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val jobId = inputData.getString("jobId") ?: return@withContext Result.failure()
        val sessionId = inputData.getString("sessionId") ?: "default"
        val actionType = inputData.getString("actionType") ?: "direct"
        val payloadJson = inputData.getString("payloadJson") ?: "{}"

        var job = db.jobDao().getJobById(jobId)
        if (job == null) {
            job = JobEntity(
                jobId = jobId,
                sessionId = sessionId,
                actionType = actionType,
                payloadJson = payloadJson,
                status = "RUNNING"
            )
            db.jobDao().insertOrUpdateJob(job)
        } else {
            db.jobDao().updateJobStatus(jobId, "RUNNING", "")
        }

        try {
            val payload = gson.fromJson(payloadJson, JsonObject::class.java)
            val apiUrl = payload.get("apiUrl")?.asString
                ?: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
            val apiKey = payload.get("apiKey")?.asString ?: ""
            val promptText = payload.get("prompt")?.asString ?: ""

            val responseText = executeHttpRequest(apiUrl, apiKey, promptText)

            val resultJson = gson.toJson(mapOf("response" to responseText, "status" to "SUCCESS"))
            db.jobDao().updateJobStatus(jobId, "COMPLETED", resultJson)

            nativeBridge.showNotification(
                "Task Completed",
                "OmniMind job for session '$sessionId' has finished."
            )

            Result.success()
        } catch (e: Exception) {
            val errorJson = gson.toJson(mapOf("error" to (e.message ?: "Unknown background worker error"), "status" to "FAILED"))
            db.jobDao().updateJobStatus(jobId, "FAILED", errorJson)
            nativeBridge.showNotification("Task Failed", "Background execution encountered an error: ${e.message}")
            Result.failure()
        }
    }

    private fun executeHttpRequest(urlStr: String, apiKey: String, prompt: String): String {
        val fullUrlStr = if (urlStr.contains("googleapis.com") && apiKey.isNotEmpty() && !urlStr.contains("key=")) {
            if (urlStr.contains("?")) "$urlStr&key=$apiKey" else "$urlStr?key=$apiKey"
        } else {
            urlStr
        }

        val url = URL(fullUrlStr)
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.connectTimeout = 15000
        conn.readTimeout = 30000

        if (apiKey.isNotEmpty() && !urlStr.contains("googleapis.com")) {
            conn.setRequestProperty("Authorization", "Bearer $apiKey")
        }

        val requestBody = JsonObject().apply {
            val contents = com.google.gson.JsonArray()
            val contentObj = JsonObject()
            val parts = com.google.gson.JsonArray()
            val partObj = JsonObject()
            partObj.addProperty("text", prompt)
            parts.add(partObj)
            contentObj.add("parts", parts)
            contents.add(contentObj)
            add("contents", contents)
        }

        conn.doOutput = true
        OutputStreamWriter(conn.outputStream).use { writer ->
            writer.write(requestBody.toString())
            writer.flush()
        }

        val responseCode = conn.responseCode
        if (responseCode in 200..299) {
            return conn.inputStream.bufferedReader().use { it.readText() }
        } else {
            val errText = conn.errorStream?.bufferedReader()?.use { it.readText() } ?: "HTTP $responseCode"
            throw Exception("HTTP Error $responseCode: $errText")
        }
    }

    companion object {
        fun enqueueJob(context: Context, jobId: String, sessionId: String, actionType: String, payloadJson: String) {
            val inputData = Data.Builder()
                .putString("jobId", jobId)
                .putString("sessionId", sessionId)
                .putString("actionType", actionType)
                .putString("payloadJson", payloadJson)
                .build()

            val workRequest = OneTimeWorkRequestBuilder<BackgroundWorker>()
                .setInputData(inputData)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                jobId,
                ExistingWorkPolicy.REPLACE,
                workRequest
            )
        }
    }
}
