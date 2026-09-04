import { BaseAIProvider } from './base';
import { AIMessage, AIGenerateOptions, AIGenerateResult, AIStreamChunk, AIProviderType } from '../types';

export class OpenAIProvider extends BaseAIProvider {
  readonly providerType: AIProviderType = 'OPENAI';
  readonly defaultModel = 'gpt-4o';
  readonly fastModel = 'gpt-4o-mini';

  constructor(apiKey?: string | null, baseUrl?: string | null) {
    super(apiKey || process.env.OPENAI_API_KEY || null, baseUrl || 'https://api.openai.com/v1');
  }

  async generateText(messages: AIMessage[], options?: AIGenerateOptions): Promise<AIGenerateResult> {
    if (!this.isConfigured()) {
      throw new Error('AI Provider (OpenAI) is not configured. Please set OPENAI_API_KEY.');
    }

    const model = options?.model || this.defaultModel;
    const url = this.baseUrl + '/chat/completions';

    const formattedMessages = [...messages];
    if (options?.systemInstruction && !messages.some((m) => m.role === 'system')) {
      formattedMessages.unshift({ role: 'system', content: options.systemInstruction });
    }

    const payload: Record<string, any> = {
      model,
      messages: formattedMessages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096
    };

    if (options?.responseFormat === 'json' || options?.jsonSchema) {
      payload.response_format = { type: 'json_object' };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error('OpenAI API error (' + res.status + '): ' + err);
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
        totalTokens: promptTokens + outputTokens,
        estimatedCostUSD: (promptTokens * 2.5 + outputTokens * 10) / 1000000
      },
      provider: 'OPENAI',
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
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key is not configured.');
    }

    const model = options?.model || this.defaultModel;
    const url = this.baseUrl + '/chat/completions';

    const formattedMessages = [...messages];
    if (options?.systemInstruction && !messages.some((m) => m.role === 'system')) {
      formattedMessages.unshift({ role: 'system', content: options.systemInstruction });
    }

    const payload = {
      model,
      messages: formattedMessages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.7,
      stream: true
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error('OpenAI Stream error (' + res.status + '): ' + err);
    }

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const content = line.slice(6).trim();
          if (content === '[DONE]') {
            yield { text: '', isDone: true };
            return;
          }
          try {
            const parsed = JSON.parse(content);
            const chunkText = parsed.choices?.[0]?.delta?.content || '';
            if (chunkText) {
              yield { text: chunkText, isDone: false };
            }
          } catch {}
        }
      }
    }

    yield { text: '', isDone: true };
  }
}