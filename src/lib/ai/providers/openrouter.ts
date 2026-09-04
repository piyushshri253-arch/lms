import { BaseAIProvider } from './base';
import { AIMessage, AIGenerateOptions, AIGenerateResult, AIStreamChunk, AIProviderType } from '../types';

export class OpenRouterProvider extends BaseAIProvider {
  readonly providerType: AIProviderType = 'OPENROUTER';
  readonly defaultModel = 'google/gemini-2.5-flash';
  readonly fastModel = 'meta-llama/llama-3.3-70b-instruct';

  constructor(apiKey?: string | null, baseUrl?: string | null) {
    super(apiKey || process.env.OPENROUTER_API_KEY || null, baseUrl || 'https://openrouter.ai/api/v1');
  }

  async generateText(messages: AIMessage[], options?: AIGenerateOptions): Promise<AIGenerateResult> {
    if (!this.isConfigured()) {
      throw new Error('AI Provider (OpenRouter) is not configured. Please set OPENROUTER_API_KEY.');
    }

    const model = options?.model || this.defaultModel;
    const url = this.baseUrl + '/chat/completions';

    const formattedMessages = [...messages];
    if (options?.systemInstruction && !messages.some((m) => m.role === 'system')) {
      formattedMessages.unshift({ role: 'system', content: options.systemInstruction });
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.apiKey,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://morenateach.com',
        'X-Title': 'Morena Teach LMS'
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error('OpenRouter API error (' + res.status + '): ' + err);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const promptTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;

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
        totalTokens: promptTokens + outputTokens
      },
      provider: 'OPENROUTER',
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