import { BaseAIProvider } from './base';
import { AIMessage, AIGenerateOptions, AIGenerateResult, AIStreamChunk, AIProviderType } from '../types';

export class GeminiProvider extends BaseAIProvider {
  readonly providerType: AIProviderType = 'GEMINI';
  readonly defaultModel = 'gemini-2.5-flash';
  readonly fastModel = 'gemini-2.0-flash';

  constructor(apiKey?: string | null, baseUrl?: string | null) {
    super(apiKey || process.env.GEMINI_API_KEY || null, baseUrl || 'https://generativelanguage.googleapis.com/v1beta');
  }

  private formatContents(messages: AIMessage[]) {
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
  }

  async generateText(messages: AIMessage[], options?: AIGenerateOptions): Promise<AIGenerateResult> {
    if (!this.isConfigured()) {
      throw new Error('AI Provider (Gemini) is not configured. Please set GEMINI_API_KEY.');
    }

    const model = options?.model || this.defaultModel;
    const url = this.baseUrl + '/models/' + model + ':generateContent?key=' + this.apiKey;

    const sysMsg = options?.systemInstruction || messages.find((m) => m.role === 'system')?.content;
    const systemInstruction = sysMsg ? { parts: [{ text: sysMsg }] } : undefined;

    const payload: Record<string, any> = {
      contents: this.formatContents(messages),
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 4096,
        responseMimeType: options?.responseFormat === 'json' || options?.jsonSchema ? 'application/json' : 'text/plain'
      }
    };

    if (systemInstruction) payload.systemInstruction = systemInstruction;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error('Gemini API error (' + res.status + '): ' + err);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';
    const promptTokens = data.usageMetadata?.promptTokenCount || 0;
    const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;

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
        estimatedCostUSD: (promptTokens * 0.075 + outputTokens * 0.3) / 1000000
      },
      provider: 'GEMINI',
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
      throw new Error('Gemini API key is not configured.');
    }

    const model = options?.model || this.defaultModel;
    const url = this.baseUrl + '/models/' + model + ':streamGenerateContent?alt=sse&key=' + this.apiKey;

    const sysMsg = options?.systemInstruction || messages.find((m) => m.role === 'system')?.content;
    const systemInstruction = sysMsg ? { parts: [{ text: sysMsg }] } : undefined;

    const payload: Record<string, any> = {
      contents: this.formatContents(messages),
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 4096
      }
    };

    if (systemInstruction) payload.systemInstruction = systemInstruction;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error('Gemini Stream error (' + res.status + '): ' + err);
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
          try {
            const parsed = JSON.parse(line.slice(6));
            const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
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