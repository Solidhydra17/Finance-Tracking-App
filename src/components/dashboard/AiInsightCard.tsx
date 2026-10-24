import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui'
import type { DashboardData } from '@/domain/dashboard/types'
import type { PlannedVsActual } from '@/domain/budget/budgetEngine'
import { buildInsightContext, formatGoalSection, formatTrendSection } from '@/lib/insights/buildContext'
import { loadInsightForDay } from '@/lib/insights/generateInsight'
import { formatAvailableAt, isOnline } from '@/lib/insights/insightStorage'
import type { InsightContext, InsightQuotaStatus, InsightResult, InsightTone } from '@/lib/insights/types'
import { composeInsightText, normalizeInsightResult } from '@/lib/insights/types'

const withLiveTrendAndGoal = (insight: InsightResult, ctx: InsightContext): InsightResult => {
  const base = normalizeInsightResult(insight)
  const trend = formatTrendSection(ctx)
  const goal = formatGoalSection(ctx)
  return {
    ...base,
    trend,
    goal,
    text: composeInsightText(base.observation, base.suggestion, trend, goal),
  }
}

type AiInsightCardProps = {
  data: DashboardData
  periodPreset: string
  pva: Map<number, PlannedVsActual>
  projectedBalance: number
  creditDebt: number
  youOwe: number
  presentation?: 'home' | 'page'
}

const toneStyles: Record<InsightTone, string> = {
  positive: 'border-l-success-500',
  neutral: 'border-l-midblue',
  watch: 'border-l-amber-500',
  alert: 'border-l-danger-500',
}

const InsightBlock: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="space-y-1.5">
    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
      {label}
    </p>
    <p className="text-sm leading-relaxed text-[var(--text-main)] font-medium whitespace-pre-line">
      {children}
    </p>
  </div>
)

export const AiInsightCard: React.FC<AiInsightCardProps> = ({
  data,
  periodPreset,
  pva,
  projectedBalance,
  creditDebt,
  youOwe,
  presentation = 'home',
}) => {
  const [insight, setInsight] = useState<InsightResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [offlineEmpty, setOfflineEmpty] = useState(false)
  const [canRegenerate, setCanRegenerate] = useState(false)
  const [quota, setQuota] = useState<InsightQuotaStatus | null>(null)
  const [regenHint, setRegenHint] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  const buildCtx = useCallback(async () => {
    const categoryNames = new Map<number, string>()
    data.categoryBreakdown.forEach((c) => {
      categoryNames.set(c.categoryId, c.categoryName)
    })
    return buildInsightContext({
      data,
      periodPreset,
      pva,
      categoryNames,
      projectedBalance,
      creditDebt,
      youOwe,
    })
  }, [data, periodPreset, pva, projectedBalance, creditDebt, youOwe])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setRegenHint(null)
      try {
        const ctx = await buildCtx()
        const view = await loadInsightForDay(ctx)
        if (cancelled) return
        setOfflineEmpty(view.status === 'offline_empty')
        setInsight(view.insight ? withLiveTrendAndGoal(view.insight, ctx) : null)
        setCanRegenerate(view.canRegenerate)
        setQuota(view.quota)
      } catch {
        if (cancelled) return
        if (!isOnline()) {
          setOfflineEmpty(true)
          setInsight(null)
          setCanRegenerate(false)
        } else {
          const { generateLocalInsight } = await import('@/lib/insights/localInsight')
          const ctx = await buildCtx()
          setOfflineEmpty(false)
          setInsight(withLiveTrendAndGoal(generateLocalInsight(ctx), ctx))
          setCanRegenerate(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [buildCtx])

  const handleRegenerate = async () => {
    if (!canRegenerate || regenerating) return

    if (!isOnline()) {
      setRegenHint('Connect to the internet to refresh today’s insight.')
      return
    }

    setRegenerating(true)
    setRegenHint(null)
    try {
      const ctx = await buildCtx()
      const view = await loadInsightForDay(ctx, { force: true })
      setOfflineEmpty(view.status === 'offline_empty')
      setInsight(view.insight ? withLiveTrendAndGoal(view.insight, ctx) : null)
      setCanRegenerate(view.canRegenerate)
      setQuota(view.quota)
    } catch {
      setRegenHint('Could not refresh insight. Try again later.')
    } finally {
      setRegenerating(false)
    }
  }

  const handleRegenerateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      void handleRegenerate()
    }
  }

  const tone = insight?.tone ?? 'neutral'
  const hasSections = Boolean(
    insight && (insight.observation || insight.suggestion || insight.trend || insight.goal)
  )
  const detailSections = [
    insight?.suggestion ? { label: 'Suggestion', text: insight.suggestion } : null,
    insight?.trend ? { label: 'vs Last month', text: insight.trend } : null,
    insight?.goal ? { label: 'Goal', text: insight.goal } : null,
  ].filter((section): section is { label: string; text: string } => section !== null)

  return (
    <section
      id="section-ai-insight"
      className={`bg-[var(--card-bg)] rounded-3xl p-5 border-2 border-[var(--card-border)] border-l-4 ${toneStyles[tone]}`}
      aria-live="polite"
      aria-busy={loading}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-midblue/10 flex items-center justify-center shrink-0">
          <Icon name="SparklesIcon" className="w-4 h-4 text-midblue" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider leading-tight">
            Insight
          </h3>
          <p className="text-[10px] font-medium text-[var(--text-muted)] leading-tight">
            {insight?.source === 'gemini'
              ? 'AI · saved for today'
              : insight
                ? 'From your data · saved for today'
                : 'Daily insight'}
          </p>
        </div>
        {canRegenerate && (
          <button
            type="button"
            onClick={handleRegenerate}
            onKeyDown={handleRegenerateKeyDown}
            disabled={regenerating}
            aria-label="Regenerate insight from updated transactions"
            tabIndex={0}
            className="shrink-0 h-7 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wide text-midblue bg-midblue/10 border border-midblue/30 active:scale-95 transition-all disabled:opacity-50"
          >
            {regenerating ? 'Updating…' : 'Regenerate'}
          </button>
        )}
      </div>

      {loading && !insight && !offlineEmpty ? (
        <p className="text-sm text-[var(--text-muted)] animate-pulse">
          Reading your spending…
        </p>
      ) : offlineEmpty ? (
        <div className="space-y-1">
          <p className="text-sm leading-relaxed text-[var(--text-main)] font-medium">
            You’re offline and there’s no saved insight for today yet.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Connect once to generate today’s insight. It will be reused for the rest of the day.
          </p>
        </div>
      ) : hasSections ? (
        <div className="flex flex-col">
          {insight?.observation ? (
            <InsightBlock label="Overview">{insight.observation}</InsightBlock>
          ) : null}
          {detailSections.length > 0 ? (
            <div className={insight?.observation ? 'mt-4 pt-4 border-t border-[var(--card-border)]' : ''}>
              {presentation === 'page' ? (
                <div id="insight-extra-details" className="flex flex-col gap-4">
                  {detailSections.map((section) => (
                    <InsightBlock key={section.label} label={section.label}>
                      {section.text}
                    </InsightBlock>
                  ))}
                </div>
              ) : (
                <Link
                  to="/insight"
                  aria-label="View insight details"
                  className="flex min-h-11 w-full items-center justify-center rounded-xl bg-midblue text-xs font-bold uppercase tracking-widest text-white active:scale-[0.99]"
                >
                  View details
                </Link>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-[var(--text-main)] font-medium whitespace-pre-line">
          {insight?.text}
        </p>
      )}

      {quota && (
        <p className="mt-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400 font-medium">
          Free AI limit reached — AI calls are paused so you won’t be charged.
          {quota.blockedUntil
            ? ` Try again around ${formatAvailableAt(quota.blockedUntil)}.`
            : ''}
          {' '}A local insight is shown instead.
        </p>
      )}

      {regenHint && (
        <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)] font-medium">
          {regenHint}
        </p>
      )}

      {canRegenerate && !regenHint && (
        <p className="mt-2 text-[10px] text-[var(--text-muted)]">
          New or updated transactions detected
        </p>
      )}
    </section>
  )
}
