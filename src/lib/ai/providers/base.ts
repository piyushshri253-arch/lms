import { AIMessage, AIGenerateOptions, AIGenerateResult, AIStreamChunk, AIProviderType } from '../types';

export abstract class BaseAIProvider {
  abstract readonly providerType: AIProviderType;
  abstract readonly defaultModel: string;
  abstract readonly fastModel: string;

  protected apiKey: string | null = null;
  protected baseUrl: string | null = null;

  constructor(apiKey?: string | null, baseUrl?: string | null) {
    this.apiKey = apiKey || null;
    this.baseUrl = baseUrl || null;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  abstract generateText(
    messages: AIMessage[],
    options?: AIGenerateOptions
  ): Promise<AIGenerateResult>;

  abstract generateStructured<T = any>(
    messages: AIMessage[],
    schema: Record<string, any>,
    options?: AIGenerateOptions
  ): Promise<{ data: T; usage: AIGenerateResult['usage']; model: string }>;

  abstract streamResponse(
    messages: AIMessage[],
    options?: AIGenerateOptions
  ): AsyncIterable<AIStreamChunk>;
}