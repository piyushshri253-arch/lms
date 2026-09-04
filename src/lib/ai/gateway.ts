import { BaseAIProvider } from './providers/base';
import { GeminiProvider } from './providers/gemini';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { OpenRouterProvider } from './providers/openrouter';
import { AIGenerateResult, AIFeatureType } from './types';
import { prisma } from '../prisma';

export class AIGateway {
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