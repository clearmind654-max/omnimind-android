/**
 * OmniMind Persona Manager
 */

import { Storage } from './storage.js';

const STORAGE_KEY = 'omnimind_personas_v2';

export const DEFAULT_PERSONAS = [
    {
        id: 'persona_general',
        name: 'Default OmniMind Manager',
        description: 'Balanced multi-agent orchestrator for general tasks.',
        systemPrompt: 'You are OmniMind AI, a helpful, precise, and concise AI assistant.',
        temperature: 0.7,
        isDefault: true
    },
    {
        id: 'persona_python_architect',
        name: 'Senior Python Architect',
        description: 'Writes production-grade, typed, asynchronous Python code.',
        systemPrompt: 'You are a Senior Python Architect. Provide clean, robust, fully typed, efficient code with clear docstrings.',
        temperature: 0.2,
        isDefault: false
    },
    {
        id: 'persona_socratic_tutor',
        name: 'Socratic Tutor',
        description: 'Guides learning through targeted questioning.',
        systemPrompt: 'You are a Socratic tutor. Instead of giving direct answers, ask guiding questions to encourage critical thinking.',
        temperature: 0.8,
        isDefault: false
    }
];

export class PersonaManager {
    constructor() {
        this.personas = [];
        this.activePersonaId = 'persona_general';
    }

    async init() {
        const saved = await Storage.getItem(STORAGE_KEY, null);
        if (saved && Array.isArray(saved) && saved.length > 0) {
            this.personas = saved;
        } else {
            this.personas = [...DEFAULT_PERSONAS];
            await this.save();
        }
    }

    async save() {
        await Storage.setItem(STORAGE_KEY, this.personas);
    }

    getAll() {
        return this.personas;
    }

    getActive() {
        return this.personas.find(p => p.id === this.activePersonaId) || this.personas[0];
    }

    setActive(id) {
        this.activePersonaId = id;
    }

    async addOrUpdate(persona) {
        const index = this.personas.findIndex(p => p.id === persona.id);
        if (index >= 0) {
            this.personas[index] = { ...this.personas[index], ...persona };
        } else {
            persona.id = persona.id || `persona_${Date.now()}`;
            this.personas.push(persona);
        }
        await this.save();
        return persona;
    }
}
