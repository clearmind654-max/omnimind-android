/**
 * OmniMind UI Renderer Module (Footnote Citations & Canvas Refinement)
 */

export class Renderer {
    static escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    static renderMarkdown(text, sources = []) {
        if (!text) return '';
        let escaped = this.escapeHtml(text);

        // Footnotes [1], [2] Citation links
        escaped = escaped.replace(/\[(\d+)\]/g, (match, num) => {
            const idx = parseInt(num) - 1;
            const src = sources[idx];
            const srcUrl = src ? src.url : '#';
            const srcTitle = src ? this.escapeHtml(src.title) : `Source ${num}`;

            return `<span class="citation-footnote" title="${srcTitle}" onclick="window.openCitationPreview('${srcUrl}', '${srcTitle}')">[${num}]</span>`;
        });

        // Code blocks with Canvas Preview & Copy buttons
        escaped = escaped.replace(/```(html|css|js|javascript|json|python|bash)?\n([\s\S]*?)```/gi, (match, lang, code) => {
            const cleanLang = (lang || 'code').toLowerCase();
            const rawCode = code.trim();
            const encodedCode = encodeURIComponent(rawCode);

            let previewBtn = '';
            if (cleanLang === 'html' || cleanLang === 'js' || cleanLang === 'javascript') {
                previewBtn = `<button class="btn-canvas-preview" onclick="window.launchCanvasPreview('${encodedCode}', '${cleanLang}')">⚡ Launch Canvas</button>`;
            }

            return `<div class="code-block-container">
                <div class="code-block-header">
                    <span class="code-lang-tag">${cleanLang}</span>
                    <div class="code-actions">
                        ${previewBtn}
                        <button class="btn-copy-code" onclick="window.copyCodeToClipboard(this, '${encodedCode}')">📋 Copy</button>
                    </div>
                </div>
                <pre><code class="language-${cleanLang}">${rawCode}</code></pre>
            </div>`;
        });

        // Inline code, headers, bold, italic, line breaks
        escaped = escaped.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
        escaped = escaped.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        escaped = escaped.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        escaped = escaped.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
        escaped = escaped.replace(/\n/g, '<br>');

        return escaped;
    }

    static renderMessage(msg) {
        const isUser = msg.role === 'user';
        const avatar = isUser ? '👤' : '🧠';
        const senderName = isUser ? 'You' : (msg.senderName || 'OmniMind AI');
        const formattedTime = new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
        <div class="chat-message ${isUser ? 'user-message' : 'assistant-message'}" id="msg_${msg.id}">
            <div class="message-avatar">${avatar}</div>
            <div class="message-content-wrapper">
                <div class="message-header">
                    <span class="message-sender">${senderName}</span>
                    <span class="message-time">${formattedTime}</span>
                </div>
                <div class="message-body">${this.renderMarkdown(msg.content, msg.sources || [])}</div>
                ${msg.imageUrl ? `<div class="message-media"><img src="${msg.imageUrl}" alt="Generated Media" class="generated-image-preview" onclick="window.openImageModal('${msg.imageUrl}')" /></div>` : ''}
            </div>
        </div>`;
    }
}
