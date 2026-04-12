import Anthropic from "@anthropic-ai/sdk";

export function ai() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}
