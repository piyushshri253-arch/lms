import { AIGateway } from './gateway';
import { SYSTEM_PROMPT_WEBSITE_BUILDER } from './prompts';
import { AIMessage } from './types';

export interface GeneratedSectionPayload {
  type: string;
  title: string;
  subtitle: string;
  content: Record<string, any>;
  order: number;
}

export interface GeneratedWebsiteResponse {
  title: string;
  description: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    borderRadius: string;
  };
  sections: GeneratedSectionPayload[];
}

export class AIWebsiteGenerator {
  static async generateWebsiteFromPrompt(
    prompt: string,
    orgContext: { name: string; industry?: string; description?: string },
    organizationId?: string
  ): Promise<GeneratedWebsiteResponse> {
    const provider = await AIGateway.resolveProvider(organizationId);
    if (!provider.isConfigured()) {
      throw new Error('AI Provider is not configured. Please add GEMINI_API_KEY or configure provider in Settings.');
    }

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT_WEBSITE_BUILDER
      },
      {
        role: 'user',
        content: 'Generate a complete high-converting landing page for academy: "' + orgContext.name + '" (Industry: ' + (orgContext.industry || 'Online Education') + '). Description: "' + (orgContext.description || '') + '". Prompt / Vision: "' + prompt + '".\nInclude sections: HERO, BENEFITS, FEATURED_COURSES, TESTIMONIALS, FAQ, CTA, FOOTER with realistic high quality copywriting, badges, ratings, and call-to-action buttons.'
      }
    ];

    const schema = {
      title: 'Academy Website Title',
      description: 'SEO Meta Description',
      theme: {
        primaryColor: '#4f46e5',
        secondaryColor: '#10b981',
        fontFamily: 'Plus Jakarta Sans',
        borderRadius: '0.75rem'
      },
      sections: [
        {
          type: 'HERO',
          title: 'Master Modern Skills with Industry Mentors',
          subtitle: 'Join over 10,000+ graduates who transformed their career.',
          content: {
            badge: 'Top Rated LMS 2026',
            primaryCtaText: 'Explore All Courses',
            primaryCtaUrl: '/courses',
            secondaryCtaText: 'Free Trial',
            secondaryCtaUrl: '/register'
          },
          order: 1
        }
      ]
    };

    const result = await provider.generateStructured<GeneratedWebsiteResponse>(messages, schema, {
      temperature: 0.7,
      organizationId
    });

    return result.data;
  }
}