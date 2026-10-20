import type { InsightContext, InsightResult, InsightTone } from './types'

export const generateLocalInsight = (ctx: InsightContext): InsightResult => {
  const parts: string[] = []
  let tone: InsightTone = 'neutral'

  if (ctx.transactionCount === 0) {
    return {
      text: `No activity logged ${ctx.periodLabel} yet. Add a few expenses or income entries and you'll get a clearer read on where money is going.`,
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
      `${top.name} is taking the bulk at ${top.percentage}% (${top.amountLabel}) — worth a closer look if that feels higher than usual.`
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

  if (ctx.largestExpenseLabel && ctx.largestExpenseCategory) {
    parts.push(
      `Largest single hit was ${ctx.largestExpenseLabel} under ${ctx.largestExpenseCategory}.`
    )
  }

  // Keep to ~2–3 short sentences worth of content
  const text = parts.slice(0, 3).join(' ')

  return {
    text,
    tone,
    source: 'local',
    generatedAt: new Date().toISOString(),
  }
}
