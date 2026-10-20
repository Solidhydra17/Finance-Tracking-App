import type { InsightContext, InsightResult, InsightTone, InsightQuotaStatus } from './types'
import { generateLocalInsight } from './localInsight'
import { nextLocalMidnightIso } from './insightStorage'

const GEMINI_MODEL = 'gemini-2.0-flash'

export type GeminiAttempt =
  | { ok: true; insight: InsightResult }
  | { ok: false; reason: 'no_key' | 'network' | 'error' }
  | { ok: false; reason: 'quota'; quota: InsightQuotaStatus }

const inferTone = (text: string, fallback: InsightTone): InsightTone => {
  const lower = text.toLowerCase()
  if (
    lower.includes('overspend') ||
    lower.includes('out of hand') ||
    lower.includes('over budget') ||
    lower.includes('alert') ||
    lower.includes('danger')
  ) {
    return 'alert'
  }
  if (
    lower.includes('watch') ||
    lower.includes('careful') ||
    lower.includes('tight') ||
    lower.includes('nearing') ||
    lower.includes('high')
  ) {
    return 'watch'
  }
  if (
    lower.includes('great') ||
    lower.includes('solid') ||
    lower.includes('healthy') ||
    lower.includes('well done') ||
    lower.includes('on track')
  ) {
    return 'positive'
  }
  return fallback
}

const buildPrompt = (ctx: InsightContext): string => {
  return [
    'You are a concise personal finance coach inside KURIPOT, a Philippine peso (₱) budgeting app.',
    'Write exactly 2 short sentences of practical insight from the JSON snapshot below.',
    'Focus on spending pace, what looks out of hand, and one concrete observation.',
    'Use the peso amounts exactly as given. No markdown, bullets, greetings, or emojis.',
    'Do not invent numbers or categories that are not in the data.',
    '',
    JSON.stringify(ctx),
  ].join('\n')
}

const isQuotaResponse = (status: number, bodyText: string): boolean => {
  if (status === 429) return true
  const lower = bodyText.toLowerCase()
  return (
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('exceeded')
  )
}

const resolveBlockedUntil = (res: Response, bodyText: string): string => {
  const retryAfter = res.headers.get('retry-after')
  if (retryAfter) {
    const asSeconds = Number(retryAfter)
    if (!Number.isNaN(asSeconds) && asSeconds > 0) {
      return new Date(Date.now() + asSeconds * 1000).toISOString()
    }
    const asDate = Date.parse(retryAfter)
    if (!Number.isNaN(asDate)) return new Date(asDate).toISOString()
  }

  // Some Gemini errors include a retry delay in the JSON body
  try {
    const json = JSON.parse(bodyText) as {
      error?: { details?: Array<{ '@type'?: string; retryDelay?: string }> }
    }
    const details = json.error?.details || []
    for (const d of details) {
      if (d.retryDelay) {
        const match = /^(\d+(?:\.\d+)?)s$/.exec(d.retryDelay)
        if (match) {
          const sec = Math.ceil(parseFloat(match[1]))
          return new Date(Date.now() + sec * 1000).toISOString()
        }
      }
    }
  } catch {
    // ignore parse errors
  }

  return nextLocalMidnightIso()
}

/**
 * Single Gemini call. Never retries on quota errors (avoids burning free-tier / billing).
 */
export const generateGeminiInsight = async (
  ctx: InsightContext
): Promise<GeminiAttempt> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!apiKey?.trim()) return { ok: false, reason: 'no_key' }

  const local = generateLocalInsight(ctx)
  const prompt = buildPrompt(ctx)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey.trim())}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 160,
        },
      }),
    })
  } catch {
    return { ok: false, reason: 'network' }
  }

  const bodyText = await res.text()

  if (isQuotaResponse(res.status, bodyText)) {
    const blockedUntil = resolveBlockedUntil(res, bodyText)
    return {
      ok: false,
      reason: 'quota',
      quota: {
        blockedUntil,
        message:
          'Free AI limit reached. No more AI calls until it resets — using a local insight instead so you are not charged.',
      },
    }
  }

  if (!res.ok) return { ok: false, reason: 'error' }

  try {
    const json = JSON.parse(bodyText) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!text) return { ok: false, reason: 'error' }

    return {
      ok: true,
      insight: {
        text: text.replace(/\s+/g, ' ').trim(),
        tone: inferTone(text, local.tone),
        source: 'gemini',
        generatedAt: new Date().toISOString(),
      },
    }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
