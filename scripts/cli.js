#!/usr/bin/env node
"use strict";

const { routeTask } = require("./router");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--task" && argv[i + 1]) {
      args.task = argv[++i];
    } else if (arg === "--budget" && argv[i + 1]) {
      args.budget = parseFloat(argv[++i]);
    } else if (arg === "--priority" && argv[i + 1]) {
      args.priority = argv[++i];
    } else if (arg === "--override" && argv[i + 1]) {
      args.override = argv[++i];
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  console.log(`AI Router Skill - Model Selection CLI

Usage:
  node scripts/cli.js --task "Your task description" [options]

Options:
  --task <text>       Task description (required)
  --budget <number>   Max cost per 1K output tokens in dollars
  --priority <mode>   Routing priority: cost, balanced, quality (default: balanced)
  --override <model>  Force a specific model: kimi-k2.5, gpt-5.2, opus-4.6
  --json              Output result as JSON
  --help, -h          Show this help message

Examples:
  node scripts/cli.js --task "Summarize this article"
  node scripts/cli.js --task "Design a microservices architecture" --budget 0.01
  node scripts/cli.js --task "Translate to French" --override "kimi-k2.5"
  node scripts/cli.js --task "Analyze code" --json`);
}

function formatResult(result) {
  const lines = [
    `Model: ${result.modelName}${result.downgraded ? " (budget-constrained)" : ""}`,
    `Complexity: ${result.complexity} (score: ${result.score}/10)`,
    `Estimated Cost: $${result.cost.output}/1K output tokens`,
  ];
  if (result.quality) lines.push(`Quality Score: ${result.quality}/10`);
  if (result.latency) lines.push(`Avg Latency: ${result.latency}ms`);
  lines.push(`Reason: ${result.reason}`);
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.task) {
    console.error("Error: --task is required. Use --help for usage information.");
    process.exit(1);
  }

  const validPriorities = ["cost", "balanced", "quality"];
  if (args.priority && !validPriorities.includes(args.priority)) {
    console.error(`Error: Invalid priority "${args.priority}". Use: ${validPriorities.join(", ")}`);
    process.exit(1);
  }

  const validModels = ["kimi-k2.5", "gpt-5.2", "opus-4.6"];
  if (args.override && !validModels.includes(args.override)) {
    console.error(`Error: Invalid model "${args.override}". Use: ${validModels.join(", ")}`);
    process.exit(1);
  }

  const result = routeTask({
    task: args.task,
    budget: args.budget || 0,
    priority: args.priority || "balanced",
    override: args.override || "",
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatResult(result));
  }
}

main();
