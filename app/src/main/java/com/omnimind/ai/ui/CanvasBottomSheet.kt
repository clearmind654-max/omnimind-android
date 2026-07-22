package com.omnimind.ai.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import android.webkit.WebViewClient
import com.google.android.material.bottomsheet.BottomSheetDialogFragment

class CanvasBottomSheet : BottomSheetDialogFragment() {

    private lateinit var webView: WebView
    private var htmlContent: String = ""

    companion object {
        fun newInstance(htmlContent: String): CanvasBottomSheet {
            val fragment = CanvasBottomSheet()
            val args = Bundle()
            args.putString("htmlContent", htmlContent)
            fragment.arguments = args
            return fragment
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate()
        htmlContent = arguments?.getString("htmlContent") ?: ""
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        webView = WebView(requireContext()).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = WebViewClient()
            loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null)
        }
        return webView
    }
}
