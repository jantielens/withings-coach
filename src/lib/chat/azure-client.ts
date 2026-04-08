import { createAzure } from '@ai-sdk/azure';
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';

/**
 * Creates a configured Azure AI client.
 *
 * Auth modes (checked in order):
 *  1. API key — if AZURE_OPENAI_API_KEY is set, uses it directly (simplest)
 *  2. DefaultAzureCredential — service principal env vars, managed identity, etc.
 *
 * Required environment variables:
 *  - AZURE_OPENAI_RESOURCE_NAME — Azure AI Foundry resource name (e.g. 'my-ai-foundry')
 *  - AZURE_OPENAI_DEPLOYMENT_NAME — model deployment name (default: 'gpt-4o')
 */
export function createAzureAIClient() {
  const resourceName = process.env.AZURE_OPENAI_RESOURCE_NAME;
  if (!resourceName) {
    throw new AzureConfigError(
      'AZURE_OPENAI_RESOURCE_NAME is not set. ' +
        'Add it to .env to connect to Azure AI Foundry.'
    );
  }

  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  // API key auth — simplest, no identity libraries needed
  if (apiKey) {
    return createAzure({ resourceName, apiKey });
  }

  // DefaultAzureCredential — service principal, managed identity, etc.
  const credential = new DefaultAzureCredential();
  const scope = 'https://cognitiveservices.azure.com/.default';
  const tokenProvider = getBearerTokenProvider(credential, scope);

  return createAzure({
    resourceName,
    apiKey: 'managed-identity',
    fetch: async (url, init) => {
      const token = await tokenProvider();
      const headers = new Headers(init?.headers);
      headers.delete('api-key');
      headers.set('Authorization', `Bearer ${token}`);
      return fetch(url, { ...init, headers });
    },
  });
}

export function getDeploymentName(): string {
  return process.env.AZURE_OPENAI_DEPLOYMENT_NAME ?? 'gpt-4o';
}

/** Thrown when required Azure configuration is missing. */
export class AzureConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AzureConfigError';
  }
}
