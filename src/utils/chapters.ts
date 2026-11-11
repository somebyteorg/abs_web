import type { ChapterOption } from '@/types'

export function compareEpisodeOrder(a: ChapterOption, b: ChapterOption) {
  return a.season_number - b.season_number || a.episode_number - b.episode_number || a.id - b.id
}
