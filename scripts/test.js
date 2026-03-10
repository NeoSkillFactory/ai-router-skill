#!/usr/bin/env node
"use strict";

const { routeTask, scoreComplexity, classifyComplexity } = require("./router");
const { processMessage, detectTrigger, extractTask, extractBudget } = require("./integration");

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.error(`  FAIL: ${name}`);
    failed++;
  }
}

console.log("=== Router Tests ===\n");

// Complexity scoring
console.log("Complexity Scoring:");
assert(scoreComplexity("translate this text") <= 3, "Simple task scores low");
assert(scoreComplexity("analyze and generate code for a REST API") >= 4, "Moderate task scores mid-range");
assert(scoreComplexity("design and architect a comprehensive distributed system with advanced optimization") >= 7, "Complex task scores high");
assert(scoreComplexity("") === 3, "Empty task gets baseline score");
assert(scoreComplexity(null) === 3, "Null task gets baseline score");

// Classification
console.log("\nComplexity Classification:");
assert(classifyComplexity(1) === "simple", "Score 1 = simple");
assert(classifyComplexity(3) === "simple", "Score 3 = simple");
assert(classifyComplexity(5) === "moderate", "Score 5 = moderate");
assert(classifyComplexity(8) === "complex", "Score 8 = complex");

// Basic routing
console.log("\nBasic Routing:");
let result = routeTask({ task: "translate this short text" });
assert(result.model === "kimi-k2.5", "Simple task routes to Kimi K 2.5");
assert(result.complexity === "simple", "Simple task classified correctly");

result = routeTask({ task: "analyze this code and generate a detailed review" });
assert(result.model === "gpt-5.2", "Moderate task routes to GPT 5.2");

result = routeTask({ task: "design and architect a comprehensive system with advanced reasoning and deep research synthesis" });
assert(result.model === "opus-4.6", "Complex task routes to Opus 4.6");

// Budget constraints
console.log("\nBudget Constraints:");
result = routeTask({ task: "architect a complex system", budget: 0.003 });
assert(result.model === "kimi-k2.5", "Tight budget forces cheapest model");
assert(result.downgraded === true, "Downgrade flag set");

result = routeTask({ task: "architect a complex system", budget: 0.01 });
assert(result.model === "gpt-5.2", "Medium budget allows mid-tier model");

result = routeTask({ task: "architect and design a comprehensive complex advanced system with deep reasoning", budget: 0.05 });
assert(result.model === "opus-4.6", "Generous budget allows premium model");

// Priority modes
console.log("\nPriority Modes:");
result = routeTask({ task: "analyze data trends", priority: "cost" });
assert(result.model === "kimi-k2.5", "Cost priority selects cheapest");

result = routeTask({ task: "analyze data trends", priority: "quality" });
assert(result.model === "opus-4.6", "Quality priority selects best");

result = routeTask({ task: "analyze and compare data trends with code generation", priority: "balanced" });
assert(result.model === "gpt-5.2", "Balanced uses complexity recommendation");

// Override
console.log("\nModel Override:");
result = routeTask({ task: "simple task", override: "opus-4.6" });
assert(result.model === "opus-4.6", "Override forces selected model");
assert(result.reason.includes("Manual override"), "Override reason noted");

// Result structure
console.log("\nResult Structure:");
result = routeTask({ task: "test task" });
assert(typeof result.model === "string", "Has model field");
assert(typeof result.modelName === "string", "Has modelName field");
assert(typeof result.complexity === "string", "Has complexity field");
assert(typeof result.score === "number", "Has score field");
assert(typeof result.cost === "object", "Has cost object");
assert(typeof result.cost.input === "number", "Has input cost");
assert(typeof result.cost.output === "number", "Has output cost");
assert(typeof result.reason === "string", "Has reason field");

console.log("\n=== Integration Tests ===\n");

// Trigger detection
console.log("Trigger Detection:");
assert(detectTrigger("Which model should I use for this task?"), "Detects 'which model' trigger");
assert(detectTrigger("I want to optimize my AI costs"), "Detects 'optimize costs' trigger");
assert(detectTrigger("Route this task to the best model"), "Detects 'route task' trigger");
assert(detectTrigger("Select the optimal model for code generation"), "Detects 'select model' trigger");
assert(detectTrigger("Minimize my OpenClaw expenses"), "Detects 'minimize expenses' trigger");
assert(!detectTrigger("What's the weather like today?"), "Ignores unrelated messages");
assert(!detectTrigger(""), "Ignores empty messages");
assert(!detectTrigger(null), "Handles null input");

// Task extraction
console.log("\nTask Extraction:");
assert(extractTask("Which model should I use for code generation?") === "code generation?", "Extracts task from trigger phrase");
assert(extractTask("Route this task: summarize the document") === "summarize the document", "Extracts from 'route task:' prefix");

// Budget extraction
console.log("\nBudget Extraction:");
assert(extractBudget("I have a budget of $0.05") === 0.05, "Extracts dollar amount");
assert(extractBudget("Budget constraint of $1") === 1, "Extracts integer amount");
assert(extractBudget("No budget mentioned") === 0, "Returns 0 if no budget");

// Full message processing
console.log("\nMessage Processing:");
let msg = processMessage({ message: "Which model should I use for data analysis?" });
assert(msg.triggered === true, "Triggers on valid message");
assert(typeof msg.model === "string", "Returns model recommendation");

msg = processMessage({ message: "What's for lunch?" });
assert(msg.triggered === false, "Does not trigger on unrelated message");

msg = processMessage({ message: "Minimize my expenses, budget $0.003", sessionBudget: 0.05 });
assert(msg.triggered === true, "Triggers with budget");
assert(msg.budgetSource === "message", "Message budget takes precedence");

msg = processMessage({ message: "Minimize expenses", sessionBudget: 0.05 });
assert(msg.budgetSource === "session", "Falls back to session budget");

msg = processMessage({ message: "Minimize expenses" });
assert(msg.budgetSource === "none", "Reports no budget when none given");

msg = processMessage({});
assert(msg.triggered === false, "Handles empty options object");

console.log("\n=== Edge Case Tests ===\n");

// Boundary scores
console.log("Boundary Scores:");
assert(classifyComplexity(0) === "simple", "Score 0 = simple");
assert(classifyComplexity(3) === "simple", "Score 3 boundary = simple");
assert(classifyComplexity(4) === "moderate", "Score 4 boundary = moderate");
assert(classifyComplexity(6) === "moderate", "Score 6 boundary = moderate");
assert(classifyComplexity(7) === "complex", "Score 7 boundary = complex");
assert(classifyComplexity(10) === "complex", "Score 10 = complex");

// Score clamping
console.log("\nScore Clamping:");
assert(scoreComplexity("a") >= 0, "Very short task score >= 0");
assert(scoreComplexity("a") <= 10, "Very short task score <= 10");
const longTask = "design architect research optimize synthesize evaluate refactor debug complex advanced detailed comprehensive deep multi-step reasoning ".repeat(5);
assert(scoreComplexity(longTask) <= 10, "Very complex task score capped at 10");
assert(scoreComplexity(longTask) >= 0, "Very complex task score >= 0");

// routeTask with no options
console.log("\nDefault Options:");
result = routeTask();
assert(result.model === "kimi-k2.5" || result.model === "gpt-5.2" || result.model === "opus-4.6", "Routes with no options");
assert(result.score === 3, "Default score is baseline");
assert(result.downgraded === false, "No downgrade without budget");

// Override with invalid model
console.log("\nInvalid Override:");
result = routeTask({ task: "test", override: "nonexistent-model" });
assert(result.model !== "nonexistent-model", "Invalid override is ignored");

// Budget of zero treated as unlimited
result = routeTask({ task: "architect and design a comprehensive complex advanced system", budget: 0 });
assert(result.model === "opus-4.6", "Zero budget treated as unlimited");

// formatRecommendation
const { formatRecommendation } = require("./integration");
console.log("\nFormat Recommendation:");
const triggered = processMessage({ message: "Which model should I use for code?" });
const formatted = formatRecommendation(triggered);
assert(typeof formatted === "string", "Returns formatted string for triggered result");
assert(formatted.includes("Recommended Model"), "Contains recommendation header");

const notTriggered = processMessage({ message: "hello" });
assert(formatRecommendation(notTriggered) === null, "Returns null for non-triggered result");

// Summary
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
