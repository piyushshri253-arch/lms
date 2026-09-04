import { BaseAIProvider } from './base';
import { AIMessage, AIGenerateOptions, AIGenerateResult, AIStreamChunk, AIProviderType } from '../types';

export class AnthropicProvider extends BaseAIProvider {
  readonly providerType: AIProviderType = 'ANTHROPIC';
  readonly defaultModel = 'claude-3-5-sonnet-20241022';
  readonly fastModel = 'claude-3-5-haiku-20241022';

  constructor(apiKey?: string | null, baseUrl?: string | null) {
    super(apiKey || process.env.ANTHROPIC_API_KEY || null, baseUrl || 'https://api.anthropic.com/v1');
  }

  async generateText(messages: AIMessage[], options?: AIGenerateOptions): Promise<AIGenerateResult> {
    if (!this.isConfigured()) {
      throw new Error('AI Provider (Anthropic) is not configured. Please set ANTHROPIC_API_KEY.');
    }

    const model = options?.model || this.defaultModel;
    const url = this.baseUrl + '/messages';

    const systemMessage =
      options?.systemInstruction || messages.find((m) => m.role === 'system')?.content || undefined;

    const userAndAssistantMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

    const payload: Record<string, any> = {
      model,
      messages: userAndAssistantMessages,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7
    };

    if (systemMessage) payload.system = systemMessage;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error('Anthropic API error (' + res.status + '): ' + err);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const promptTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;

    let structuredData: any = undefined;
    if (options?.responseFormat === 'json' || options?.jsonSchema) {
      try {
        structuredData = JSON.parse(text);
      } catch {
        const clean = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
        structuredData = JSON.parse(clean);
      }
    }

    return {
      text,
      structuredData,
      usage: {
        promptTokens,
        outputTokens,
        totalTokens: promptTokens + outputTokens,
        estimatedCostUSD: (promptTokens * 3.0 + outputTokens * 15.0) / 1000000
      },
      provider: 'ANTHROPIC',
      model
    };
  }

  async generateStructured<T = any>(
    messages: AIMessage[],
    schema: Record<string, any>,
    options?: AIGenerateOptions
  ): Promise<{ data: T; usage: AIGenerateResult['usage']; model: string }> {
    const res = await this.generateText(messages, {
      ...options,
      responseFormat: 'json',
      jsonSchema: schema
    });
    return {
      data: res.structuredData as T,
      usage: res.usage,
      model: res.model
    };
  }

  async *streamResponse(messages: AIMessage[], options?: AIGenerateOptions): AsyncIterable<AIStreamChunk> {
    const full = await this.generateText(messages, options);
    const words = full.text.split(' ');
    for (const word of words) {
      yield { text: word + ' ', isDone: false };
      await new Promise((r) => setTimeout(r, 15));
    }
    yield { text: '', isDone: true, usage: full.usage };
  }
}