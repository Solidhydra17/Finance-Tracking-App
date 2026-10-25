import { useEffect, useRef, useState } from 'react';
import { centsToDisplay } from '@/lib/money';
import type { DateRangePreset } from '@/types/filter';

export type SpendingBubbleItem = {
  id: string;
  name: string;
  color: string;
  total: number;
  percentage: number;
};

type Body = {
  id: string;
  homeX: number;
  homeY: number;
  size: number;
  phase: number;
  dragging: boolean;
};

const sizeFor = (percentage: number) => {
  const share = Math.max(0, Math.min(percentage, 100)) / 100;
  return 42 + Math.pow(share, 0.8) * 200;
};

const fitLabel = (node: HTMLButtonElement, size: number) => {
  const label = node.querySelector('[data-bubble-label]');
  if (!(label instanceof HTMLElement)) return;
  const name = label.querySelector('[data-bubble-name]');
  const percent = label.querySelector('[data-bubble-percent]');
  const nameSize = Math.min(17, size * 0.13);
  if (name instanceof HTMLElement) name.style.fontSize = `${nameSize}px`;
  if (percent instanceof HTMLElement) percent.style.fontSize = `${Math.max(8, nameSize - 1)}px`;
  label.style.transform = 'none';
  const half = size / 2;
  const inset = Math.min(half - 2, label.offsetHeight / 2 + 1);
  const room = Math.max(18, 2 * Math.sqrt(Math.max(0, half * half - inset * inset)) - 4);
  const scale = Math.min(1, room / Math.max(label.scrollWidth, 1));
  label.style.transform = `scale(${scale})`;
};

const placeBodies = (items: SpendingBubbleItem[], width: number, height: number): Body[] => {
  const centerX = width / 2;
  const centerY = height * 0.46;
  const centerRadius = items[0] ? sizeFor(items[0].percentage) / 2 : 0;
  const orbit = Math.max(items.length - 1, 1);
  const pad = 8;
  return items.map((item, index) => {
    const size = sizeFor(item.percentage);
    const radius = size / 2;
    const angle = -Math.PI * 0.82 + ((index - 1) * Math.PI * 2) / orbit;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let homeX = centerX;
    let homeY = centerY;
    if (index !== 0) {
      const wanted = centerRadius + radius + 2;
      const roomX = Math.abs(cos) < 0.05 ? wanted : ((cos > 0 ? width - pad - radius : radius + pad) - centerX) / cos;
      const yEdge = sin > 0 ? height - pad - radius : radius + pad;
      const roomY = Math.abs(sin) < 0.05 ? wanted : (yEdge - centerY) / (sin * 0.9);
      const distance = Math.max(radius * 0.4, Math.min(wanted, roomX, roomY));
      homeX = centerX + cos * distance;
      homeY = centerY + sin * distance * 0.9;
    }
    return {
      id: item.id,
      homeX: Math.min(width - radius, Math.max(radius, homeX)),
      homeY: Math.min(height - radius, Math.max(radius, homeY)),
      size,
      phase: index * 1.2,
      dragging: false,
    };
  });
};

const drift = (body: Body, seconds: number) => ({
  x: body.homeX + Math.sin(seconds * 0.7 + body.phase) * 6,
  y: body.homeY + Math.cos(seconds * 0.55 + body.phase) * 5,
});

const periodLabelFor = (period: DateRangePreset) => {
  if (period === 'week') return 'Weekly';
  if (period === 'year') return 'Yearly';
  if (period === 'month') return 'Monthly';
  return 'Period';
};

type SpendingBubblesProps = {
  items: SpendingBubbleItem[];
  hidden: boolean;
  period: DateRangePreset;
};

export const SpendingBubbles = ({ items, hidden, period }: SpendingBubblesProps) => {
  const [mode, setMode] = useState<'bubbles' | 'list'>('bubbles');
  const stageRef = useRef<HTMLDivElement>(null);
  const nodes = useRef<Record<string, HTMLButtonElement | null>>({});
  const bodies = useRef<Body[]>([]);
  const dragId = useRef<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const signature = items.map((item) => `${item.id}:${Math.round(item.percentage)}`).join('|');
  const listed = items.slice(0, 5);
  const total = items.reduce((sum, item) => sum + item.total, 0);
  const periodLabel = periodLabelFor(period);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || mode !== 'bubbles') return;
    const bounds = stage.getBoundingClientRect();
    if (bounds.width < 40 || bounds.height < 40) return;
    bodies.current = placeBodies(itemsRef.current, bounds.width, bounds.height);

    let frame = 0;
    const tick = (now: number) => {
      const seconds = now / 1000;
      const box = stage.getBoundingClientRect();
      bodies.current.forEach((body) => {
        const node = nodes.current[body.id];
        if (!node) return;
        const point = body.dragging ? { x: body.homeX, y: body.homeY } : drift(body, seconds);
        const radius = body.size / 2;
        const x = Math.min(box.width - radius, Math.max(radius, point.x));
        const y = Math.min(box.height - radius, Math.max(radius, point.y));
        node.style.width = `${body.size}px`;
        node.style.height = `${body.size}px`;
        node.style.transform = `translate(${x - radius}px, ${y - radius}px)`;
        node.style.opacity = '1';
        fitLabel(node, body.size);
      });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [signature, mode]);

  const moveDragged = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    const id = dragId.current;
    if (!stage || !id) return;
    const bounds = stage.getBoundingClientRect();
    const body = bodies.current.find((entry) => entry.id === id);
    if (!body) return;
    const radius = body.size / 2;
    body.homeX = Math.min(bounds.width - radius, Math.max(radius, clientX - bounds.left));
    body.homeY = Math.min(bounds.height - radius, Math.max(radius, clientY - bounds.top));
  };

  const nudge = (id: string, dx: number, dy: number) => {
    const stage = stageRef.current;
    const body = bodies.current.find((entry) => entry.id === id);
    if (!stage || !body) return;
    const bounds = stage.getBoundingClientRect();
    const radius = body.size / 2;
    body.homeX = Math.min(bounds.width - radius, Math.max(radius, body.homeX + dx));
    body.homeY = Math.min(bounds.height - radius, Math.max(radius, body.homeY + dy));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[var(--item-bg)] p-1" role="group" aria-label="Spending view">
        <button
          type="button"
          aria-pressed={mode === 'bubbles'}
          onClick={() => setMode('bubbles')}
          className={`min-h-11 rounded-xl text-xs font-bold transition-colors ${mode === 'bubbles' ? 'bg-midblue text-white' : 'text-[var(--text-muted)]'}`}
        >
          Bubbles
        </button>
        <button
          type="button"
          aria-pressed={mode === 'list'}
          onClick={() => setMode('list')}
          className={`min-h-11 rounded-xl text-xs font-bold transition-colors ${mode === 'list' ? 'bg-midblue text-white' : 'text-[var(--text-muted)]'}`}
        >
          List
        </button>
      </div>

      {items.length === 0 && <p className="text-sm text-[var(--text-muted)]">No spending in this period.</p>}

      {mode === 'bubbles' && items.length > 0 && (
        <div className="isolate overflow-hidden rounded-[28px] bg-[#e4e4ea] px-3 pb-4 pt-2 dark:bg-[#2a2a32]">
          <div ref={stageRef} className="relative h-80" aria-label="Spending bubbles. Drag a bubble to move it.">
            <svg className="pointer-events-none absolute inset-0 h-full w-full text-black/15 dark:text-white/25" viewBox="0 0 320 280" preserveAspectRatio="none" aria-hidden>
              <path d="M18 196C86 156 230 156 304 198" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {items.map((item) => {
              const size = sizeFor(item.percentage);
              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    nodes.current[item.id] = node;
                  }}
                  type="button"
                  aria-label={`${item.name}, ${item.percentage.toFixed(0)} percent of spending. Drag to move.`}
                  onPointerDown={(event) => {
                    dragId.current = item.id;
                    const body = bodies.current.find((entry) => entry.id === item.id);
                    if (body) body.dragging = true;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    moveDragged(event.clientX, event.clientY);
                  }}
                  onPointerMove={(event) => {
                    if (dragId.current !== item.id) return;
                    moveDragged(event.clientX, event.clientY);
                  }}
                  onPointerUp={() => {
                    const body = bodies.current.find((entry) => entry.id === item.id);
                    if (body) body.dragging = false;
                    dragId.current = null;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowLeft') nudge(item.id, -16, 0);
                    if (event.key === 'ArrowRight') nudge(item.id, 16, 0);
                    if (event.key === 'ArrowUp') nudge(item.id, 0, -16);
                    if (event.key === 'ArrowDown') nudge(item.id, 0, 16);
                    if (event.key.startsWith('Arrow')) event.preventDefault();
                  }}
                  className="absolute left-0 top-0 flex cursor-grab touch-none select-none flex-col items-center justify-center rounded-full text-center leading-none opacity-0 shadow-[0_10px_24px_rgba(0,0,0,0.28)] active:cursor-grabbing"
                  style={{ width: size, height: size, background: item.color, color: '#ffffff', zIndex: Math.round(item.percentage) }}
                >
                  <div data-bubble-label className="flex flex-col items-center whitespace-nowrap" style={{ color: '#ffffff' }}>
                    <div data-bubble-name className="font-bold leading-none" style={{ color: '#ffffff' }}>{item.name}</div>
                    <div data-bubble-percent className="mt-0.5 font-black leading-none" style={{ color: '#ffffff' }}>{item.percentage.toFixed(0)}%</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-2 text-[11px] font-medium text-[#1c1917]/70 dark:text-white/70">{periodLabel} total</div>
          <div className="px-2 text-2xl font-black tracking-tight text-[#1c1917] dark:text-white">{hidden ? '₱••••' : centsToDisplay(total)}</div>
        </div>
      )}

      {mode === 'list' && items.length > 0 && (
        <div className="space-y-4">
          {listed.map((category) => (
            <div key={category.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0 truncate font-bold text-[var(--text-main)]">{category.name}</div>
                <div className="shrink-0 font-black text-[var(--text-main)]">{hidden ? '₱••••' : centsToDisplay(category.total)}</div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--item-bg)]">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, category.percentage)}%`, background: category.color }} />
              </div>
              <div className="text-right text-[10px] font-bold text-[var(--text-muted)]">{category.percentage.toFixed(0)}%</div>
            </div>
          ))}
          {items.length > 5 && <p className="text-center text-[11px] font-bold text-[var(--text-muted)]">Top 5 of {items.length}</p>}
        </div>
      )}
    </div>
  );
};
