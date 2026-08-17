/**
 * Provider registry.
 *
 * The one place a provider name becomes a concrete adapter. Adding OpenAI or
 * any other vendor is a new adapter file plus one line here.
 */

import { getAIConfig, type ProviderName } from "./config";
import { AnthropicProvider } from "./anthropic";
import { UnconfiguredProvider, type AIProvider } from "./provider";

const instances = new Map<ProviderName, AIProvider>();

export function getProvider(): AIProvider {
  const { provider } = getAIConfig();

  let instance = instances.get(provider);
  if (!instance) {
    instance = provider === "anthropic" ? new AnthropicProvider() : new UnconfiguredProvider();
    instances.set(provider, instance);
  }
  return instance;
}

/** Test seam: drop cached adapters so config changes take effect. */
export function resetProviders(): void {
  instances.clear();
}

export * from "./provider";
export { getAIConfig, hasCredentials, type ModelRole } from "./config";
