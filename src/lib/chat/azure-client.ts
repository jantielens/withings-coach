import { createAzure } from '@ai-sdk/azure';
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';

/**
 * Creates a configured Azure AI client using managed identity auth.
 *
 * Required environment variables:
 *  - AZURE_OPENAI_RESOURCE_NAME — Azure AI Foundry resource name (e.g. 'my-ai-foundry')
 *  - AZURE_OPENAI_DEPLOYMENT_NAME — model deployment name (default: 'gpt-4o')
 *
 * These are read at runtime, not build time.
 */
export function createAzureAIClient() {
  const resourceName = process.env.AZURE_OPENAI_RESOURCE_NAME;
  if (!resourceName) {
    throw new AzureConfigError(
      'AZURE_OPENAI_RESOURCE_NAME is not set. ' +
        'Add it to .env.local to connect to Azure AI Foundry.'
    );
  }

  const credential = new DefaultAzureCredential();
  const scope = 'https://cognitiveservices.azure.com/.default';
  const tokenProvider = getBearerTokenProvider(credential, scope);

  // The SDK requires an apiKey to pass validation, but we override auth
  // via a custom fetch that injects the managed identity bearer token.
  // The dummy key is never sent — our fetch replaces the auth header.
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
