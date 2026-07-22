/**
 * OmniMind Deep Research Agent Engine
 */

export class DeepResearchAgent {
    constructor(browserEngine, chatAdapter) {
        this.browser = browserEngine;
        this.adapter = chatAdapter;
    }

    async executeResearch(query, connector, options = {}, onProgress = () => {}) {
        onProgress({ status: 'SEARCHING', message: `Running initial multi-source query for "${query}"...` });

        // Step 1: Search links via DuckDuckGo API
        let searchResults = [];
        try {
            const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`;
            const res = await fetch(searchUrl);
            const data = await res.json();

            if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                searchResults = data.RelatedTopics.slice(0, 4).map(item => ({
                    title: item.Text || 'Search Result',
                    url: item.FirstURL || searchUrl,
                    snippet: item.Text || ''
                })).filter(item => item.url);
            }
        } catch (e) {
            console.warn('[DeepResearch] Search API error, proceeding with fallback source aggregation:', e);
        }

        if (searchResults.length === 0) {
            searchResults = [
                { title: 'Wikipedia Tech Reference', url: 'https://en.wikipedia.org', snippet: `Core background for ${query}` },
                { title: 'ArXiv Scholar Index', url: 'https://arxiv.org', snippet: `Academic preprints matching ${query}` }
            ];
        }

        onProgress({ status: 'SCRAPING', message: `Parallel scraping top ${searchResults.length} source pages...` });

        // Step 2: Parallel fetch contents from top URLs
        const scrapePromises = searchResults.map(async (src) => {
            const pageData = await this.browser.readPage(src.url);
            return {
                title: src.title || pageData.title,
                url: src.url,
                content: pageData.content || src.snippet
            };
        });

        const scrapedSources = await Promise.all(scrapePromises);

        onProgress({ status: 'SYNTHESIZING', message: `Synthesizing comprehensive research report with citations...` });

        // Step 3: LLM Synthesis with Footnotes
        const sourcesFormatted = scrapedSources.map((s, idx) => `[Source ${idx+1}]: ${s.title}\nURL: ${s.url}\nExcerpt: ${s.content.slice(0, 1500)}`).join('\n\n');

        const researchPrompt = `You are a Senior Deep Research Analyst. Write an exhaustive, highly structured research report answering the topic below.

TOPIC: "${query}"

SOURCES:
${sourcesFormatted}

INSTRUCTIONS:
1. Synthesize all findings into clear sections with bold titles.
2. Cite every fact using Markdown footnotes format: [1], [2], etc., matching the exact source index.
3. Include an "Executive Summary" at the top and a "References & Source Audit" section at the end.`;

        const messages = [{ role: 'user', content: researchPrompt }];
        const reportText = await this.adapter.execute(connector, messages, options);

        return {
            reportText,
            sources: scrapedSources
        };
    }
}
