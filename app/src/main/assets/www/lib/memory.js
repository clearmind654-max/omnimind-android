/**
 * OmniMind Long-Term Memory & Context Extractor
 */

import { Storage } from './storage.js';

const MEMORY_STORAGE_KEY = 'omnimind_memories_v2';

export class MemoryManager {
    constructor() {
        this.memories = [];
    }

    async init() {
        this.memories = await Storage.getItem(MEMORY_STORAGE_KEY, []);
    }

    async save() {
        await Storage.setItem(MEMORY_STORAGE_KEY, this.memories);
    }

    async addMemory(category, content, confidence = 1.0) {
        if (!content || content.trim().length === 0) return;
        const memory = {
            id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            category,
            content: content.trim(),
            timestamp: Date.now(),
            confidence
        };
        this.memories.unshift(memory);
        if (this.memories.length > 100) this.memories = this.memories.slice(0, 100);
        await this.save();
        return memory;
    }

    async deleteMemory(id) {
        this.memories = this.memories.filter(m => m.id !== id);
        await this.save();
    }

    async clearAll() {
        this.memories = [];
        await this.save();
    }

    getMemoryContext() {
        if (this.memories.length === 0) return '';
        const items = this.memories.slice(0, 15).map(m => `- [${m.category.toUpperCase()}] ${m.content}`);
        return `USER LONG-TERM MEMORY & CONTEXT:\n${items.join('\n')}\n`;
    }

    async extractAndStore(userText, assistantText, llmAdapter, connector) {
        if (!llmAdapter || !connector || !userText || userText.length < 15) return;

        const prompt = `Analyze this conversation snippet and extract any persistent user preferences, facts, or technical context that should be remembered for future interactions.
If no important fact exists, respond with "NONE".

User: "${userText}"
Assistant: "${assistantText}"

If facts exist, format as:
CATEGORY: fact text
(Categories: preference, fact, project_context)`;

        try {
            const res = await llmAdapter.execute(connector, [{ role: 'user', content: prompt }]);
            if (res && !res.includes('NONE')) {
                const lines = res.split('\n');
                for (const line of lines) {
                    const match = line.match(/^(PREFERENCE|FACT|PROJECT_CONTEXT):\s*(.+)/i);
                    if (match) {
                        const cat = match[1].toLowerCase();
                        const fact = match[2];
                        await this.addMemory(cat, fact);
                    }
                }
            }
        } catch (e) {
            console.warn('[MemoryManager] Automatic extraction failed:', e);
        }
    }
}
