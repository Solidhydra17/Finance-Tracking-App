import { useRef, useState } from 'react'
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
  { x: 11.2, y: -9.8, rotate: 3.1, z: 12 },
  { x: -9.8, y: 8.4, rotate: -2.5, z: 11 },
  { x: 7, y: 11.2, rotate: 2, z: 10 },
  { x: -7, y: -7, rotate: -1.7, z: 9 },
]

const faceStyle = (type: WalletAccount['type']) => {
  if (type === 'cash') return { background: '#fff2bd', color: '#1c1917' }
  if (type === 'ecash') return { background: '#285ccc', color: '#ffffff' }
  return { background: '#10233f', color: '#ffffff' }
}

export const WalletCardDeck = ({ accounts, hidden, currencySymbol, currencyPosition, onSelect }: WalletCardDeckProps) => {
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const [leaving, setLeaving] = useState<number | null>(null)
  const [direction, setDirection] = useState(1)
  const startX = useRef(0)

  if (accounts.length === 0) {
    return <p className="rounded-2xl border-2 border-dashed border-[var(--card-border)] p-6 text-center text-sm text-[var(--text-muted)]">Add a cash, e-cash, or debit account to see it here.</p>
  }

  const front = index % accounts.length
  const step = (nextDirection: number) => {
    setDirection(nextDirection)
    setLeaving(front)
    window.setTimeout(() => {
      setIndex((current) => (current + nextDirection + accounts.length) % accounts.length)
      setLeaving(null)
      setDrag(0)
    }, 340)
  }

  return (
    <div className="relative mx-auto h-64 w-full max-w-sm overflow-hidden">
      {accounts.map((account, cardIndex) => {
        const offset = (cardIndex - front + accounts.length) % accounts.length
        const isFront = offset === 0
        const isLeaving = leaving === cardIndex
        const peek = peeks[(offset - 1) % peeks.length] ?? peeks[0]
        const style = faceStyle(account.type)
        const transform = isLeaving
          ? `translate3d(calc(-50% + ${direction * 68}%), calc(-50% - 12px), 0) rotate(${direction * 6}deg)`
          : isFront
            ? `translate3d(calc(-50% + ${drag}px), -50%, 0)`
            : `translate3d(calc(-50% + ${peek.x}%), calc(-50% + ${peek.y}%), 0) rotate(${peek.rotate}deg) scale(0.97)`
        return (
          <button
            key={account.id}
            type="button"
            aria-label={`${account.name} card`}
            onClick={() => { if (isFront && account.type !== 'cash') onSelect(account) }}
            onPointerDown={(event) => { if (!isFront) return; startX.current = event.clientX; event.currentTarget.setPointerCapture(event.pointerId) }}
            onPointerMove={(event) => { if (!isFront || leaving !== null) return; setDrag(Math.max(-84, Math.min(84, event.clientX - startX.current))) }}
            onPointerUp={() => { if (!isFront) return; if (drag > 40) step(1); else if (drag < -40) step(-1); else setDrag(0) }}
            className="absolute left-1/2 top-1/2 aspect-[1.7/1] w-[90%] rounded-[22px] p-5 text-left shadow-lg transition-transform duration-300"
            style={{ ...style, transform, zIndex: isLeaving ? 60 : isFront ? 40 : peek.z, transitionDuration: isLeaving ? '300ms' : '420ms' }}
          >
            {!isFront && <span className="absolute inset-0 rounded-[22px] bg-black/45" />}
            {account.type === 'cash' && (
              <>
                <span className="absolute -right-8 top-6 h-32 w-32 rounded-full bg-white/55" />
                <span className="absolute -bottom-8 right-6 h-28 w-28 rounded-full bg-white/55" />
              </>
            )}
            <span className="relative block text-xs font-bold uppercase tracking-widest opacity-70">{account.type === 'ecash' ? 'E-cash' : account.type}</span>
            <span className="relative mt-2 block text-lg font-black">{account.name}</span>
            <span className="relative mt-6 block text-2xl font-black">{hidden ? '••••' : formatCurrency(account.balance, currencySymbol, currencyPosition)}</span>
            <span className="absolute bottom-5 right-5 text-sm font-black tracking-[0.18em]">{account.type === 'cash' ? 'CASH' : account.type === 'ecash' ? 'E-CASH' : 'DEBIT'}</span>
          </button>
        )
      })}
    </div>
  )
}
