package com.omnimind.ai

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.speech.RecognizerIntent
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity
import com.omnimind.ai.bridge.WebAppInterface

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    var pendingShareText: String = ""
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    companion object {
        const val REQUEST_CODE_FILE_PICKER = 2001
        const val REQUEST_CODE_SPEECH_INPUT = 2002
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // FIX 1: Passed savedInstanceState into the super call
        super.onCreate(savedInstanceState)

        handleIncomingIntent(intent)

        webView = WebView(this)
        setContentView(webView)

        setupWebViewSettings()
        setupClients()

        webView.addJavascriptInterface(WebAppInterface(this), "AndroidNative")
        webView.loadUrl("file:///android_asset/www/index.html")
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIncomingIntent(intent)
        if (pendingShareText.isNotEmpty()) {
            webView.evaluateJavascript("window.onNativeShareReceived && window.onNativeShareReceived();", null)
        }
    }

    private fun handleIncomingIntent(intent: Intent?) {
        if (intent != null && intent.action == Intent.ACTION_SEND) {
            if ("text/plain" == intent.type || "text/html" == intent.type) {
                pendingShareText = intent.getStringExtra(Intent.EXTRA_TEXT) ?: ""
            }
        }
    }

    private fun setupWebViewSettings() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = false
            useWideViewPort = true
            loadWithOverviewMode = true
            builtInZoomControls = false
            displayZoomControls = false
            setSupportZoom(false)
            cacheMode = WebSettings.LOAD_DEFAULT
        }
    }

    private fun setupClients() {
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (pendingShareText.isNotEmpty()) {
                    webView.evaluateJavascript("window.onNativeShareReceived && window.onNativeShareReceived();", null)
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                }
                try {
                    startActivityForResult(intent, REQUEST_CODE_FILE_PICKER)
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }
        }
    }

    fun openFilePicker(mimeType: String = "*/*") {
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = mimeType
            addCategory(Intent.CATEGORY_OPENABLE)
        }
        startActivityForResult(intent, REQUEST_CODE_FILE_PICKER)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == REQUEST_CODE_FILE_PICKER) {
            if (filePathCallback != null) {
                val results = WebChromeClient.FileChooserParams.parseResult(resultCode, data)
                filePathCallback?.onReceiveValue(results)
                filePathCallback = null
            }
        } else if (requestCode == REQUEST_CODE_SPEECH_INPUT && resultCode == Activity.RESULT_OK && data != null) {
            val result = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            val spokenText = result?.get(0) ?: ""
            if (spokenText.isNotEmpty()) {
                val escaped = spokenText.replace("'", "\\'").replace("\n", "\\n")
                webView.evaluateJavascript("window.onSpeechRecognized && window.onSpeechRecognized('$escaped');", null)
            }
        }
    }

    override fun onBackPressed() {
        webView.evaluateJavascript("window.handleNativeBackPressed ? window.handleNativeBackPressed() : false") { result ->
            if (result == "false" || result == null) {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    // FIX 2: Replaced illegal 'super' callback with 'finish()'
                    this@MainActivity.finish()
                }
            }
        }
    }
}
