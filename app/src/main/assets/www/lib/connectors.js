/**
 * OmniMind Connector Registry & Fallback Protocol (Zero-Cost Focus)
 */

import { Storage } from './storage.js';

const STORAGE_KEY = 'omnimind_connectors_v2';

export const DEFAULT_CONNECTORS = [
    {
        id: 'openrouter-free',
        name: 'OpenRouter Auto-Free (Zero Cost)',
        type: 'openrouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: '',
        model: 'openrouter/free',
        skills: ['chat', 'compare', 'delegate', 'research'],
        isEnabled: true,
        priority: 1,
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 2048
    },
    {
        id: 'gemma-free',
        name: 'Google Gemma 4-31B (Free)',
        type: 'openrouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: '',
        model: 'google/gemma-4-31b-it:free',
        skills: ['chat', 'compare', 'delegate'],
        isEnabled: true,
        priority: 2,
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 2048
    },
    {
        id: 'nemotron-free',
        name: 'NVIDIA Nemotron 30B (Free)',
        type: 'openrouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: '',
        model: 'nvidia/nemotron-3-nano-30b-a3b:free',
        skills: ['chat', 'compare', 'delegate'],
        isEnabled: true,
        priority: 3,
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 2048
    },
    {
        id: 'gemini-auto',
        name: 'Gemini Primary (Google Free Tier)',
        type: 'gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: '',
        model: 'auto',
        skills: ['chat', 'vision', 'compare', 'chain', 'delegate', 'research'],
        isEnabled: true,
        priority: 4,
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 2048
    },
    {
        id: 'pollinations-flux',
        name: 'Pollinations Flux (Image Free)',
        type: 'image_gen',
        baseUrl: 'https://image.pollinations.ai/prompt',
        apiKey: '',
        model: 'flux',
        skills: ['image'],
        isEnabled: true,
        priority: 5
    }
];

export class ConnectorRegistry {
    constructor() {
        this.connectors = [];
    }

    async init() {
        const saved = await Storage.getItem(STORAGE_KEY, null);
        if (saved && Array.isArray(saved) && saved.length > 0) {
            this.connectors = saved;
        } else {
            this.connectors = [...DEFAULT_CONNECTORS];
            await this.save();
        }
    }

    async save() {
        await Storage.setItem(STORAGE_KEY, this.connectors);
    }

    getAll() {
        return this.connectors;
    }

    getEnabled() {
        return this.connectors.filter(c => c.isEnabled).sort((a, b) => (a.priority || 99) - (b.priority || 99));
    }

    getById(id) {
        return this.connectors.find(c => c.id === id);
    }

    getBySkill(skill) {
        return this.getEnabled().filter(c => c.skills && c.skills.includes(skill));
    }

    async addOrUpdate(connector) {
        const index = this.connectors.findIndex(c => c.id === connector.id);
        if (index >= 0) {
            this.connectors[index] = { ...this.connectors[index], ...connector };
        } else {
            connector.id = connector.id || `conn_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
            this.connectors.push(connector);
        }
        await this.save();
        return connector;
    }

    async delete(id) {
        this.connectors = this.connectors.filter(c => c.id !== id);
        await this.save();
    }
}
