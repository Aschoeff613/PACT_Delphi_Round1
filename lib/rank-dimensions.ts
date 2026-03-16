export const DIMENSIONS = {
  "risk-severity": {
    key: "risk_severity" as const,
    label: "Risk Severity",
    description: "How much harm could result if this task is performed poorly?",
    low: "Minimal harm",
    high: "Severe harm / mortality risk",
  },
  "cognitive-complexity": {
    key: "cognitive_complexity" as const,
    label: "Cognitive Complexity",
    description: "How much synthesis, judgment, and pressure does this task require?",
    low: "Straightforward",
    high: "Highly complex, multi-source reasoning",
  },
  "performance-variability": {
    key: "performance_variability" as const,
    label: "Performance Variability",
    description: "How much would performance vary across clinicians or settings?",
    low: "Consistent across clinicians",
    high: "Highly variable across clinicians",
  },
  "ai-relevance": {
    key: "ai_relevance" as const,
    label: "AI Relevance",
    description: "How plausible is meaningful LLM support for this task?",
    low: "Little plausible LLM support",
    high: "Strong plausible LLM support",
  },
} as const;

export type DimensionSlug = keyof typeof DIMENSIONS;
export const DIMENSION_ORDER: DimensionSlug[] = ["risk-severity", "cognitive-complexity", "performance-variability", "ai-relevance"];
