import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, type KeyboardEvent, type MouseEvent } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon } from '@hugeicons/core-free-icons';

import './SwipeRow.css';

const HYST = 10;
const FLICK = 110;
const DECEL = 0.998;
const VMAX = 1500;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const SPRING_UI = { type: 'spring' as const, duration: 0.3, bounce: 0 };
const FILL_SPRING = { type: 'spring' as const, duration: 0.55, bounce: 0 };
const SNAP_MOVE = { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const };
const DEFAULT_ACTIONS: SwipeAction[] = [{ id: 'delete', label: 'Delete' }];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const rubber = (o: number, dim: number, c: number) => (o * dim * c) / (dim + c * Math.abs(o));
const unrubber = (y: number, dim: number, c: number) => (y * dim) / (c * Math.max(1, dim - Math.abs(y)));
const project = (v: number) => ((v / 1000) * DECEL) / (1 - DECEL);
const velocityOf = (hist: Array<[number, number]>) => {
  if (hist.length < 2) return 0;
  const a = hist[0];
  const b = hist[hist.length - 1];
  return ((b[1] - a[1]) / Math.max(1, b[0] - a[0])) * 1000;
};
const onColor = (hex: string) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const h = m[1].length === 3 ? [...m[1]].map((ch) => ch + ch).join('') : m[1];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? '#111111' : '#ffffff';
};

type Grip = {
  id: number;
  x0: number;
  y0: number;
  grab: number | null;
  moved: boolean;
  hist: Array<[number, number]>;
  touch: boolean;
};

type Live = {
  move: (event: PointerEvent) => void;
  up: (event: PointerEvent) => void;
};

const watchWindow = (live: { current: Live }) => {
  const onMove = (event: PointerEvent) => {
    if (event.isTrusted) live.current.move(event);
  };
  const onUp = (event: PointerEvent) => {
    if (event.isTrusted) live.current.up(event);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  return () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  };
};

export type SwipeAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  color?: string;
  dismiss?: boolean;
  onSelect?: () => void;
};

type SwipeRowProps = {
  children?: ReactNode;
  actions?: SwipeAction[];
  actionColor?: string;
  drawerColor?: string;
  rowColor?: string;
  textColor?: string;
  height?: number;
  radius?: number;
  actionWidth?: number;
  direction?: 'left' | 'right';
  snapBounce?: number;
  resistance?: number;
  collapseMs?: number;
  commitAt?: number;
  fullSwipe?: boolean;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAction?: (action: SwipeAction) => void;
  onCommit?: (action: SwipeAction) => void;
  onHold?: () => void;
  holdMs?: number;
  closeOnAction?: boolean;
  haptic?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
};

export const SwipeRow = ({
  children,
  actions = DEFAULT_ACTIONS,
  actionColor = '#e5484d',
  drawerColor = '#3f3f46',
  rowColor = '#27272a',
  textColor = '#f5f5f5',
  height = 64,
  radius = 16,
  actionWidth = 80,
  direction = 'left',
  snapBounce = 0.2,
  resistance = 0.55,
  collapseMs = 200,
  commitAt = 0.6,
  fullSwipe = true,
  disabled = false,
  open: openProp,
  onOpenChange,
  onAction,
  onCommit,
  onHold,
  holdMs = 1400,
  closeOnAction = true,
  haptic = true,
  label = 'List item',
  className = '',
  style,
}: SwipeRowProps) => {
  const uid = useId();
  const reduce = useReducedMotion();
  const s = direction === 'left' ? -1 : 1;
  const A = actionWidth;
  const n = actions.length;
  const D = n * A;
  const c = clamp(resistance, 0.05, 1);
  const primary = actions[0];
  const [openState, setOpenState] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'committing' | 'collapsing'>('idle');
  const [say, setSay] = useState('');
  const open = openProp ?? openState;

  const root = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const w = useRef(360);
  const grip = useRef<Grip | null>(null);
  const unwatch = useRef<(() => void) | null>(null);
  const live = useRef<Live>({ move: () => undefined, up: () => undefined });
  const foldTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const suppressClick = useRef(false);
  const [holding, setHolding] = useState(false);
  const heading = useRef<number | null>(null);
  const centeredOn = useRef(false);

  const x = useMotionValue(0);
  const spread = useMotionValue(0);
  const centered = useMotionValue(0);
  const commitPoint = () => Math.max(commitAt * w.current, D + A / 2);
  const canCommit = () => fullSwipe && n > 0 && commitPoint() <= w.current;
  const exposed = useTransform(x, (v) => s * v);
  const surfaceXf = useTransform(x, (v) => `translateX(${v}px)`);
  const railXf = useTransform(exposed, (e) => `translateX(${-s * Math.max(0, D - e)}px)`);
  const shift = useTransform(exposed, (e) => Math.max(0, e - D));
  const blockXf = useTransform(shift, (v) => `translateX(${s * v}px)`);
  const glyphXf = useTransform([exposed, centered], ([raw, blend]: number[]) => {
    const width = Math.max(1, w.current);
    const reveal = Math.max(0, raw);
    const travel = Math.max(0, reveal - D);
    const natural = width - A / 2;
    const inset = Math.min(A / 2, Math.max(24, reveal / 2));
    const parked = width - inset;
    const minCenter = Math.min(parked, width - reveal + 24);
    const redCenter = width - reveal / 2;
    const destination = clamp(redCenter, minCenter, parked);
    const target = parked + blend * (destination - parked);
    const rail = Math.max(0, D - reveal);
    return `translateX(${-s * (travel - rail + target - natural)}px)`;
  });

  const map = (raw: number) => {
    const W = w.current;
    if (raw < 0) return rubber(raw, W, c);
    if (raw <= D) return raw;
    if (!canCommit()) return D + rubber(raw - D, W, c);
    const C = commitPoint();
    const knee = D + (C - D) / c;
    return raw <= knee ? D + c * (raw - D) : C + rubber(raw - knee, W, c);
  };
  const inv = (ex: number) => {
    const W = w.current;
    if (ex < 0) return unrubber(ex, W, c);
    if (ex <= D) return ex;
    if (!canCommit()) return D + unrubber(ex - D, W, c);
    const C = commitPoint();
    const knee = D + (C - D) / c;
    return ex <= C ? D + (ex - D) / c : knee + unrubber(ex - C, W, c);
  };

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    w.current = el.offsetWidth || w.current;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) w.current = width;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(
    () => () => {
      clearTimeout(foldTimer.current);
      clearTimeout(holdTimer.current);
      unwatch.current?.();
    },
    []
  );

  const setOpen = (next: boolean) => {
    if (next === open) return;
    setOpenState(next);
    onOpenChange?.(next);
  };
  const settle = (target: number, v = 0) => {
    heading.current = target;
    if (reduce) {
      animate(x, s * target, { duration: 0.2, ease: EASE_OUT });
      return;
    }
    const flick = Math.abs(v) >= FLICK;
    animate(
      x,
      s * target,
      flick
        ? { type: 'spring', duration: 0.4, bounce: snapBounce, velocity: s * clamp(v, -VMAX, VMAX) }
        : { ...SPRING_UI, velocity: s * v }
    );
  };
  const snapCenter = (on: boolean) => {
    if (centeredOn.current === on) return;
    centeredOn.current = on;
    if (reduce) centered.set(on ? 1 : 0);
    else animate(centered, on ? 1 : 0, SNAP_MOVE);
  };
  const setSpread = (on: boolean) => {
    if ((spread.get() === 1) === on) return;
    if (reduce) spread.set(on ? 1 : 0);
    else animate(spread, on ? 1 : 0, SPRING_UI);
    if (on && primary) {
      setSay(`Release to ${primary.label}`);
      if (haptic && grip.current?.touch) navigator.vibrate?.(8);
    }
  };
  const commit = (a: SwipeAction, viaKey: boolean, v = 0) => {
    const leap = a === primary;
    setPhase('committing');
    setSay(a.label);
    setOpen(false);
    const fold = () => {
      setPhase('collapsing');
      foldTimer.current = setTimeout(() => {
        onCommit?.(a);
        a.onSelect?.();
      }, collapseMs);
    };
    if (leap && (viaKey || reduce)) {
      centeredOn.current = true;
      centered.set(1);
      spread.set(1);
    } else if (leap) snapCenter(true);
    if (viaKey || reduce) {
      if (viaKey) {
        x.set(s * w.current);
        fold();
      } else animate(x, s * w.current, { duration: 0.2, ease: EASE_OUT }).then(fold);
      return;
    }
    if (leap && spread.get() < 1) animate(spread, 1, FILL_SPRING);
    animate(x, s * w.current, { ...FILL_SPRING, velocity: s * v }).then(fold);
  };
  useEffect(() => {
    if (openProp === undefined || grip.current || phase !== 'idle') return;
    const target = open ? D : 0;
    if (heading.current === target) return;
    if (Math.abs(exposed.get() - target) > 0.5) settle(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, D]);

  const stopHold = () => {
    clearTimeout(holdTimer.current);
    setHolding(false);
  };
  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || n === 0 || phase !== 'idle' || grip.current || event.button !== 0) return;
    x.stop();
    heading.current = null;
    grip.current = {
      id: event.pointerId,
      x0: event.clientX,
      y0: event.clientY,
      grab: null,
      moved: false,
      hist: [],
      touch: event.pointerType === 'touch',
    };
    try {
      surface.current?.setPointerCapture(event.pointerId);
    } catch {
      /* capture can fail if the pointer already ended */
    }
    unwatch.current?.();
    unwatch.current = watchWindow(live);
    if (!onHold || open) return;
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      const current = grip.current;
      if (!current || current.moved) return;
      suppressClick.current = true;
      setHolding(false);
      onHold();
    }, holdMs);
  };
  const move = (event: PointerEvent) => {
    const g = grip.current;
    if (!g || g.id !== event.pointerId) return;
    if (g.grab === null) {
      const dx = event.clientX - g.x0;
      const dy = event.clientY - g.y0;
      if (Math.abs(dx) > HYST || Math.abs(dy) > HYST) stopHold();
      if (Math.abs(dx) < HYST || Math.abs(dx) < Math.abs(dy)) return;
      g.grab = s * (g.x0 + Math.sign(dx) * HYST) - inv(exposed.get());
      g.moved = true;
      root.current?.setAttribute('data-dragging', '');
    }
    const ex = map(s * event.clientX - g.grab);
    x.set(s * ex);
    g.hist.push([performance.now(), ex]);
    if (g.hist.length > 4) g.hist.shift();
    const ready = canCommit() && ex >= commitPoint();
    setSpread(ready);
    snapCenter(ready);
  };
  const up = (event: PointerEvent) => {
    const g = grip.current;
    if (!g || g.id !== event.pointerId) return;
    grip.current = null;
    stopHold();
    if (suppressClick.current) {
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 400);
    }
    unwatch.current?.();
    unwatch.current = null;
    root.current?.removeAttribute('data-dragging');
    try {
      surface.current?.releasePointerCapture(event.pointerId);
    } catch {
      /* the pointer may already be released */
    }
    const ex = exposed.get();
    const v = velocityOf(g.hist);
    if (!g.moved) {
      if (open) {
        snapCenter(false);
        setOpen(false);
        settle(0);
      }
      return;
    }
    if (primary && canCommit() && ex >= commitPoint()) {
      commit(primary, false, v);
      return;
    }
    const target = Math.abs(v) >= FLICK ? (v > 0 ? D : 0) : ex + project(v) > D / 2 ? D : 0;
    snapCenter(false);
    setSpread(false);
    setOpen(target === D);
    settle(target, v);
  };
  live.current = { move, up };

  const act = (a: SwipeAction, event: MouseEvent<HTMLButtonElement>) => {
    if (phase !== 'idle') return;
    onAction?.(a);
    if (a === primary || a.dismiss) {
      commit(a, event.detail === 0);
      return;
    }
    a.onSelect?.();
    if (!closeOnAction) return;
    setOpen(false);
    if (event.detail === 0) {
      heading.current = 0;
      x.set(0);
    } else settle(0);
  };
  const openNow = () => {
    heading.current = D;
    x.set(s * D);
    setOpen(true);
    setSay(`${n} actions revealed`);
  };
  const closeNow = () => {
    heading.current = 0;
    x.set(0);
    setOpen(false);
  };
  const onToggleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || phase !== 'idle' || n === 0) return;
    const openKey = s < 0 ? 'ArrowLeft' : 'ArrowRight';
    const closeKey = s < 0 ? 'ArrowRight' : 'ArrowLeft';
    const toggle = event.key === 'Enter' || event.key === ' ';
    if (event.key === openKey || (toggle && !open)) {
      event.preventDefault();
      openNow();
    } else if (event.key === closeKey || event.key === 'Escape' || (toggle && open)) {
      event.preventDefault();
      closeNow();
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && open && primary && canCommit()) {
      event.preventDefault();
      commit(primary, true);
    }
  };
  const onToggleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0 || disabled || phase !== 'idle' || n === 0) return;
    if (open) closeNow();
    else openNow();
  };

  const railId = `${uid}-rail`;
  useEffect(() => {
    const rail = document.getElementById(railId);
    if (!rail) return;
    if (open) rail.removeAttribute('inert');
    else rail.setAttribute('inert', '');
  }, [open, railId]);

  return (
    <div
      ref={root}
      role="group"
      aria-label={label}
      className={`swipe-row${className ? ` ${className}` : ''}`}
      data-direction={direction}
      data-open={open ? '' : undefined}
      data-phase={phase}
      data-holding={holding ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      style={{
        '--sr-h': `${height}px`,
        '--sr-r': `${radius}px`,
        '--sr-a': `${A}px`,
        '--sr-row': rowColor,
        '--sr-text': textColor,
        '--sr-drawer': drawerColor,
        '--sr-on-drawer': onColor(drawerColor),
        '--sr-action': actionColor,
        '--sr-on-action': onColor(actionColor),
        '--sr-collapse': `${collapseMs}ms`,
        '--sr-hold': `${holdMs}ms`,
        ...style,
      } as CSSProperties}
    >
      <div className="swipe-row__clip">
        <motion.div id={railId} className="swipe-row__rail" style={{ transform: railXf }} aria-hidden={!open}>
          {actions.slice(1).map((a, i) => (
            <button
              key={a.id}
              type="button"
              className="swipe-row__action"
              onClick={(event) => act(a, event)}
              style={
                s < 0
                  ? { right: (i + 1) * A, background: a.color ?? drawerColor, color: onColor(a.color ?? drawerColor) }
                  : { left: (i + 1) * A, background: a.color ?? drawerColor, color: onColor(a.color ?? drawerColor) }
              }
            >
              <span className="swipe-row__glyph">
                {a.icon ? <span className="swipe-row__icon">{a.icon}</span> : null}
                <span>{a.label}</span>
              </span>
            </button>
          ))}
          {primary ? (
            <motion.div className="swipe-row__block" style={{ transform: blockXf }}>
              <motion.button
                type="button"
                className="swipe-row__action swipe-row__action--commit"
                style={{ transform: glyphXf }}
                onClick={(event) => act(primary, event)}
              >
                <span className="swipe-row__glyph">
                  <span className="swipe-row__icon">
                    {primary.icon ?? <HugeiconsIcon icon={Delete02Icon} size={20} strokeWidth={2} />}
                  </span>
                  <span>{primary.label}</span>
                </span>
              </motion.button>
            </motion.div>
          ) : null}
        </motion.div>
        <motion.div
          ref={surface}
          className="swipe-row__surface"
          style={{ transform: surfaceXf }}
          onPointerDown={down}
          onClickCapture={(event) => {
            if (!suppressClick.current) return;
            suppressClick.current = false;
            event.preventDefault();
            event.stopPropagation();
          }}
          onContextMenu={(event) => {
            if (onHold) event.preventDefault();
          }}
        >
          {onHold ? <span className="swipe-row__ripple" aria-hidden="true" /> : null}
          <div className="swipe-row__content">{children}</div>
          <button
            type="button"
            className="swipe-row__toggle"
            tabIndex={disabled ? -1 : 0}
            aria-expanded={open}
            aria-controls={railId}
            aria-keyshortcuts={s < 0 ? 'ArrowLeft' : 'ArrowRight'}
            onKeyDown={onToggleKey}
            onClick={onToggleClick}
          >
            {n} {n === 1 ? 'action' : 'actions'}
          </button>
        </motion.div>
      </div>
      <span className="swipe-row__sr" aria-live="polite">
        {say}
      </span>
    </div>
  );
};

export default SwipeRow;
