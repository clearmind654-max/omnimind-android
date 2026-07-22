/**
 * OmniMind Adapters, Local Offline Engine & Dynamic Model Resolver
 */

export async function resolveGeminiModel(apiKey, preferredModel = 'auto') {
    if (preferredModel !== 'auto' && preferredModel) return preferredModel;
    if (!apiKey) return 'gemini-1.5-flash';
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.models) return 'gemini-1.5-flash';
        
        const valid = data.models.filter(m => m.supportedGenerationMethods?.includes('generateContent'));
        const priority = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
        for (const target of priority) {
            const match = valid.find(m => m.name && m.name.includes(target));
            if (match) return match.name.replace(/^models\//, '');
        }
        return valid[0]?.name.replace(/^models\//, '') || 'gemini-1.5-flash';
    } catch (e) {
        return 'gemini-1.5-flash';
    }
}

export class ChatAdapter {
    async execute(connector, messages, options = {}) {
        // Offline / Airplane Mode check
        if (options.offlineMode || (navigator.onLine === false)) {
            return await this.executeLocalSLM(messages);
        }

        const type = connector.type || 'gemini';
        if (type === 'local') {
            return await this.executeLocalSLM(messages);
        } else if (type === 'gemini') {
            return await this.executeGemini(connector, messages, options);
        } else {
            return await this.executeOpenAICompatible(connector, messages, options);
        }
    }

    async executeLocalSLM(messages) {
        const lastMsg = messages[messages.length - 1]?.content || 'Hello';
        if (window.AndroidNative && typeof window.AndroidNative.executeLocalInference === 'function') {
            return window.AndroidNative.executeLocalInference(lastMsg);
        }
        return `[Local Offline SLM Simulation Mode]: Processing on-device without internet.\n\nAnswer to: "${lastMsg}"`;
    }

    async executeGemini(connector, messages, options = {}) {
        const apiKey = connector.apiKey || options.globalApiKey || '';
        const model = await resolveGeminiModel(apiKey, connector.model || options.preferredModel || 'auto');
        const url = `${connector.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'}/models/${model}:generateContent?key=${apiKey}`;

        let systemInstruction = null;
        const contents = [];

        for (const msg of messages) {
            if (msg.role === 'system') {
                systemInstruction = { parts: [{ text: msg.content }] };
            } else {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                });
            }
        }

        const bodyPayload = {
            contents,
            generationConfig: {
                temperature: connector.temperature || options.temperature || 0.7,
                topP: connector.topP || options.topP || 0.9,
                maxOutputTokens: connector.maxTokens || options.maxTokens || 2048
            }
        };

        if (systemInstruction) bodyPayload.systemInstruction = systemInstruction;
        if (options.jsonMode) bodyPayload.generationConfig.responseMimeType = "application/json";

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini API Error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    }

    async executeOpenAICompatible(connector, messages, options = {}) {
        const apiKey = connector.apiKey || options.globalOpenRouterKey || '';
        const baseUrl = connector.baseUrl || 'https://openrouter.ai/api/v1';
        const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/chat/completions`;
        const model = connector.model || 'openrouter/free';

        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        if (baseUrl.includes('openrouter.ai')) {
            headers['HTTP-Referer'] = 'https://omnimind.ai';
            headers['X-Title'] = 'OmniMind AI Android';
        }

        const formattedMessages = messages.map(m => ({ role: m.role, content: m.content }));

        const body = {
            model,
            messages: formattedMessages,
            temperature: connector.temperature || options.temperature || 0.7,
            top_p: connector.topP || options.topP || 0.9,
            max_tokens: connector.maxTokens || options.maxTokens || 2048
        };

        if (options.jsonMode) body.response_format = { type: "json_object" };

        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`OpenAI Compatible API Error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content || '';
    }
}

export class ImageAdapter {
    async execute(connector, prompt, options = {}) {
        const width = options.width || 1024;
        const height = options.height || 1024;
        const encodedPrompt = encodeURIComponent(prompt);

        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${Math.floor(Math.random() * 1000000)}&nologo=true`;
        return { imageUrl, prompt };
    }
}
