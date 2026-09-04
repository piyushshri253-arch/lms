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