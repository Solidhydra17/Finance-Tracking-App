import type { InsightContext, InsightResult, InsightTone } from './types'

const buildSuggestion = (ctx: InsightContext, tone: InsightTone): string => {
  const over = ctx.budgetPressures.filter((b) => b.isOver)
  const nearing = ctx.budgetPressures.filter((b) => !b.isOver && b.percentUsed >= 80)
  const top = ctx.topCategories[0]

  if (over.length > 0) {
    const name = over[0].name
    return `Try trimming ${name} this period, or raise that budget if the spend is necessary.`
  }

  if (ctx.savingsRatePct !== null && ctx.savingsRatePct < 0) {
    if (top) {
      return `Cut back on ${top.name} first — it’s your largest share — until expenses sit under income.`
    }
    return `Pause non-essential spending until expenses sit under your income.`
  }

  if (nearing.length > 0) {
    return `Keep an eye on ${nearing[0].name} and hold off extras there so you stay within budget.`
  }

  if (top && top.percentage >= 40) {
    return `Consider capping ${top.name} or shifting a bit of that spend to savings.`
  }

  if (tone === 'positive' || (ctx.savingsRatePct !== null && ctx.savingsRatePct >= 20)) {
    if (top) {
      return `Keep this pace — and keep ${top.name} around where it is if it still feels intentional.`
    }
    return `Keep this spending pace; it’s working — no need to change course right now.`
  }

  if (ctx.savingsRatePct !== null && ctx.savingsRatePct < 10) {
    return `Try setting aside a small fixed amount first each payday before discretionary spends.`
  }

  if (top) {
    return `Review ${top.name} for one easy cut, or keep it if that spend is already planned.`
  }

  return `Log consistently and review categories weekly so small leaks don’t grow.`
}

export const generateLocalInsight = (ctx: InsightContext): InsightResult => {
  const parts: string[] = []
  let tone: InsightTone = 'neutral'

  if (ctx.transactionCount === 0) {
    return {
      text: `No activity logged ${ctx.periodLabel} yet. Add a few expenses or income entries so we can suggest what to change — or keep — next.`,
      tone: 'neutral',
      source: 'local',
      generatedAt: new Date().toISOString(),
    }
  }

  if (ctx.savingsRatePct !== null && ctx.savingsRatePct < 0) {
    tone = 'alert'
    parts.push(
      `Spending is outpacing income ${ctx.periodLabel}: you spent ${ctx.expensesLabel} against ${ctx.incomeLabel} in.`
    )
  } else if (ctx.savingsRatePct !== null && ctx.savingsRatePct < 10) {
    tone = 'watch'
    parts.push(
      `You're barely ahead ${ctx.periodLabel} — expenses ${ctx.expensesLabel} vs income ${ctx.incomeLabel} (about ${ctx.savingsRatePct}% left).`
    )
  } else if (ctx.savingsRatePct !== null && ctx.savingsRatePct >= 20) {
    tone = 'positive'
    parts.push(
      `Solid pace ${ctx.periodLabel}: you've kept about ${ctx.savingsRatePct}% after spending ${ctx.expensesLabel}.`
    )
  } else {
    parts.push(
      `${ctx.periodLabel.charAt(0).toUpperCase() + ctx.periodLabel.slice(1)} you've spent ${ctx.expensesLabel} with ${ctx.incomeLabel} in.`
    )
  }

  const top = ctx.topCategories[0]
  if (top && top.percentage >= 40) {
    if (tone === 'neutral') tone = 'watch'
    parts.push(
      `${top.name} is taking the bulk at ${top.percentage}% (${top.amountLabel}).`
    )
  } else if (top) {
    parts.push(`Biggest slice is ${top.name} at ${top.percentage}% (${top.amountLabel}).`)
  }

  const over = ctx.budgetPressures.filter((b) => b.isOver)
  const nearing = ctx.budgetPressures.filter((b) => !b.isOver && b.percentUsed >= 80)
  if (over.length > 0) {
    tone = 'alert'
    const names = over.map((b) => `${b.name} (${b.percentUsed}%)`).join(', ')
    parts.push(`Budget overrun: ${names}.`)
  } else if (nearing.length > 0) {
    if (tone === 'positive') tone = 'watch'
    else if (tone === 'neutral') tone = 'watch'
    const names = nearing.map((b) => `${b.name} at ${b.percentUsed}%`).join(', ')
    parts.push(`Getting close on budget: ${names}.`)
  }

  // Observation (up to 2 beats), then blank line, then keep/change suggestion
  const observation = parts.slice(0, 2).join(' ')
  const suggestion = buildSuggestion(ctx, tone)
  const text = `${observation}\n\n${suggestion}`

  return {
    text,
    tone,
    source: 'local',
    generatedAt: new Date().toISOString(),
  }
}
