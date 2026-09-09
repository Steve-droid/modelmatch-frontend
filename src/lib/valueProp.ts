// Steve's chosen headline is retained in the homepage hero.
export const VALUE_PROP = {
  headline: "The right model for your CI, at the lowest cost.",
  sub: "ModelMatch recommends a cost-effective model to review your pull requests in CI, then proves it's good enough by counting the savings against a premium baseline.",
} as const;

// Labels for the homepage's illustrative model → review → savings flow.
export const HOW_IT_WORKS_STEPS = [
  "Find your model",
  "Run it in Jenkins",
  "Track your savings",
] as const;
