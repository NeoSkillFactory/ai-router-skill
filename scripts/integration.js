#!/usr/bin/env node
"use strict";

const { routeTask } = require("./router");

/**
 * Trigger phrases that activate the AI router skill.
 */
const TRIGGER_PATTERNS = [
  /which model should i use/i,
  /optimize\s+(my\s+)?ai\s+costs?/i,
  /route\s+(this\s+)?task/i,
  /select\s+(the\s+)?(best|optimal)\s+model/i,
  /minimize\s+(my\s+)?(openclaw\s+)?expenses?/i,
  /most\s+(cost[- ]effective|efficient)\s+model/i,
  /balance\s+quality\s+and\s+cost/i,
  /what\s+model\s+(for|should)/i,
  /budget\s+constraint/i,
  /model\s+selection/i,
];

/**
 * Detect if a message should trigger the AI router.
 */
function detectTrigger(message) {
  if (!message || typeof message !== "string") return false;
  return TRIGGER_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Extract task description from a trigger message.
 * Strips common trigger prefixes to get the actual task.
 */
function extractTask(message) {
  const prefixes = [
    /^which model should i use (for|to)\s+/i,
    /^(please\s+)?route\s+(this\s+)?task:\s*/i,
    /^select\s+(the\s+)?(best|optimal)\s+model\s+for\s+/i,
    /^what('s| is)\s+the\s+most\s+(cost[- ]effective|efficient)\s+model\s+for\s+/i,
  ];

  let task = message;
  for (const prefix of prefixes) {
    task = task.replace(prefix, "");
  }
  return task.trim() || message;
}

/**
 * Extract budget from a message if mentioned.
 * Looks for patterns like "$0.05", "budget of $1", "budget constraint of $0.10".
 */
function extractBudget(message) {
  const match = message.match(/\$(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Process an incoming message from an OpenClaw agent session.
 *
 * @param {Object} options
 * @param {string} options.message - The user's message
 * @param {number} [options.sessionBudget] - Session-level budget cap
 * @param {string} [options.priority] - Priority override
 * @returns {Object} Processing result
 */
function processMessage(options = {}) {
  const { message = "", sessionBudget = 0, priority = "balanced" } = options;

  const triggered = detectTrigger(message);
  if (!triggered) {
    return { triggered: false, reason: "No trigger phrase detected" };
  }

  const task = extractTask(message);
  const messageBudget = extractBudget(message);
  const budget = messageBudget || sessionBudget;

  const result = routeTask({ task, budget, priority });

  return {
    triggered: true,
    ...result,
    originalMessage: message,
    extractedTask: task,
    budgetSource: messageBudget > 0 ? "message" : sessionBudget > 0 ? "session" : "none",
  };
}

/**
 * Format a recommendation for display in an agent response.
 */
function formatRecommendation(result) {
  if (!result.triggered) return null;

  const lines = [
    `**Recommended Model: ${result.modelName}**`,
    `- Complexity: ${result.complexity} (score: ${result.score}/10)`,
    `- Cost: $${result.cost.output}/1K output tokens`,
    `- ${result.reason}`,
  ];

  if (result.downgraded) {
    lines.push(`- Note: Downgraded due to budget constraint`);
  }

  return lines.join("\n");
}

module.exports = {
  processMessage,
  detectTrigger,
  extractTask,
  extractBudget,
  formatRecommendation,
};
