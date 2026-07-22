package com.omnimind.ai.bridge

import android.webkit.JavascriptInterface
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.omnimind.ai.MainActivity
import com.omnimind.ai.database.AppDatabase
import com.omnimind.ai.database.JobEntity
import com.omnimind.ai.local.LocalInferenceEngine
import com.omnimind.ai.services.BackgroundWorker
import com.omnimind.ai.ui.CanvasBottomSheet
import com.omnimind.ai.utils.SecurityHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking

class WebAppInterface(private val activity: MainActivity) {

    private val db = AppDatabase.getInstance(activity)
    private val nativeBridge = NativeBridge(activity)
    private val localEngine = LocalInferenceEngine(activity)
    private val gson = Gson()

    @JavascriptInterface
    fun saveData(key: String, value: String): Boolean {
        return try {
            SecurityHelper.saveEncrypted(activity, key, value)
            true
        } catch (e: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun getData(key: String): String {
        return SecurityHelper.getDecrypted(activity, key, "")
    }

    @JavascriptInterface
    fun speakNativeText(text: String, lang: String = "en") {
        nativeBridge.speakText(text, lang)
    }

    @JavascriptInterface
    fun stopNativeSpeech() {
        nativeBridge.stopSpeaking()
    }

    @JavascriptInterface
    fun executeNativeIntent(actionType: String, paramsJson: String): Boolean {
        return try {
            val json = gson.fromJson(paramsJson, JsonObject::class.java)
            when (actionType) {
                "email" -> nativeBridge.systemActionHandler.draftEmail(
                    json.get("to")?.asString ?: "",
                    json.get("subject")?.asString ?: "",
                    json.get("body")?.asString ?: ""
                )
                "alarm" -> nativeBridge.systemActionHandler.setAlarm(
                    json.get("message")?.asString ?: "OmniMind Alarm",
                    json.get("hour")?.asInt ?: 8,
                    json.get("minute")?.asInt ?: 0
                )
                "calendar" -> nativeBridge.systemActionHandler.createCalendarEvent(
                    json.get("title")?.asString ?: "OmniMind Event",
                    json.get("description")?.asString ?: ""
                )
                else -> false
            }
        } catch (e: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun executeLocalInference(prompt: String): String {
        return localEngine.executeLocalInference(prompt)
    }

    @JavascriptInterface
    fun openCanvasBottomSheet(htmlContent: String) {
        activity.runOnUiThread {
            val bottomSheet = CanvasBottomSheet.newInstance(htmlContent)
            bottomSheet.show(activity.supportFragmentManager, "CanvasBottomSheet")
        }
    }

    @JavascriptInterface
    fun enqueueBackgroundJob(jobJson: String): String {
        return try {
            val jsonObject = gson.fromJson(jobJson, JsonObject::class.java)
            val jobId = jsonObject.get("jobId")?.asString ?: "job_${System.currentTimeMillis()}"
            val sessionId = jsonObject.get("sessionId")?.asString ?: "default"
            val actionType = jsonObject.get("actionType")?.asString ?: "direct"
            val payloadJson = jsonObject.get("payload")?.toString() ?: "{}"

            val job = JobEntity(
                jobId = jobId,
                sessionId = sessionId,
                actionType = actionType,
                payloadJson = payloadJson,
                status = "PENDING"
            )

            runBlocking(Dispatchers.IO) {
                db.jobDao().insertOrUpdateJob(job)
            }

            BackgroundWorker.enqueueJob(activity, jobId, sessionId, actionType, payloadJson)
            jobId
        } catch (e: Exception) {
            "ERROR: ${e.message}"
        }
    }

    @JavascriptInterface
    fun getJobStatus(jobId: String): String {
        return runBlocking(Dispatchers.IO) {
            val job = db.jobDao().getJobById(jobId)
            if (job != null) gson.toJson(job) else "{}"
        }
    }

    @JavascriptInterface
    fun getAllJobs(sessionId: String): String {
        return runBlocking(Dispatchers.IO) {
            val jobs = db.jobDao().getJobsForSession(sessionId)
            gson.toJson(jobs)
        }
    }

    @JavascriptInterface
    fun showNotification(title: String, message: String) {
        nativeBridge.showNotification(title, message)
    }

    @JavascriptInterface
    fun openShareSheet(text: String) {
        nativeBridge.shareText(text)
    }

    @JavascriptInterface
    fun startSpeechToText() {
        nativeBridge.triggerSpeechToText()
    }

    @JavascriptInterface
    fun getPendingShareText(): String {
        val sharedText = activity.pendingShareText
        activity.pendingShareText = ""
        return sharedText
    }
}
