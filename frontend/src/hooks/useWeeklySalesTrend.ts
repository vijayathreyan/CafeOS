import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'

export interface WeekDaySales {
  date: string
  dayLabel: string
  kr_total: number
  c2_total: number
  combined: number
  kr_prev: number
  c2_prev: number
  combined_prev: number
  kr_bills: number
  c2_bills: number
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Fetches 7-day sales totals per branch for current and previous week.
 * weekStart should be the Monday of the current week (YYYY-MM-DD).
 * Refetches every 5 minutes.
 */
export function useWeeklySalesTrend(weekStart: string) {
  const prevWeekStart = addDays(weekStart, -7)
  const weekEnd = addDays(weekStart, 6)
  const prevWeekEnd = addDays(prevWeekStart, 6)

  return useSupabaseQuery<WeekDaySales[]>(
    ['weekly_sales_trend', weekStart],
    async () => {
      const [currentRes, prevRes] = await Promise.all([
        supabase
          .from('bills')
          .select('bill_date, branch, total_amount')
          .gte('bill_date', weekStart)
          .lte('bill_date', weekEnd),
        supabase
          .from('bills')
          .select('bill_date, branch, total_amount')
          .gte('bill_date', prevWeekStart)
          .lte('bill_date', prevWeekEnd),
      ])

      // Build day map for current week
      const currentMap: Record<
        string,
        { kr: number; c2: number; kr_bills: number; c2_bills: number }
      > = {}
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i)
        currentMap[d] = { kr: 0, c2: 0, kr_bills: 0, c2_bills: 0 }
      }
      for (const b of currentRes.data ?? []) {
        if (currentMap[b.bill_date]) {
          const amt = Number(b.total_amount ?? 0)
          if (b.branch === 'KR') {
            currentMap[b.bill_date].kr += amt
            currentMap[b.bill_date].kr_bills += 1
          } else if (b.branch === 'C2') {
            currentMap[b.bill_date].c2 += amt
            currentMap[b.bill_date].c2_bills += 1
          }
        }
      }

      // Build day map for previous week
      const prevMap: Record<string, { kr: number; c2: number }> = {}
      for (let i = 0; i < 7; i++) {
        const d = addDays(prevWeekStart, i)
        prevMap[d] = { kr: 0, c2: 0 }
      }
      for (const b of prevRes.data ?? []) {
        if (prevMap[b.bill_date]) {
          const amt = Number(b.total_amount ?? 0)
          if (b.branch === 'KR') prevMap[b.bill_date].kr += amt
          else if (b.branch === 'C2') prevMap[b.bill_date].c2 += amt
        }
      }

      // Combine into result array
      const result: WeekDaySales[] = []
      for (let i = 0; i < 7; i++) {
        const currentDate = addDays(weekStart, i)
        const prevDate = addDays(prevWeekStart, i)
        const curr = currentMap[currentDate]
        const prev = prevMap[prevDate] ?? { kr: 0, c2: 0 }
        const date = new Date(currentDate + 'T00:00:00')
        const dayIdx = (date.getDay() + 6) % 7 // 0=Mon, 6=Sun

        result.push({
          date: currentDate,
          dayLabel: DAY_LABELS[dayIdx],
          kr_total: curr.kr,
          c2_total: curr.c2,
          combined: curr.kr + curr.c2,
          kr_prev: prev.kr,
          c2_prev: prev.c2,
          combined_prev: prev.kr + prev.c2,
          kr_bills: curr.kr_bills,
          c2_bills: curr.c2_bills,
        })
      }

      return result
    },
    { retry: 2, staleTime: 60000, refetchInterval: 300000 }
  )
}
