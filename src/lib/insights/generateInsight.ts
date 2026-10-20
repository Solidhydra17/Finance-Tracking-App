import type { InsightContext, InsightQuotaStatus, InsightResult, InsightViewState } from './types'
import { normalizeInsightResult } from './types'
import { generateLocalInsight } from './localInsight'
import { generateGeminiInsight } from './geminiInsight'
import {
  clearQuotaStatus,
  getLocalDayKey,
  isOnline,
  readDailyInsight,
  readQuotaStatus,
  writeDailyInsight,
  writeQuotaStatus,
} from './insightStorage'
import { transactionRepository } from '@/storage'

/** Stable signature of current transactions — used to detect new/updated rows. */
export const getTransactionRevision = async (): Promise<string> => {
  const txs = await transactionRepository.getAll()
  if (txs.length === 0) return 'empty'
  return txs
    .map((t) => `${t.id}:${t.updatedAt}:${t.amount}:${t.type}:${t.categoryId}`)
    .sort()
    .join('|')
}

const createWithAiOrLocal = async (
  ctx: InsightContext,
  quotaBlocked: InsightQuotaStatus | null
): Promise<{ insight: InsightResult; quota: InsightQuotaStatus | null }> => {
  // Never call Gemini while free-tier is blocked — avoids extra usage / billing risk
  if (quotaBlocked) {
    return { insight: generateLocalInsight(ctx), quota: quotaBlocked }
  }

  const attempt = await generateGeminiInsight(ctx)

  if (attempt.ok) {
    await clearQuotaStatus()
    return { insight: attempt.insight, quota: null }
  }

  if (attempt.reason === 'quota') {
    await writeQuotaStatus(attempt.quota)
    return { insight: generateLocalInsight(ctx), quota: attempt.quota }
  }

  // no_key / network / error → local only, do not retry remote
  return { insight: generateLocalInsight(ctx), quota: null }
}

/**
 * Load today's insight (reuse first generation), or create one when online.
 * Pass force only when transactions changed and the user taps Regenerate.
 */
export const loadInsightForDay = async (
  ctx: InsightContext,
  options?: { force?: boolean }
): Promise<InsightViewState> => {
  const txRevision = await getTransactionRevision()
  const day = getLocalDayKey()
  const quota = await readQuotaStatus()
  const stored = await readDailyInsight()

  // Reuse today's saved insight unless regenerating
  if (stored && !options?.force) {
    return {
      status: 'ready',
      insight: normalizeInsightResult(stored.insight),
      txRevision: stored.txRevision,
      canRegenerate: stored.txRevision !== txRevision,
      quota,
    }
  }

  // Need a new generation (first of day or forced refresh)
  if (!isOnline()) {
    if (stored) {
      return {
        status: 'ready',
        insight: normalizeInsightResult(stored.insight),
        txRevision: stored.txRevision,
        canRegenerate: stored.txRevision !== txRevision,
        quota,
      }
    }
    return {
      status: 'offline_empty',
      insight: null,
      txRevision: null,
      canRegenerate: false,
      quota,
    }
  }

  // Force with no transaction change — keep existing
  if (options?.force && stored && stored.txRevision === txRevision) {
    return {
      status: 'ready',
      insight: normalizeInsightResult(stored.insight),
      txRevision: stored.txRevision,
      canRegenerate: false,
      quota,
    }
  }

  const { insight, quota: nextQuota } = await createWithAiOrLocal(ctx, quota)
  await writeDailyInsight({ day, txRevision, insight })

  return {
    status: 'ready',
    insight,
    txRevision,
    canRegenerate: false,
    quota: nextQuota,
  }
}
