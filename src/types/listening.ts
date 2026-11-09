import type { MediaType } from '@/types'

export type ListeningPeriod = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom'
export type TrendMetric = 'seconds' | 'listeners' | 'sessions' | 'personal_seconds'
export interface ListeningPerson {
  name: string
  avatar: string | null
}
export interface ListeningWork {
  id: number | null
  name: string
  type: MediaType
  cover_url: string | null
  year: string | null
  unavailable: boolean
}
export interface ListeningDay {
  date: string
  seconds: number
  personal_seconds: number
  listeners: number
  sessions: number
}
export interface ListeningStats {
  updated_at: string
  timezone: string
  range: { from: string; to: string; monthly: boolean }
  summary: {
    seconds: number
    personal_seconds: number
    listeners: number
    sessions: number
    works: number
    recent_listeners: number
  }
  trend: ListeningDay[]
  breakdown: { book: number; podcast: number }
  listeners: (ListeningPerson & { key: string; seconds: number; sessions: number })[]
  popular: (ListeningWork & { key: string; seconds: number; listeners: number; sessions: number })[]
  uploaders: (ListeningPerson & { key: string; seconds: number; works: number })[]
  recent: {
    key: string
    listener: ListeningPerson
    work: ListeningWork
    progress: number
    updated_at: string
  }[]
}
