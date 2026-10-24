import { centsToDisplay } from '@/lib/money'

export type BudgetRing = {
  id: string
  name: string
  percentage: number
  color: string
  actual: number
  plannedCents: number
}

type BudgetRingsProps = {
  rows: BudgetRing[]
  spentCents: number
  hidden: boolean
}

const START = 150
const SWEEP = 250
const SIZE = 240
const CENTER = SIZE / 2

const ringLayout = (count: number) => {
  const shown = Math.min(Math.max(count, 1), 6)
  const stroke = shown >= 6 ? 7 : shown >= 5 ? 8 : 10
  const gap = 4
  const innerEdge = shown >= 6 ? 50 : 58
  const step = stroke + gap
  const radii = Array.from({ length: shown }, (_, index) => innerEdge + stroke / 2 + (shown - 1 - index) * step)
  return { stroke, radii, maxTextWidth: innerEdge * 2 - 12 }
}

const amountSize = (label: string, maxWidth: number) => {
  const preferred = 22
  const fitted = maxWidth / (label.length * 0.62)
  return Math.max(8, Math.min(preferred, fitted))
}

const ringPoint = (cx: number, cy: number, radius: number, angle: number) => {
  const radians = (angle * Math.PI) / 180
  return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)]
}

const ringPath = (cx: number, cy: number, radius: number, start: number, end: number) => {
  const [x1, y1] = ringPoint(cx, cy, radius, start)
  const [x2, y2] = ringPoint(cx, cy, radius, end)
  const large = end - start > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`
}

export const BudgetRings = ({ rows, spentCents, hidden }: BudgetRingsProps) => {
  const { stroke, radii, maxTextWidth } = ringLayout(rows.length)
  const amountLabel = hidden ? '••••' : centsToDisplay(spentCents)
  const fontSize = amountSize(amountLabel, maxTextWidth)
  const squeeze = fontSize < 22
  const summary = rows.map((row) => `${row.name} ${Math.round(row.percentage)} percent`).join(', ')

  return (
    <div className="flex w-full flex-col items-center">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full max-w-[15rem]" role="img" aria-label={`Budget spent ${amountLabel}. ${summary}`}>
        {rows.slice(0, radii.length).map((row, index) => {
          const radius = radii[index]
          const progress = Math.max(0, Math.min(row.percentage, 100))
          const color = row.percentage >= 100 ? '#ef4444' : row.color
          const valueEnd = START + SWEEP * (progress / 100)
          return (
            <g key={row.id}>
              <path d={ringPath(CENTER, CENTER, radius, START, START + SWEEP)} fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth={stroke} strokeLinecap="round" />
              {progress > 0 && (
                <path d={ringPath(CENTER, CENTER, radius, START, valueEnd)} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
              )}
            </g>
          )
        })}
        <text x={CENTER} y={CENTER - 8} textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="700" letterSpacing="1.4">SPENT</text>
        <text x={CENTER} y={CENTER + fontSize * 0.78} textAnchor="middle" fill="var(--text-main)" fontSize={fontSize} fontWeight="800" textLength={squeeze ? maxTextWidth : undefined} lengthAdjust={squeeze ? 'spacingAndGlyphs' : undefined}>
          {amountLabel}
        </text>
      </svg>
    </div>
  )
}
