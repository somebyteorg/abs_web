export type Role = 'admin' | 'edit' | 'user' | null
export type MediaType = 'book' | 'podcast'
export interface User {
  id: number
  username: string
  pseudonym: string | null
  display_name: string
  avatar?: string | null
  role?: Role
  size_upload: number
  adult_mode?: boolean
  notice_accepted_at?: string | null
}
export type ActivityPerson = Pick<User, 'id' | 'username' | 'pseudonym' | 'display_name'>
export interface Library {
  id: number
  name: string
  type: MediaType
  works_count?: number
}
export interface Author {
  id: number
  user_id: number
  name: string
  description: string | null
  cover_file_id?: string | null
  cover_url: string | null
  works_count?: number
  has_works?: boolean
  works?: Work[]
}
export interface Work {
  id: number
  user_id: number
  revision: number
  authors?: Author[]
  name: string
  tagline: string | null
  description: string | null
  type: MediaType
  abs_library_id: number
  library?: Library
  date_air: string | null
  is_adult: boolean
  cover_url: string | null
  cover_file_id?: string | null
  creator?: User
  media_count?: number
  chapter_count?: number
  chapter_order_matches?: boolean
  byte_size?: number
  next_episode?: number
  playable_count?: number
  publication_state?: 'pending' | 'published' | 'empty' | 'error'
  sync_status: 'pending' | 'synced' | 'error'
  sync_error: string | null
  synced_at: string | null
  updated_at: string
}
export interface AudioResource {
  id: number
  abs_item_id: number
  file_id: string
  abs_list_id: number
  name: string
  user_id: number
  file_size: number
  file_second: number
  is_reference?: boolean
  created_at: string
  uploader: User
  deleted_at?: string | null
  delete_reason?: string | null
  work?: Work
  chapter?: Chapter
}
export interface Chapter {
  id: number
  abs_list_id: number
  season_number: number
  episode_number: number
  index: number
  listening_position?: number
  title: string
  primary_media_id: number | null
  resources_count?: number
  resources: AudioResource[]
}
export type ChapterOption = Pick<Chapter, 'id' | 'title' | 'season_number' | 'episode_number'>
export interface Activity {
  id: number
  work_id: number | null
  action: string
  subject: string
  details: Record<string, unknown>
  created_at: string
  actor: User
  can_restore: boolean
  restored_at: string | null
  restored_by: ActivityPerson | null
  uploader: ActivityPerson | null
  work_available: boolean
  author_available: boolean
}
export interface Notice {
  version: string
  text: string
}
export interface ContributionConfig {
  max_file_size: number
  max_cover_size: number
  chunk_size: number
  max_chunk_size: number
  audio_extensions: string[]
  cover_extensions: string[]
  cover_compression: {
    max_size: number
    max_dimension: number
    initial_quality: number
    mime_type: string
  }
  notice: Notice
}
export interface Message {
  id: number
  work_id: number | null
  message: string
  read_at: string | null
  created_at: string
}
export interface Paginated<T> {
  page: number
  page_size: number
  total: number
  items: T[]
}
export interface WorkInput {
  name: string
  tagline: string | null
  description: string | null
  abs_library_id: number
  date_air: string | null
  is_adult: boolean
  type?: MediaType
  author_ids?: number[]
  cover_file_id?: string | null
}
export interface UploadState {
  id: string
  status: string
  chunk_size: number
  chunk_count: number
  received: number[]
  file_id: string | null
}
export interface UploadContribution {
  id: string
  file_id: string
  file_type: 'audio' | 'cover'
  abs_list_id: number
  name: string
  file_size: number
  file_second: number | null
  created_at: string
  deleted_at: string | null
  delete_reason: string | null
  uploader: User
  work: Work | null
  chapter: Chapter | null
  is_current: boolean
  is_primary?: boolean
  is_reference?: boolean
  author?: Author | null
}

export interface OrganizeChange {
  kind: 'chapter' | 'resource' | 'work' | 'author' | 'library'
  id: number
  name: string
  from: string
  to: string
}
export interface PrimaryGroup {
  key: string
  previous_primary_id: number | null
  title: string
  work_name: string
  season_number: number
  episode_number: number
  resources: {
    id: number
    name: string
    file_size: number
    uploader_name: string
    source_chapter: string
    incoming: boolean
  }[]
}
export interface OrganizePreview {
  token: string
  action: string
  changes: OrganizeChange[]
  groups: PrimaryGroup[]
}
export interface RestorePreview {
  id: number
  subject: string
  action: string
  versions: Record<string, number>
  changes: OrganizeChange[]
  conflicts: string[]
  can_restore: boolean
}

export interface UploadResult {
  file_id?: string
  completed?: boolean
  media_id?: number
  chapter?: Chapter
  work?: Partial<Work>
  duplicate?: boolean
  sha256?: string
  matches?: AudioResource[]
  upload_id?: string
}
