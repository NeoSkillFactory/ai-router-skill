#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");

const REFS_DIR = path.join(__dirname, "..", "references");

function loadJSON(filename) {
  return JSON.parse(fs.readFileSync(path.join(REFS_DIR, filename), "utf-8"));
}

const costMatrix = loadJSON("cost-matrix.json");
const complexityScores = loadJSON("complexity-scores.json");
const benchmarks = loadJSON("benchmarks.json");

/**
 * Score task complexity based on keywords and length.
 * Returns a score from 0-10.
 */
function scoreComplexity(task) {
  if (!task || typeof task !== "string") return 3;

  const lower = task.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  let score = 3; // baseline

  // Keyword matching
  const keywords = complexityScores.keywords;
  let simpleHits = 0;
  let moderateHits = 0;
  let complexHits = 0;

  for (const word of words) {
    if (keywords.simple.some((k) => word.includes(k))) simpleHits++;
    if (keywords.moderate.some((k) => word.includes(k))) moderateHits++;
    if (keywords.complex.some((k) => word.includes(k))) complexHits++;
  }

  // Weight complex keywords more heavily
  score = score - simpleHits * 0.8 + moderateHits * 0.6 + complexHits * 1.2;

  // Length bonus
  const thresholds = complexityScores.lengthThresholds;
  if (wordCount <= thresholds.short.maxWords) {
    score += thresholds.short.bonus;
  } else if (wordCount <= thresholds.medium.maxWords) {
    score += thresholds.medium.bonus;
  } else if (wordCount <= thresholds.long.maxWords) {
    score += thresholds.long.bonus;
  } else {
    score += thresholds.veryLong.bonus;
  }

  return Math.max(0, Math.min(10, Math.round(score)));
}

/**
 * Classify complexity score into a level.
 */
function classifyComplexity(score) {
  const levels = complexityScores.levels;
  if (score <= levels.simple.range[1]) return "simple";
  if (score <= levels.moderate.range[1]) return "moderate";
  return "complex";
}

/**
 * Get the recommended model for a complexity level.
 */
function getRecommendedModel(level) {
  return complexityScores.levels[level].recommendedModel;
}

/**
 * Check if a model fits within the budget.
 * Budget is per 1K output tokens.
 */
function fitsInBudget(modelId, budget) {
  if (!budget || budget <= 0) return true;
  const model = costMatrix.models[modelId];
  return model.outputCostPer1k <= budget;
}

/**
 * Find the best model that fits within budget, preferring higher quality.
 */
function findBestWithinBudget(budget) {
  const models = Object.entries(costMatrix.models)
    .filter(([, m]) => m.outputCostPer1k <= budget)
    .sort((a, b) => b[1].outputCostPer1k - a[1].outputCostPer1k);

  return models.length > 0 ? models[0][0] : "kimi-k2.5"; // fallback to cheapest
}

/**
 * Apply priority adjustments.
 * - "cost": prefer cheapest viable model
 * - "quality": prefer highest quality model
 * - "balanced": use complexity-based recommendation (default)
 */
function applyPriority(recommendedModel, priority, budget) {
  const modelOrder = ["kimi-k2.5", "gpt-5.2", "opus-4.6"];

  if (priority === "cost") {
    // Find cheapest model that's available
    for (const m of modelOrder) {
      if (fitsInBudget(m, budget)) return m;
    }
    return "kimi-k2.5";
  }

  if (priority === "quality") {
    // Find best model within budget
    for (const m of [...modelOrder].reverse()) {
      if (fitsInBudget(m, budget)) return m;
    }
    return "kimi-k2.5";
  }

  // balanced - use recommendation but respect budget
  if (fitsInBudget(recommendedModel, budget)) return recommendedModel;
  return findBestWithinBudget(budget);
}

/**
 * Main routing function.
 *
 * @param {Object} options
 * @param {string} options.task - Task description
 * @param {number} [options.budget] - Max cost per 1K output tokens (dollars)
 * @param {string} [options.priority] - "cost", "balanced", or "quality"
 * @param {string} [options.override] - Force a specific model
 * @returns {Object} Routing result
 */
function routeTask(options = {}) {
  const { task = "", budget = 0, priority = "balanced", override = "" } = options;

  const score = scoreComplexity(task);
  const level = classifyComplexity(score);

  // Handle override
  if (override && costMatrix.models[override]) {
    const model = costMatrix.models[override];
    return {
      model: override,
      modelName: model.name,
      complexity: level,
      score,
      cost: { input: model.inputCostPer1k, output: model.outputCostPer1k },
      reason: `Manual override to ${model.name}`,
      downgraded: false,
    };
  }

  const recommended = getRecommendedModel(level);
  const selected = applyPriority(recommended, priority, budget);
  const downgraded = selected !== recommended && costMatrix.models[selected].outputCostPer1k < costMatrix.models[recommended].outputCostPer1k;

  const selectedModel = costMatrix.models[selected];
  const bench = benchmarks.models[selected];

  let reason;
  if (downgraded && budget > 0) {
    reason = `${complexityScores.levels[level].description}. Downgraded from ${costMatrix.models[recommended].name} due to budget constraint ($${budget})`;
  } else if (priority === "cost") {
    reason = `Cost priority selected economy model for: ${complexityScores.levels[level].description.toLowerCase()}`;
  } else if (priority === "quality") {
    reason = `Quality priority selected premium model for: ${complexityScores.levels[level].description.toLowerCase()}`;
  } else {
    reason = `${complexityScores.levels[level].description}. ${selectedModel.name} offers best cost/quality balance`;
  }

  return {
    model: selected,
    modelName: selectedModel.name,
    complexity: level,
    score,
    cost: { input: selectedModel.inputCostPer1k, output: selectedModel.outputCostPer1k },
    quality: bench.qualityScore,
    latency: bench.avgLatencyMs,
    reason,
    downgraded,
  };
}

module.exports = {
  routeTask,
  scoreComplexity,
  classifyComplexity,
  getRecommendedModel,
};
