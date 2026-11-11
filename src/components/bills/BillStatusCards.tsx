import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadBillBoard, type BillCard } from '@/lib/billBoard'
import type { BillTone } from '@/lib/paymentPlanSchedule'

const CARD_STYLE: Record<BillTone, { label: string; surface: string; number: string; pill: string }> = {
  overdue: {
    label: 'Overdue',
    surface: 'border-danger-500/50 bg-[var(--card-bg)]',
    number: 'text-danger-500',
    pill: 'bg-danger-600 text-white',
  },
  red: {
    label: 'N days left',
    surface: 'border-danger-500/30 bg-[var(--card-bg)]',
    number: 'text-danger-500 dark:text-danger-400',
    pill: 'bg-danger-500/15 text-danger-700 dark:text-danger-300',
  },
  amber: {
    label: 'Due in N days',
    surface: 'border-warning-500/40 bg-[var(--card-bg)]',
    number: 'text-warning-600 dark:text-warning-400',
    pill: 'bg-warning-500/15 text-warning-800 dark:text-warning-300',
  },
  green: {
    label: 'On track',
    surface: 'border-success-500/40 bg-[var(--card-bg)]',
    number: 'text-success-600 dark:text-success-400',
    pill: 'bg-success-500/15 text-success-800 dark:text-success-300',
  },
}

const EMPTY_CARDS: BillCard[] = (['overdue', 'red', 'amber', 'green'] as BillTone[]).map((tone) => ({
  tone,
  count: 0,
  detail: 'No bills',
  pill: 'None',
}))

const BillCardFace = ({ card }: { card: BillCard }) => {
  const style = CARD_STYLE[card.tone]
  return (
    <div className={`flex min-h-[9.5rem] flex-col rounded-[1.4rem] border p-4 ${style.surface}`}>
      <p className="text-sm font-semibold leading-tight text-[var(--text-muted)]">{style.label}</p>
      <p className={`mt-3 text-4xl font-black leading-none tracking-tight ${style.number}`}>{card.count}</p>
      <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-[var(--text-main)]">{card.detail}</p>
      <span className={`mt-auto inline-flex w-fit max-w-full items-center truncate rounded-full px-2.5 py-1 text-[11px] font-bold ${style.pill}`}>
        {card.pill}
      </span>
    </div>
  )
}

export const BillStatusCards = () => {
  const [cards, setCards] = useState<BillCard[] | null>(null)

  useEffect(() => {
    let active = true
    loadBillBoard()
      .then((board) => {
        if (active) setCards(board.cards)
      })
      .catch(() => {
        if (active) setCards(EMPTY_CARDS)
      })
    return () => {
      active = false
    }
  }, [])

  if (!cards) return null

  return (
    <section aria-label="Bill status" className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Bills</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((card) => {
          const style = CARD_STYLE[card.tone]
          return (
            <Link
              key={card.tone}
              to="/payment-planner"
              aria-label={`${card.count} ${style.label}. ${card.detail}. ${card.pill}. Open payment planner`}
              className="active:scale-[0.98]"
            >
              <BillCardFace card={card} />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
