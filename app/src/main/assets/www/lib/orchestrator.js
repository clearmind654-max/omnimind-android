/**
 * OmniMind Orchestrator, Deep Research & Multi-Agent Manager
 */

import { DeepResearchAgent } from './research.js';

export class Orchestrator {
    constructor(connectorRegistry, chatAdapter, memoryManager, browserEngine) {
        this.registry = connectorRegistry;
        this.adapter = chatAdapter;
        this.memory = memoryManager;
        this.browser = browserEngine;
        this.researchAgent = new DeepResearchAgent(this.browser, this.adapter);
    }

    getManagerSystemPrompt() {
        const enabled = this.registry.getEnabled();
        const connectorListStr = enabled.map(c => `- ${c.id} (${c.name}): skills=[${(c.skills || []).join(', ')}]`).join('\n');

        return `You are OmniMind Manager, an AI orchestrator that plans and delegates tasks.

AVAILABLE CONNECTORS:
${connectorListStr}

RULES:
1. Simple questions, chat, or direct requests -> action: "direct".
2. Multi-step complex pipelines -> action: "chain".
3. High-precision or ambiguous requests -> action: "compare".
4. Deep research requests -> action: "research".
5. Output ONLY valid JSON matching schema. No markdown wrapping.`;
    }

    parseJSONPlan(rawResponse) {
        if (!rawResponse) return { action: 'direct', reasoning: 'Empty response fallback' };
        try {
            return JSON.parse(rawResponse);
        } catch (e) {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try { return JSON.parse(jsonMatch[0]); } catch (err) {}
            }
        }
        return { action: 'direct', reasoning: 'Non-JSON direct answer', directResponse: rawResponse };
    }

    async planAndExecute(userPrompt, options = {}, onProgress = () => {}) {
        // Handle Incognito Mode memory extraction exclusion
        const memoryContext = (!options.isIncognito && this.memory) ? this.memory.getMemoryContext() : '';
        const personaPrompt = options.persona ? options.persona.systemPrompt : '';
        const systemPrompt = `${personaPrompt}\n${this.getManagerSystemPrompt()}\n${memoryContext}`;

        // Check for Native Intent commands
        if (/draft (an|a)? email|send (an|a)? email/i.test(userPrompt)) {
            return this.executeNativeEmailIntent(userPrompt);
        }
        if (/set (an|a)? alarm|wake me up/i.test(userPrompt)) {
            return this.executeNativeAlarmIntent(userPrompt);
        }

        // Check for /research command
        if (userPrompt.startsWith('/research')) {
            const topic = userPrompt.replace(/^\/research\s*/, '').trim();
            const conn = this.registry.getBySkill('research')[0] || this.registry.getEnabled()[0];
            const researchResult = await this.researchAgent.executeResearch(topic, conn, options, onProgress);
            return {
                type: 'research',
                text: researchResult.reportText,
                sources: researchResult.sources
            };
        }

        onProgress({ status: 'PLANNING', message: 'Gemini Primary Manager evaluating plan...' });

        const primaryConnector = options.directBypassConnector || this.registry.getEnabled()[0];
        
        let plan;
        if (options.directBypassConnector) {
            plan = { action: 'direct', reasoning: 'Direct model mention', connectorId: options.directBypassConnector.id };
        } else {
            try {
                const planRaw = await this.adapter.execute(primaryConnector, [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ], { jsonMode: true, globalApiKey: options.globalApiKey });

                plan = this.parseJSONPlan(planRaw);
            } catch (e) {
                plan = { action: 'direct', reasoning: 'Fallback due to manager error', connectorId: primaryConnector?.id };
            }
        }

        onProgress({ status: 'EXECUTING_PLAN', plan });

        switch (plan.action) {
            case 'direct':
                return await this.executeDirect(plan, userPrompt, options, onProgress);
            case 'compare':
                return await this.executeCompare(plan, userPrompt, options, onProgress);
            default:
                return await this.executeDirect(plan, userPrompt, options, onProgress);
        }
    }

    async executeDirect(plan, userPrompt, options, onProgress) {
        if (plan.directResponse) return { type: 'direct', text: plan.directResponse, plan };

        const connector = this.registry.getById(plan.connectorId) || this.registry.getEnabled()[0];
        onProgress({ status: 'RUNNING_TASK', taskName: `Direct completion on ${connector.name}` });

        const memoryContext = (!options.isIncognito && this.memory) ? this.memory.getMemoryContext() : '';
        const personaPrompt = options.persona ? options.persona.systemPrompt : 'You are OmniMind AI.';
        
        const messages = [{ role: 'system', content: `${personaPrompt}\n${memoryContext}` }];
        if (options.history && Array.isArray(options.history)) messages.push(...options.history);
        messages.push({ role: 'user', content: userPrompt });

        const responseText = await this.adapter.execute(connector, messages, options);

        // Memory extraction hook (Bypassed if Incognito)
        if (!options.isIncognito && this.memory) {
            this.memory.extractAndStore(userPrompt, responseText, this.adapter, connector);
        }

        return { type: 'direct', text: responseText, connector, plan };
    }

    async executeCompare(plan, userPrompt, options, onProgress) {
        const enabled = this.registry.getEnabled();
        const connectorsToTest = enabled.slice(0, 3);

        onProgress({ status: 'RUNNING_TASK', taskName: `Broadcasting task to ${connectorsToTest.length} model candidates in parallel...` });

        const promises = connectorsToTest.map(async (conn) => {
            try {
                const text = await this.adapter.execute(conn, [{ role: 'user', content: userPrompt }], options);
                return { connector: conn, output: text, success: true };
            } catch (e) {
                return { connector: conn, output: `Error: ${e.message}`, success: false };
            }
        });

        const parallelOutputs = await Promise.all(promises);

        onProgress({ status: 'RUNNING_TASK', taskName: `Gemini Judge evaluating consensus answer...` });

        const judgeConnector = enabled[0];
        const judgePrompt = `Synthesize the optimal golden answer from these model candidates:\n\n` +
            parallelOutputs.map((item, idx) => `=== CANDIDATE ${idx+1}: ${item.connector.name} ===\n${item.output}`).join('\n\n');

        try {
            const goldenResponse = await this.adapter.execute(judgeConnector, [{ role: 'user', content: judgePrompt }], options);
            return { type: 'compare', text: goldenResponse, candidates: parallelOutputs, plan };
        } catch (e) {
            const valid = parallelOutputs.find(p => p.success);
            return { type: 'compare', text: valid ? valid.output : 'Parallel execution failed.', candidates: parallelOutputs, plan };
        }
    }

    executeNativeEmailIntent(prompt) {
        if (window.AndroidNative && typeof window.AndroidNative.executeNativeIntent === 'function') {
            window.AndroidNative.executeNativeIntent('email', JSON.stringify({ subject: 'OmniMind Draft', body: prompt }));
        }
        return { type: 'direct', text: `📱 **Native Intent Triggered:** Opened email client draft.` };
    }

    executeNativeAlarmIntent(prompt) {
        if (window.AndroidNative && typeof window.AndroidNative.executeNativeIntent === 'function') {
            window.AndroidNative.executeNativeIntent('alarm', JSON.stringify({ message: 'OmniMind Alarm', hour: 8, minute: 0 }));
        }
        return { type: 'direct', text: `⏰ **Native Intent Triggered:** Set native Android alarm.` };
    }
}
