/**
 * OmniMind Browser Automation Engine
 */

export class BrowserEngine {
    constructor() {
        this.iframe = null;
    }

    init() {
        if (!this.iframe) {
            this.iframe = document.createElement('iframe');
            this.iframe.id = 'omnimind_hidden_browser';
            this.iframe.style.display = 'none';
            this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
            document.body.appendChild(this.iframe);
        }
    }

    async readPage(url) {
        try {
            const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const html = await res.text();
            
            // Extract title and main text content using DOMParser
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Remove script and style tags
            doc.querySelectorAll('script, style, noscript, svg, header, footer, nav').forEach(el => el.remove());
            
            const title = doc.title || url;
            const bodyText = doc.body?.innerText || doc.body?.textContent || '';
            const cleanedText = bodyText.replace(/\s+/g, ' ').trim().slice(0, 4000);

            return {
                title,
                url,
                content: cleanedText,
                length: cleanedText.length
            };
        } catch (e) {
            return {
                title: url,
                url,
                content: `Failed to fetch page directly: ${e.message}`,
                error: true
            };
        }
    }

    async extractData(url, querySelector) {
        const page = await this.readPage(url);
        if (page.error) return page;

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(page.content, 'text/html');
            const elements = Array.from(doc.querySelectorAll(querySelector || 'p, h1, h2, h3, li'));
            const extracted = elements.map(el => el.textContent.trim()).filter(Boolean).join('\n');
            return {
                url,
                selector: querySelector,
                data: extracted || page.content
            };
        } catch (e) {
            return page;
        }
    }
}
