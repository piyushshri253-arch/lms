const fs = require('fs');
const path = require('path');

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content.trim(), 'utf8');
  console.log(`[Created] ${filePath}`);
}

// 1. Gemini Provider
writeFile('src/lib/ai/providers/gemini.ts', `
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
      throw new Error('Gemini API key is not configured. Please provide GEMINI_API_KEY in environment variables.');
    }

    const model = options?.model || this.defaultModel;
    const url = \`\${this.baseUrl}/models/\${model}:generateContent?key=\${this.apiKey}\`;

    const systemInstruction = options?.systemInstruction
      ? { parts: [{ text: options.systemInstruction }] }
      : messages.find((m) => m.role === 'system')
      ? { parts: [{ text: messages.find((m) => m.role === 'system')!.content }] }
      : undefined;

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
      throw new Error(\`Gemini API error (\${res.status}): \${err}\`);
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
        // Fallback or cleaned json extraction
        const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
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
    const url = \`\${this.baseUrl}/models/\${model}:streamGenerateContent?alt=sse&key=\${this.apiKey}\`;

    const systemInstruction = options?.systemInstruction
      ? { parts: [{ text: options.systemInstruction }] }
      : messages.find((m) => m.role === 'system')
      ? { parts: [{ text: messages.find((m) => m.role === 'system')!.content }] }
      : undefined;

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
      throw new Error(\`Gemini Stream error (\${res.status}): \${err}\`);
    }

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\\n');
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
`);

// 2. OpenAI Provider
writeFile('src/lib/ai/providers/openai.ts', `
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
      throw new Error('OpenAI API key is not configured. Please provide OPENAI_API_KEY.');
    }

    const model = options?.model || this.defaultModel;
    const url = \`\${this.baseUrl}/chat/completions\`;

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
        Authorization: \`Bearer \${this.apiKey}\`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(\`OpenAI API error (\${res.status}): \${err}\`);
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
        const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
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
    const url = \`\${this.baseUrl}/chat/completions\`;

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
        Authorization: \`Bearer \${this.apiKey}\`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(\`OpenAI Stream error (\${res.status}): \${err}\`);
    }

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\\n');
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
`);

// 3. Anthropic Provider
writeFile('src/lib/ai/providers/anthropic.ts', `
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
      throw new Error('Anthropic API key is not configured. Please provide ANTHROPIC_API_KEY.');
    }

    const model = options?.model || this.defaultModel;
    const url = \`\${this.baseUrl}/messages\`;

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
      throw new Error(\`Anthropic API error (\${res.status}): \${err}\`);
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
        const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
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
    // Yield simulated streaming for standard response
    const words = full.text.split(' ');
    for (const word of words) {
      yield { text: word + ' ', isDone: false };
      await new Promise((r) => setTimeout(r, 20));
    }
    yield { text: '', isDone: true, usage: full.usage };
  }
}
`);

// 4. OpenRouter Provider
writeFile('src/lib/ai/providers/openrouter.ts', `
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
      throw new Error('OpenRouter API key is not configured. Please provide OPENROUTER_API_KEY.');
    }

    const model = options?.model || this.defaultModel;
    const url = \`\${this.baseUrl}/chat/completions\`;

    const formattedMessages = [...messages];
    if (options?.systemInstruction && !messages.some((m) => m.role === 'system')) {
      formattedMessages.unshift({ role: 'system', content: options.systemInstruction });
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: \`Bearer \${this.apiKey}\`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://aadhyara.com',
        'X-Title': 'AADHYARA LMS'
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
      throw new Error(\`OpenRouter API error (\${res.status}): \${err}\`);
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
        const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
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
      await new Promise((r) => setTimeout(r, 20));
    }
    yield { text: '', isDone: true, usage: full.usage };
  }
}
`);

// 5. Central AI Gateway
writeFile('src/lib/ai/gateway.ts', `
import { BaseAIProvider } from './providers/base';
import { GeminiProvider } from './providers/gemini';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { OpenRouterProvider } from './providers/openrouter';
import { AIMessage, AIGenerateOptions, AIGenerateResult, AIFeatureType } from './types';
import { prisma } from '../prisma';

export class AIGateway {
  /**
   * Resolves active AI provider with hierarchical priority:
   * 1. Tenant custom override key (from AiSetting table)
   * 2. Platform Gemini Key (Default fast)
   * 3. Platform OpenAI Key
   * 4. Platform Anthropic Key
   * 5. Platform OpenRouter Key
   */
  static async resolveProvider(organizationId?: string): Promise<BaseAIProvider> {
    if (organizationId) {
      try {
        const setting = await prisma.aiSetting.findUnique({
          where: { organizationId }
        });

        if (setting?.apiKeyOverride && setting?.providerOverride) {
          switch (setting.providerOverride) {
            case 'GEMINI':
              return new GeminiProvider(setting.apiKeyOverride);
            case 'OPENAI':
              return new OpenAIProvider(setting.apiKeyOverride);
            case 'ANTHROPIC':
              return new AnthropicProvider(setting.apiKeyOverride);
            case 'OPENROUTER':
              return new OpenRouterProvider(setting.apiKeyOverride);
          }
        }
      } catch {}
    }

    if (process.env.GEMINI_API_KEY) return new GeminiProvider();
    if (process.env.OPENAI_API_KEY) return new OpenAIProvider();
    if (process.env.ANTHROPIC_API_KEY) return new AnthropicProvider();
    if (process.env.OPENROUTER_API_KEY) return new OpenRouterProvider();

    return new GeminiProvider(null);
  }

  /**
   * Logs AI token usage and estimated cost for auditing & rate limiting
   */
  static async recordUsage(
    organizationId: string | null | undefined,
    userId: string,
    feature: AIFeatureType,
    result: AIGenerateResult
  ): Promise<void> {
    try {
      await prisma.aiUsageLog.create({
        data: {
          organizationId: organizationId || null,
          userId,
          feature,
          provider: result.provider,
          model: result.model,
          promptTokens: result.usage.promptTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
          costEstimated: result.usage.estimatedCostUSD || 0
        }
      });

      if (organizationId) {
        await prisma.aiSetting.upsert({
          where: { organizationId },
          create: {
            organizationId,
            tokensUsedThisMonth: result.usage.totalTokens
          },
          update: {
            tokensUsedThisMonth: { increment: result.usage.totalTokens }
          }
        });
      }
    } catch (e) {
      console.error('[AI Usage Log Error]:', e);
    }
  }

  /**
   * Verifies if organization has not exceeded its monthly token quota
   */
  static async checkQuota(organizationId?: string): Promise<boolean> {
    if (!organizationId) return true;
    try {
      const setting = await prisma.aiSetting.findUnique({
        where: { organizationId }
      });
      if (!setting) return true;
      return setting.tokensUsedThisMonth < setting.monthlyTokenQuota;
    } catch {
      return true;
    }
  }
}
`);

console.log('Core AI Engine & Providers successfully created!');