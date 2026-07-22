/**
 * OmniMind Auto-Prompt Optimization Middleware
 */

export async function optimizePrompt(rawPrompt, mediaType = 'Image', llmAdapter = null, connector = null, options = {}) {
    if (!rawPrompt || rawPrompt.trim().length === 0) return rawPrompt;
    
    // If prompt is already long and detailed (> 300 chars), return directly
    if (rawPrompt.length > 300) return rawPrompt;

    const metaPrompt = `You are a Master Prompt Engineer for ${mediaType} generation.
Transform this user input into a highly detailed, professional visual prompt.
Include artistic style, lighting, camera lens/angle, resolution, textures, atmosphere, and ultra-fine details.
USER INPUT: "${rawPrompt}"
OUTPUT ONLY THE ENHANCED PROMPT TEXT. NO PREAMBLE, NO QUOTES, NO MARKDOWN WRAPPING.`;

    if (llmAdapter && connector) {
        try {
            const messages = [{ role: 'user', content: metaPrompt }];
            const enhanced = await llmAdapter.execute(connector, messages, options);
            return (enhanced || '').trim().replace(/^["']|["']$/g, '') || rawPrompt;
        } catch (e) {
            console.warn('[Enhancer] Auto-enhancement failed, proceeding with original prompt:', e);
            return rawPrompt;
        }
    }

    return rawPrompt;
}
