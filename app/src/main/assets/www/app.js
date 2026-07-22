/**
 * OmniMind Main Application Orchestrator & UI Controller (Free & Native Focus)
 */

import { Storage } from './lib/storage.js';
import { ConnectorRegistry } from './lib/connectors.js';
import { ChatAdapter, ImageAdapter } from './lib/adapters.js';
import { optimizePrompt } from './lib/enhancer.js';
import { MemoryManager } from './lib/memory.js';
import { Orchestrator } from './lib/orchestrator.js';
import { BrowserEngine } from './lib/browser.js';
import { PersonaManager } from './lib/personas.js';
import { FolderManager } from './lib/folders.js';
import { VoiceController } from './lib/voice.js';
import { Renderer } from './lib/renderer.js';

class OmniMindApp {
    constructor() {
        this.registry = new ConnectorRegistry();
        this.chatAdapter = new ChatAdapter();
        this.imageAdapter = new ImageAdapter();
        this.memory = new MemoryManager();
        this.browser = new BrowserEngine();
        this.personas = new PersonaManager();
        this.folders = new FolderManager();
        this.voice = null;
        this.orchestrator = null;

        this.currentSessionId = 'session_default';
        this.sessions = [];
        this.messages = [];
        this.activeModel = 'openrouter/free';
        this.isIncognito = false;
        this.lastRenderedCode = '';

        this.elements = {};
    }

    async init() {
        this.bindElements();
        await this.registry.init();
        await this.memory.init();
        await this.personas.init();
        await this.folders.init();
        this.browser.init();

        this.voice = new VoiceController((state) => this.handleVoiceStateChange(state));
        this.orchestrator = new Orchestrator(this.registry, this.chatAdapter, this.memory, this.browser);

        await this.loadSessions();
        await this.loadCurrentSession();
        this.setupEventListeners();
        this.registerGlobalWindowHooks();
        this.populateMentionPopup();
        this.populatePersonasDropdown();

        this.checkPendingShareText();
    }

    bindElements() {
        this.elements = {
            appHeader: document.querySelector('.app-header'),
            btnToggleDrawer: document.getElementById('btn-toggle-drawer'),
            sidebarDrawer: document.getElementById('sidebar-drawer'),
            drawerBackdrop: document.getElementById('drawer-backdrop'),
            btnNewChat: document.getElementById('btn-new-chat'),
            sessionsList: document.getElementById('sessions-list'),
            activeSessionTitle: document.getElementById('active-session-title'),
            modelSelector: document.getElementById('model-selector'),
            toggleIncognito: document.getElementById('toggle-incognito'),
            btnOpenSettings: document.getElementById('btn-open-settings'),
            btnCloseSettings: document.getElementById('btn-close-settings'),
            settingsModal: document.getElementById('settings-modal'),
            chatStream: document.getElementById('chat-stream'),
            chatForm: document.getElementById('chat-form'),
            userInput: document.getElementById('user-input'),
            btnSend: document.getElementById('btn-send'),
            btnAttachFile: document.getElementById('btn-attach-file'),
            btnVoiceInput: document.getElementById('btn-voice-input'),
            togglePromptEnhancer: document.getElementById('toggle-prompt-enhancer'),
            mentionPopup: document.getElementById('mention-popup'),
            mentionItems: document.getElementById('mention-items'),
            commandPopup: document.getElementById('command-popup'),
            workerCardsContainer: document.getElementById('worker-cards-container'),
            canvasModal: document.getElementById('canvas-modal'),
            canvasIframe: document.getElementById('canvas-iframe'),
            canvasRefineInput: document.getElementById('canvas-refine-input'),
            btnSendCanvasRefine: document.getElementById('btn-send-canvas-refine'),
            btnRefreshCanvas: document.getElementById('btn-refresh-canvas'),
            btnCloseCanvas: document.getElementById('btn-close-canvas'),
            voiceModal: document.getElementById('voice-modal'),
            voiceOrb: document.getElementById('voice-orb'),
            voiceStatusText: document.getElementById('voice-status-text'),
            btnTriggerMic: document.getElementById('btn-trigger-mic'),
            btnCloseVoice: document.getElementById('btn-close-voice'),
            personaSelector: document.getElementById('persona-selector'),
            inputGeminiKey: document.getElementById('input-gemini-key'),
            inputOpenRouterKey: document.getElementById('input-openrouter-key'),
            btnViewMemory: document.getElementById('btn-view-memory'),
            btnViewConnectors: document.getElementById('btn-view-connectors'),
            btnClearMemory: document.getElementById('btn-clear-memory'),
            memoryListUi: document.getElementById('memory-list-ui')
        };
    }

    setupEventListeners() {
        this.elements.btnToggleDrawer.addEventListener('click', () => this.toggleDrawer(true));
        this.elements.drawerBackdrop.addEventListener('click', () => this.toggleDrawer(false));
        this.elements.btnNewChat.addEventListener('click', () => this.createNewSession());

        this.elements.modelSelector.addEventListener('change', (e) => this.activeModel = e.target.value);

        // Incognito Toggle
        this.elements.toggleIncognito.addEventListener('change', (e) => {
            this.isIncognito = e.target.checked;
            document.body.classList.toggle('incognito-mode', this.isIncognito);
            if (this.isIncognito) {
                this.elements.activeSessionTitle.innerText = '🕶️ Incognito Session (RAM Only)';
                this.messages = [];
                this.renderChatStream();
            } else {
                this.loadCurrentSession();
            }
        });

        // Chat Form Submit
        this.elements.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserSubmit();
        });

        this.elements.userInput.addEventListener('input', () => {
            this.handleInputKeypress();
            this.autoResizeTextarea();
        });

        // Settings Modal
        this.elements.btnOpenSettings.addEventListener('click', () => this.openSettingsModal());
        this.elements.btnCloseSettings.addEventListener('click', () => this.closeSettingsModal());

        // Voice Controls
        this.elements.btnVoiceInput.addEventListener('click', () => this.openVoiceModal());
        this.elements.btnCloseVoice.addEventListener('click', () => this.closeVoiceModal());
        this.elements.btnTriggerMic.addEventListener('click', () => this.voice.startListening());

        // Canvas & Refinement
        this.elements.btnCloseCanvas.addEventListener('click', () => this.toggleCanvasModal(false));
        this.elements.btnRefreshCanvas.addEventListener('click', () => {
            this.elements.canvasIframe.srcdoc = this.elements.canvasIframe.srcdoc;
        });
        this.elements.btnSendCanvasRefine.addEventListener('click', () => this.handleCanvasRefining());

        // Persona selector
        this.elements.personaSelector.addEventListener('change', (e) => {
            this.personas.setActive(e.target.value);
        });

        // File attachment
        this.elements.btnAttachFile.addEventListener('click', () => {
            if (window.AndroidNative && typeof window.AndroidNative.pickFile === 'function') {
                window.AndroidNative.pickFile('*/*');
            }
        });

        this.elements.btnViewMemory.addEventListener('click', () => {
            this.toggleDrawer(false);
            this.openSettingsModal();
        });
    }

    toggleDrawer(open) {
        this.elements.sidebarDrawer.classList.toggle('open', open);
        this.elements.drawerBackdrop.classList.toggle('open', open);
    }

    autoResizeTextarea() {
        const input = this.elements.userInput;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }

    handleInputKeypress() {
        const val = this.elements.userInput.value;
        if (val.startsWith('@') && !val.includes(' ')) {
            this.elements.mentionPopup.classList.remove('hidden');
            this.elements.commandPopup.classList.add('hidden');
        } else if (val.startsWith('/') && !val.includes(' ')) {
            this.elements.commandPopup.classList.remove('hidden');
            this.elements.mentionPopup.classList.add('hidden');
        } else {
            this.elements.mentionPopup.classList.add('hidden');
            this.elements.commandPopup.classList.add('hidden');
        }
    }

    populateMentionPopup() {
        const enabled = this.registry.getEnabled();
        this.elements.mentionItems.innerHTML = enabled.map(c => `
            <div class="popup-item" onclick="window.selectMention('@${c.id}')">
                <strong>@${c.id}</strong>
                <span>${c.name}</span>
            </div>
        `).join('');
    }

    populatePersonasDropdown() {
        const list = this.personas.getAll();
        this.elements.personaSelector.innerHTML = list.map(p => `
            <option value="${p.id}">${p.name}</option>
        `).join('');
    }

    async loadSessions() {
        const stored = await Storage.getItem('omnimind_sessions_list', [
            { id: 'session_default', title: 'General AI Workspace', updatedAt: Date.now() }
        ]);
        this.sessions = stored;
        this.renderSessionsList();
    }

    renderSessionsList() {
        this.elements.sessionsList.innerHTML = this.sessions.map(s => `
            <div class="session-item ${s.id === this.currentSessionId ? 'active' : ''}" onclick="window.switchSession('${s.id}')">
                <span>💬 ${Renderer.escapeHtml(s.title)}</span>
            </div>
        `).join('');
    }

    async createNewSession() {
        const newId = `session_${Date.now()}`;
        const newSession = { id: newId, title: `Chat ${this.sessions.length + 1}`, updatedAt: Date.now() };
        this.sessions.unshift(newSession);
        if (!this.isIncognito) await Storage.setItem('omnimind_sessions_list', this.sessions);
        this.toggleDrawer(false);
        await this.switchSession(newId);
    }

    async switchSession(sessionId) {
        this.currentSessionId = sessionId;
        this.renderSessionsList();
        const current = this.sessions.find(s => s.id === sessionId);
        this.elements.activeSessionTitle.innerText = this.isIncognito ? '🕶️ Incognito Session' : (current ? current.title : 'OmniMind AI');
        await this.loadCurrentSession();
    }

    async loadCurrentSession() {
        if (this.isIncognito) return;
        const savedMsgs = await Storage.getItem(`chat_history_${this.currentSessionId}`, []);
        this.messages = savedMsgs;
        this.renderChatStream();
    }

    async saveCurrentSession() {
        if (this.isIncognito) return;
        await Storage.setItem(`chat_history_${this.currentSessionId}`, this.messages);
    }

    renderChatStream() {
        if (this.messages.length === 0) {
            this.elements.chatStream.innerHTML = `
                <div class="welcome-card">
                    <div class="welcome-icon">🧠</div>
                    <h2>OmniMind AI Hub</h2>
                    <p>Universal AI orchestrator, deep research engine, and native full-duplex voice assistant.</p>
                    <div class="quick-chips">
                        <button class="chip-btn" onclick="window.insertQuickText('/research Quantum Computing Breakthroughs')">🔍 /research Quantum</button>
                        <button class="chip-btn" onclick="window.insertQuickText('/compare Explain quantum mechanics vs relativity')">⚡ /compare Physics</button>
                        <button class="chip-btn" onclick="window.insertQuickText('Generate an image of a cybernetic neon panther in rain')">🎨 Free Image</button>
                        <button class="chip-btn" onclick="window.openVoiceModal()">🎙️ Voice Assistant</button>
                    </div>
                </div>`;
            return;
        }

        this.elements.chatStream.innerHTML = this.messages.map(m => Renderer.renderMessage(m)).join('');
        this.elements.chatStream.scrollTop = this.elements.chatStream.scrollHeight;
    }

    async handleUserSubmit(overrideText = null) {
        const rawText = (overrideText || this.elements.userInput.value).trim();
        if (!rawText) return;

        this.elements.userInput.value = '';
        this.elements.userInput.style.height = 'auto';
        this.elements.mentionPopup.classList.add('hidden');
        this.elements.commandPopup.classList.add('hidden');

        if (rawText.startsWith('/clear')) {
            this.messages = [];
            await this.saveCurrentSession();
            this.renderChatStream();
            return;
        }

        const userMsg = { id: `msg_${Date.now()}`, role: 'user', content: rawText, timestamp: Date.now() };
        this.messages.push(userMsg);
        this.renderChatStream();
        await this.saveCurrentSession();

        let directBypassConnector = null;
        let cleanedPrompt = rawText;

        if (rawText.startsWith('@')) {
            const parts = rawText.split(' ');
            const mentionTag = parts[0].substring(1);
            directBypassConnector = this.registry.getById(mentionTag);
            cleanedPrompt = parts.slice(1).join(' ');
        }

        const isImageReq = /generate (an|a)? image|create (an|a)? image|draw|photo of/i.test(cleanedPrompt);
        if (isImageReq) {
            await this.handleImageGeneration(cleanedPrompt);
            return;
        }

        const geminiKey = await Storage.getItem('gemini_api_key', '');
        const openRouterKey = await Storage.getItem('openrouter_api_key', '');

        const assistantMsgId = `msg_${Date.now() + 1}`;
        const assistantMsg = {
            id: assistantMsgId,
            role: 'assistant',
            senderName: 'OmniMind Manager',
            content: '⏳ *Evaluating task plan...*',
            timestamp: Date.now()
        };
        this.messages.push(assistantMsg);
        this.renderChatStream();

        try {
            const executionResult = await this.orchestrator.planAndExecute(cleanedPrompt, {
                directBypassConnector,
                preferredModel: this.activeModel,
                isIncognito: this.isIncognito,
                persona: this.personas.getActive(),
                globalApiKey: geminiKey,
                globalOpenRouterKey: openRouterKey,
                history: this.messages.slice(0, -2)
            }, (progress) => {
                if (progress.status === 'RUNNING_TASK' || progress.status === 'SEARCHING' || progress.status === 'SYNTHESIZING') {
                    assistantMsg.content = `⏳ *${progress.message || progress.taskName}*`;
                    this.renderChatStream();
                }
            });

            assistantMsg.content = executionResult.text;
            if (executionResult.sources) assistantMsg.sources = executionResult.sources;
            assistantMsg.senderName = executionResult.connector ? executionResult.connector.name : 'OmniMind AI';

            this.renderChatStream();
            await this.saveCurrentSession();

            // Speak response if Voice mode was active
            if (this.voice.state === 'THINKING' || this.voice.state === 'SPEAKING') {
                this.voice.speak(executionResult.text);
            }

        } catch (e) {
            assistantMsg.content = `❌ **Execution Error:** ${e.message}`;
            this.renderChatStream();
            await this.saveCurrentSession();
        }
    }

    async handleImageGeneration(rawPrompt) {
        const primaryConn = this.registry.getEnabled()[0];
        let finalPrompt = rawPrompt;
        if (this.elements.togglePromptEnhancer.checked) {
            finalPrompt = await optimizePrompt(rawPrompt, 'Image', this.chatAdapter, primaryConn);
        }

        const imgConn = this.registry.getBySkill('image')[0] || { type: 'image_gen', baseUrl: 'https://image.pollinations.ai/prompt' };
        const result = await this.imageAdapter.execute(imgConn, finalPrompt);

        const imgMsg = {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            senderName: 'Pollinations Flux (Free)',
            content: `🎨 **Enhanced Prompt:** *${finalPrompt}*`,
            imageUrl: result.imageUrl,
            timestamp: Date.now()
        };
        this.messages.push(imgMsg);
        this.renderChatStream();
        await this.saveCurrentSession();
    }

    async handleCanvasRefining() {
        const refineInstruction = this.elements.canvasRefineInput.value.trim();
        if (!refineInstruction || !this.lastRenderedCode) return;

        this.elements.canvasRefineInput.value = '';
        const refinePrompt = `Update the following HTML/JS code according to this instruction: "${refineInstruction}"\n\nEXISTING CODE:\n${this.lastRenderedCode}\n\nOUTPUT ONLY THE UPDATED COMPLETE HTML CODE.`;

        const conn = this.registry.getEnabled()[0];
        const updatedCode = await this.chatAdapter.execute(conn, [{ role: 'user', content: refinePrompt }]);
        this.toggleCanvasModal(true, updatedCode, 'html');
    }

    openVoiceModal() {
        this.elements.voiceModal.classList.remove('hidden');
        this.voice.startListening();
    }

    closeVoiceModal() {
        this.voice.stopSpeaking();
        this.elements.voiceModal.classList.add('hidden');
    }

    handleVoiceStateChange(state) {
        this.elements.voiceOrb.className = `voice-orb ${state.toLowerCase()}`;
        this.elements.voiceStatusText.innerText = state === 'LISTENING' ? 'Listening...' : state === 'THINKING' ? 'Thinking...' : state === 'SPEAKING' ? 'Speaking...' : 'Tap mic to speak';
    }

    openSettingsModal() {
        this.renderConnectorsUI();
        this.renderMemoryUI();
        this.elements.settingsModal.classList.remove('hidden');
    }

    closeSettingsModal() {
        this.elements.settingsModal.classList.add('hidden');
    }

    renderConnectorsUI() {
        const connectors = this.registry.getAll();
        document.getElementById('connectors-list-ui').innerHTML = connectors.map(c => `
            <div class="worker-card" style="margin-top:6px;">
                <div class="worker-header">
                    <strong>${Renderer.escapeHtml(c.name)}</strong>
                    <span class="worker-status-badge badge-${c.isEnabled ? 'completed' : 'failed'}">${c.isEnabled ? 'ACTIVE' : 'DISABLED'}</span>
                </div>
                <div style="font-size:11px; color:var(--text-muted);">Model: <code>${c.model}</code></div>
            </div>
        `).join('');
    }

    renderMemoryUI() {
        const memories = this.memory.memories;
        document.getElementById('memory-list-ui').innerHTML = memories.length === 0 ?
            `<p style="font-size:12px; color:var(--text-muted);">No long-term memories extracted yet.</p>` :
            memories.map(m => `<div class="worker-card" style="margin-top:6px;"><div style="font-size:12px;">${Renderer.escapeHtml(m.content)}</div></div>`).join('');
    }

    toggleCanvasModal(open, code = '', lang = '') {
        if (open) {
            this.lastRenderedCode = code;
            let docHtml = code;
            if (lang === 'js' || lang === 'javascript') {
                docHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>${code}<\/script></body></html>`;
            }
            this.elements.canvasIframe.srcdoc = docHtml;
            this.elements.canvasModal.classList.remove('hidden');
        } else {
            this.elements.canvasModal.classList.add('hidden');
            this.elements.canvasIframe.srcdoc = '';
        }
    }

    checkPendingShareText() {
        if (window.AndroidNative && typeof window.AndroidNative.getPendingShareText === 'function') {
            const shared = window.AndroidNative.getPendingShareText();
            if (shared && shared.trim().length > 0) {
                this.elements.userInput.value = `[Shared Context]: ${shared}`;
                this.autoResizeTextarea();
            }
        }
    }

    registerGlobalWindowHooks() {
        window.switchSession = (id) => this.switchSession(id);
        window.openVoiceModal = () => this.openVoiceModal();
        window.insertQuickText = (txt) => {
            this.elements.userInput.value = txt;
            this.autoResizeTextarea();
        };
        window.selectMention = (tag) => {
            this.elements.userInput.value = tag + ' ';
            this.elements.mentionPopup.classList.add('hidden');
        };
        window.selectCommand = (cmd) => {
            this.elements.userInput.value = cmd + ' ';
            this.elements.commandPopup.classList.add('hidden');
        };
        window.launchCanvasPreview = (encodedCode, lang) => {
            const decoded = decodeURIComponent(encodedCode);
            this.toggleCanvasModal(true, decoded, lang);
        };
        window.copyCodeToClipboard = (btn, encodedCode) => {
            const decoded = decodeURIComponent(encodedCode);
            navigator.clipboard.writeText(decoded).then(() => {
                btn.innerText = '✅ Copied!';
                setTimeout(() => btn.innerText = '📋 Copy', 2000);
            });
        };
        window.onSpeechRecognized = (text) => {
            if (this.elements.voiceModal.classList.contains('hidden')) {
                this.elements.userInput.value = (this.elements.userInput.value + ' ' + text).trim();
                this.autoResizeTextarea();
            } else {
                this.voice.setState('THINKING');
                this.handleUserSubmit(text);
            }
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new OmniMindApp();
    app.init();
});
