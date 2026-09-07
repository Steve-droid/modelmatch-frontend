// The locked product value proposition (Steve chose this). Single source of truth so the
// Welcome hero, Login subtitle and the recommender intro all say exactly the same thing.
export const VALUE_PROP = {
  headline: "The right model for your CI, at the lowest cost.",
  sub: "ModelMatch recommends a cost-effective model to review your pull requests in CI, then proves it's good enough by counting the savings against a premium baseline.",
} as const;

// The three "how it works" beats, rendered as an animated stepped flow under the hero.
// Labels only — the icons/colours live with the flow component.
export const HOW_IT_WORKS_STEPS = [
  "Get matched to a model",
  "Run it in your Jenkins",
  "See how much you save",
] as const;
