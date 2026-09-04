const fs = require('fs');
const path = require('path');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFile(filePath, content) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`[Created] ${filePath}`);
}

// 1. types.ts
writeFile('src/lib/ai/types.ts', `
export type AIProviderType = 'GEMINI' | 'OPENAI' | 'ANTHROPIC' | 'OPENROUTER';

export type AIFeatureType =
  | 'SUPPORT_BOT'
  | 'COURSE_GENERATOR'
  | 'LESSON_GENERATOR'
  | 'QUIZ_GENERATOR'
  | 'ASSIGNMENT_GENERATOR'
  | 'STUDENT_TUTOR'
  | 'WEBSITE_BUILDER'
  | 'ANALYTICS_COPILOT'
  | 'CONTENT_TRANSFORM';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface AIGenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  jsonSchema?: Record<string, any>;
  responseFormat?: 'text' | 'json';
  tools?: AIToolDefinition[];
  organizationId?: string;
  userId?: string;
  feature?: AIFeatureType;
}

export interface AIUsageMetrics {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD?: number;
}

export interface AIGenerateResult {
  text: string;
  structuredData?: any;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, any>;
  }>;
  usage: AIUsageMetrics;
  provider: AIProviderType;
  model: string;
}

export interface AIStreamChunk {
  text: string;
  isDone: boolean;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, any>;
  }>;
  usage?: AIUsageMetrics;
}

export interface AIProviderConfig {
  apiKey?: string;
  defaultModel?: string;
  fastModel?: string;
  baseUrl?: string;
}
`);

// 2. providers/base.ts
writeFile('src/lib/ai/providers/base.ts', `
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
`);

console.log('Setup script ready');