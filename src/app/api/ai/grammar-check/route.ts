import { NextRequest, NextResponse } from 'next/server';
import { AIGateway } from '@/lib/ai/gateway';
import { checkGrammar, GrammarCheckResult } from '@/lib/grammar/grammarEngine';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({
        score: 100,
        status: 'clean',
        suggestions: [],
        correctedText: ''
      });
    }

    // 1. First run the instant heuristic grammar engine
    const heuristicResult = checkGrammar(text);

    // 2. If Gemini API is available, enhance with Deep AI Analysis
    try {
      const provider = await AIGateway.resolveProvider();
      if (provider.isConfigured()) {
        const prompt = `You are an expert English grammar, spelling, and educational copyeditor.
Analyze the following educational course content for any grammar errors, spelling mistakes, awkward phrasing, or punctuation issues.

Input text:
"""
${text}
"""

Return a valid JSON object ONLY with the following structure:
{
  "score": number (0 to 100),
  "suggestions": [
    {
      "original": "exact original word or short phrase",
      "suggestion": "corrected word or phrase",
      "reason": "concise explanation of the grammar/spelling rule or hint",
      "type": "spelling" | "grammar" | "punctuation" | "capitalization"
    }
  ],
  "correctedText": "the complete text with all corrections applied cleanly"
}`;

        const res = await provider.generateText(
          [
            {
              role: 'system',
              content: 'You are a precise, friendly grammar checking assistant. Output strictly valid JSON with no markdown formatting.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          {
            temperature: 0.2,
            responseFormat: 'json',
            maxTokens: 2048
          }
        );

        const cleanJsonStr = res.text
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();

        const parsed = JSON.parse(cleanJsonStr);
        if (parsed && Array.isArray(parsed.suggestions)) {
          return NextResponse.json({
            score: typeof parsed.score === 'number' ? parsed.score : 90,
            status: parsed.suggestions.length === 0 ? 'clean' : 'has_issues',
            suggestions: parsed.suggestions.map((s: any, idx: number) => ({
              id: `ai-${idx}`,
              original: String(s.original || ''),
              suggestion: String(s.suggestion || ''),
              reason: String(s.reason || 'Grammar improvement suggested.'),
              type: ['spelling', 'grammar', 'punctuation', 'capitalization'].includes(s.type)
                ? s.type
                : 'grammar'
            })),
            correctedText: parsed.correctedText || text,
            source: 'ai_deep'
          });
        }
      }
    } catch {
      // Fallback silently to heuristic engine on AI error/timeout
    }

    // Return high-quality heuristic check
    return NextResponse.json({
      ...heuristicResult,
      source: 'heuristic'
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Grammar check failed.' },
      { status: 500 }
    );
  }
}
