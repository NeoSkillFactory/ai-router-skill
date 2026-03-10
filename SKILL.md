---
name: ai-router-skill
description: "Automatically routes AI tasks to optimal models based on complexity and cost constraints. Use when: select best ai model, optimize model costs, which model should I use, route task to cheapest model, balance quality and budget."
version: 1.0.0
metadata: {"openclaw": {"emoji": "🧭", "requires": {"bins": ["node"]}}}
---

# AI Router Skill

Analyzes task descriptions using keyword-based NLP scoring to determine complexity (simple, moderate, complex) and selects the most cost-effective model from Kimi K 2.5, GPT 5.2, or Opus 4.6. Supports budget constraints, priority modes, and manual overrides.

## Usage

### CLI

```bash
# Get a model recommendation
node scripts/cli.js --task "Summarize this article"

# With budget constraint
node scripts/cli.js --task "Design a microservices architecture" --budget 0.01

# Force a specific model
node scripts/cli.js --task "Translate text" --override "kimi-k2.5"

# JSON output
node scripts/cli.js --task "Analyze code" --json

# Priority modes: cost, balanced (default), quality
node scripts/cli.js --task "Review this PR" --priority quality
```

### Programmatic

```javascript
const { routeTask } = require('./scripts/router');

const result = routeTask({
  task: "Write a detailed technical report",
  budget: 0.10,
  priority: "quality"
});
// => { model: "opus-4.6", complexity: "moderate", score: 5, cost: {...}, reason: "..." }
```

### Agent Integration

```javascript
const { processMessage } = require('./scripts/integration');

const rec = processMessage({
  message: "Which model should I use for code generation?",
  sessionBudget: 1.00
});
// => { triggered: true, model: "gpt-5.2", extractedTask: "code generation?", ... }
```

## When to Use / When Not to Use

| Use when | Do not use when |
|----------|-----------------|
| You need to pick the cheapest model for a task | You always want the same model |
| Budget constraints limit model choice | Task requires a specific model's unique capability |
| Automating model selection in agent pipelines | You need real-time API availability checks |
| Comparing cost vs quality tradeoffs | You need to route to non-supported models |

## Supported Models

| Model | Best For | Tier |
|-------|----------|------|
| Kimi K 2.5 | Translation, summarization, simple Q&A | Economy |
| GPT 5.2 | General coding, analysis, content generation | Standard |
| Opus 4.6 | Complex reasoning, architecture, deep research | Premium |

## Edge Cases and Limitations

- **Budget too tight**: Falls back to cheapest model (Kimi K 2.5) and sets `downgraded: true`
- **No task provided**: Uses baseline complexity score of 3 (routes to economy model)
- **Invalid override model**: Ignores the override and routes normally
- **Empty messages in integration**: Returns `{ triggered: false }` without error
- **Complexity scoring is keyword-based**: Does not use actual LLM inference; accuracy depends on descriptive task text
- **Static cost data**: Model pricing in `references/cost-matrix.json` must be updated manually
