import { Preferences } from '@capacitor/preferences'
import { PRIMARY_DB_NAME } from '@/storage/indexeddb/database'
import { getActiveWallet } from '@/storage/indexeddb/wallets'
import type { DailyInsightRecord, InsightQuotaStatus } from './types'

const DAILY_KEY = 'insight_daily'

const dailyKey = (): string => {
  const id = getActiveWallet()?.id
  return id ? `${DAILY_KEY}_${id}` : DAILY_KEY
}
const QUOTA_KEY = 'insight_quota_blocked'

export const getLocalDayKey = (): string => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const parseDailyInsight = (value: string | null): DailyInsightRecord | null => {
  if (!value) return null
  const parsed = JSON.parse(value) as DailyInsightRecord
  if (parsed.day !== getLocalDayKey()) return null
  if (!parsed.insight?.text || !parsed.txRevision) return null
  return parsed
}

export const readDailyInsight = async (): Promise<DailyInsightRecord | null> => {
  try {
    const current = parseDailyInsight((await Preferences.get({ key: dailyKey() })).value)
    if (current) return current
    const active = getActiveWallet()
    if (active?.dbName !== PRIMARY_DB_NAME) return null
    return parseDailyInsight((await Preferences.get({ key: DAILY_KEY })).value)
  } catch {
    return null
  }
}

export const writeDailyInsight = async (record: DailyInsightRecord): Promise<void> => {
  try {
    await Preferences.set({ key: dailyKey(), value: JSON.stringify(record) })
  } catch {
    // ignore storage failures
  }
}

export const readQuotaStatus = async (): Promise<InsightQuotaStatus | null> => {
  try {
    const { value } = await Preferences.get({ key: QUOTA_KEY })
    if (!value) return null
    const parsed = JSON.parse(value) as InsightQuotaStatus
    if (!parsed.blockedUntil) return null
    if (new Date(parsed.blockedUntil).getTime() <= Date.now()) {
      await Preferences.remove({ key: QUOTA_KEY })
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export const writeQuotaStatus = async (status: InsightQuotaStatus): Promise<void> => {
  try {
    await Preferences.set({ key: QUOTA_KEY, value: JSON.stringify(status) })
  } catch {
    // ignore
  }
}

export const clearQuotaStatus = async (): Promise<void> => {
  try {
    await Preferences.remove({ key: QUOTA_KEY })
  } catch {
    // ignore
  }
}

export const isOnline = (): boolean => {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

export const formatAvailableAt = (iso: string): string => {
  try {
    const date = new Date(iso)
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/** Next local midnight — free-tier daily caps usually reset on a daily boundary. */
export const nextLocalMidnightIso = (): string => {
  const d = new Date()
  d.setHours(24, 0, 0, 0)
  return d.toISOString()
}
