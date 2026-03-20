"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Quick test for the LLM router — run with: bun agents/test-llm-router.ts
 */
const llmRouter_1 = require("./llmRouter");
const tests = [
    "wether in mumbai",
    "weather in delhi",
    "latst news about AI",
    "help me write a poem",
    "will it rain tomorow in london",
    "bitcoin price today",
    "explain quantum physics",
];
async function runTests() {
    for (const query of tests) {
        console.log(`\n🔍 "${query}"`);
        const result = await (0, llmRouter_1.llmRouteToAgent)(query);
        console.log(`   → Agent: ${result.agent} (${result.confidence})`);
        console.log(`   → Reason: ${result.reason}`);
        if (result.extractedCity)
            console.log(`   → City: ${result.extractedCity}`);
    }
}
runTests().catch(console.error);
