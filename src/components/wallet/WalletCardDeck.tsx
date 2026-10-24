import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { Icon } from '@/components/ui'
import { formatCurrency } from '@/lib/money'
import type { WalletAccount } from '@/types'

type WalletCardDeckProps = {
  accounts: WalletAccount[]
  hidden: boolean
  currencySymbol: string
  currencyPosition: 'prefix' | 'suffix'
  onSelect: (account: WalletAccount) => void
}

const peeks = [
  { x: 4.2, y: -3.6, rotate: 3.1, z: 12 },
  { x: -3.6, y: 3.2, rotate: -2.5, z: 11 },
  { x: 2.6, y: 4.2, rotate: 2, z: 10 },
  { x: -2.6, y: -2.6, rotate: -1.7, z: 9 },
]

const faces = {
  ecash: { bg: '#285ccc', ink: '#ffffff', soft: 'rgba(255,255,255,0.16)', chip: '#d5deec', mark: 'E-CASH' },
  debit: { bg: '#10233f', ink: '#ffffff', soft: 'rgba(255,255,255,0.12)', chip: '#e7d7a8', mark: 'DEBIT' },
}

const cashFace = {
  bg: '#fff2bd',
  ink: '#1c1917',
  muted: 'rgba(28,25,23,0.55)',
  bubble: 'rgba(255,255,255,0.72)',
}

export const WalletCardDeck = ({ accounts, hidden, currencySymbol, currencyPosition, onSelect }: WalletCardDeckProps) => {
  const [index, setIndex] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [motion, setMotion] = useState<{ from: number; direction: 1 | -1 } | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const locked = useRef(false)
  const swiped = useRef(false)
  const timers = useRef<number[]>([])
  const count = accounts.length
  const activeIndex = count === 0 ? 0 : ((index % count) + count) % count
  const active = accounts[activeIndex]

  useEffect(() => () => {
    timers.current.forEach((id) => window.clearTimeout(id))
  }, [])

  const step = (direction: 1 | -1) => {
    if (count < 2 || motion) return
    setDragX(0)
    setMotion({ from: activeIndex, direction })
    const id = window.setTimeout(() => {
      setIndex((current) => (current + direction + count) % count)
      setMotion(null)
    }, 340)
    timers.current.push(id)
  }

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    origin.current = { x: event.clientX, y: event.clientY }
    locked.current = false
    swiped.current = false
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!origin.current || count < 2) return
    const dx = event.clientX - origin.current.x
    const dy = event.clientY - origin.current.y
    if (!locked.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      if (Math.abs(dy) > Math.abs(dx)) {
        origin.current = null
        return
      }
      locked.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    setDragX(Math.max(-84, Math.min(84, dx)))
  }

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!origin.current) return
    const dx = event.clientX - origin.current.x
    const dy = event.clientY - origin.current.y
    origin.current = null
    setDragX(0)
    if (!locked.current || Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy)) return
    swiped.current = true
    step(dx > 0 ? 1 : -1)
  }

  const handleClick = () => {
    if (swiped.current) {
      swiped.current = false
      return
    }
    if (!active || active.type === 'cash') return
    onSelect(active)
  }

  if (!active) {
    return <p className="rounded-2xl border-2 border-dashed border-[var(--card-border)] p-6 text-center text-sm text-[var(--text-muted)]">Add a cash, e-cash, or debit account to see it here.</p>
  }

  const money = hidden ? '••••' : formatCurrency(active.balance, currencySymbol, currencyPosition)

  return (
    <div>
      <div className="relative w-full" aria-roledescription="carousel" aria-label="Wallet cards">
        <div className="relative mx-auto w-full" style={{ aspectRatio: '1.55 / 1' }}>
          {accounts.map((account, cardIndex) => {
            const aside = motion != null && cardIndex === motion.from
            const incomingIndex = motion ? (motion.from + motion.direction + count) % count : activeIndex
            const front = !motion && cardIndex === activeIndex
            const bright = aside || cardIndex === incomingIndex
            const peek = peeks[cardIndex % peeks.length]
            const shiftX = aside && motion ? motion.direction * 68 : bright ? (front ? 0 : 0) : peek.x
            const shiftY = aside ? -4 : bright ? 0 : peek.y
            const rotate = aside && motion ? motion.direction * 6 : bright ? (front ? dragX / 28 : 0) : peek.rotate
            const drag = front ? dragX : 0
            return (
              <button
                key={account.id ?? account.name}
                type="button"
                tabIndex={front ? 0 : -1}
                aria-hidden={front ? undefined : true}
                aria-label={front ? `${account.name}, ${money} available. Card ${activeIndex + 1} of ${count}` : undefined}
                onClick={front ? handleClick : undefined}
                onPointerDown={front ? handlePointerDown : undefined}
                onPointerMove={front ? handlePointerMove : undefined}
                onPointerUp={front ? handlePointerUp : undefined}
                onPointerCancel={front ? () => { origin.current = null; locked.current = false; setDragX(0) } : undefined}
                className={`absolute left-[4%] top-[6%] flex h-[88%] w-[92%] flex-col overflow-hidden rounded-[22px] p-5 text-left ${front ? 'shadow-[0_16px_40px_rgba(17,24,39,0.18)]' : 'shadow-md'}`}
                style={{
                  background: account.type === 'cash' ? cashFace.bg : faces[account.type === 'ecash' ? 'ecash' : 'debit'].bg,
                  color: account.type === 'cash' ? cashFace.ink : '#ffffff',
                  zIndex: aside ? 30 : bright ? 20 : peek.z,
                  transform: `translate3d(${aside ? shiftX : shiftX}%, ${shiftY}%, 0) translateX(${drag}px) rotate(${rotate}deg) scale(${bright ? 1 : 0.97})`,
                  transition: front && dragX !== 0 ? 'none' : aside ? 'transform 300ms cubic-bezier(0.22, 0.7, 0.3, 1)' : 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
                  touchAction: 'pan-y',
                }}
              >
                <CardFace account={account} hidden={hidden} currencySymbol={currencySymbol} currencyPosition={currencyPosition} />
                <span className="pointer-events-none absolute inset-0 bg-black/45 transition-opacity duration-300" style={{ opacity: bright ? 0 : 1 }} />
              </button>
            )
          })}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{active.name}, card {activeIndex + 1} of {count}</p>
      <div className="mt-4 flex items-center justify-between">
        <button type="button" aria-label="Previous wallet" disabled={count < 2 || motion != null} onClick={() => step(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-main)] disabled:opacity-40">
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1.5" aria-hidden>
          {accounts.map((account, dot) => (
            <span key={account.id ?? account.name} className={`h-1.5 rounded-full ${dot === activeIndex ? 'w-4 bg-midblue' : 'w-1.5 bg-black/15 dark:bg-white/25'}`} />
          ))}
        </div>
        <button type="button" aria-label="Next wallet" disabled={count < 2 || motion != null} onClick={() => step(1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-main)] disabled:opacity-40">
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

const CardFace = ({
  account,
  hidden,
  currencySymbol,
  currencyPosition,
}: {
  account: WalletAccount
  hidden: boolean
  currencySymbol: string
  currencyPosition: 'prefix' | 'suffix'
}) => {
  const amount = hidden ? '••••' : formatCurrency(account.balance, currencySymbol, currencyPosition)
  if (account.type === 'cash') {
    return (
      <div className="relative flex h-full flex-col" style={{ color: cashFace.ink }}>
        <div className="pointer-events-none absolute -right-8 top-6 h-32 w-32 rounded-full" style={{ background: 'rgba(255,255,255,0.55)' }} />
        <div className="pointer-events-none absolute -bottom-8 right-6 h-28 w-28 rounded-full" style={{ background: 'rgba(255,255,255,0.55)' }} />
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: cashFace.bubble, color: cashFace.ink }}>
            <Icon name="WalletIcon" className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-black leading-tight">{account.name}</div>
            <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: cashFace.muted }}>Cash</div>
          </div>
        </div>
        <div className="relative z-10 mt-auto flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: cashFace.muted }}>Available balance</div>
            <div className="mt-1 truncate text-[clamp(1.35rem,5vw,1.85rem)] font-black leading-none tracking-tight">{amount}</div>
          </div>
          <div className="shrink-0 text-sm font-black tracking-[0.18em]">CASH</div>
        </div>
      </div>
    )
  }

  const face = faces[account.type === 'ecash' ? 'ecash' : 'debit']
  return (
    <div className="relative flex h-full flex-col text-white">
      <div className="pointer-events-none absolute -right-8 top-6 h-32 w-32 rounded-full" style={{ background: face.soft }} />
      <div className="pointer-events-none absolute -bottom-8 right-6 h-28 w-28 rounded-full" style={{ background: face.soft }} />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: face.soft }}>
            <Icon name={account.type === 'debit' ? 'BuildingLibraryIcon' : 'DevicePhoneMobileIcon'} className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{account.name}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">{account.type === 'ecash' ? 'E-cash' : 'Debit'}</div>
          </div>
        </div>
        <Contactless />
      </div>
      <Chip color={face.chip} />
      <div className="relative z-10 mt-auto flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">Available</div>
          <div className="mt-1 truncate text-[clamp(1.25rem,5vw,1.7rem)] font-black leading-none tracking-tight">{amount}</div>
        </div>
        <div className="shrink-0 text-sm font-black tracking-[0.18em]">{face.mark}</div>
      </div>
    </div>
  )
}

const Chip = ({ color }: { color: string }) => (
  <svg viewBox="0 0 46 34" className="relative z-10 mt-4 h-8 w-11" aria-hidden>
    <rect x="1" y="1" width="44" height="32" rx="5" fill={color} stroke="rgba(0,0,0,0.28)" />
    <path d="M1 12h44M1 22h44M16 1v32M31 1v32" stroke="rgba(0,0,0,0.28)" fill="none" />
  </svg>
)

const Contactless = () => (
  <svg viewBox="0 0 24 24" className="relative z-10 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
    <path d="M8.5 8.5c1.8 1.7 1.8 5.3 0 7" />
    <path d="M12 5.5c3.4 3.2 3.4 9.8 0 13" />
    <path d="M15.5 3c5 4.6 5 13.4 0 18" />
  </svg>
)
