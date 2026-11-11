import dayjs from 'dayjs'

export function bytes(value: number): string {
  if (!value) return '0 B'
  const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 4)
  return `${(value / 1024 ** unit).toFixed(unit > 1 ? 1 : 0)} ${['B', 'KB', 'MB', 'GB', 'TB'][unit]}`
}
export function date(value?: string | null, time = false) {
  return value ? dayjs(value).format(time ? 'YYYY.MM.DD HH:mm' : 'YYYY.MM.DD') : '日期待补充'
}
export function duration(seconds: number) {
  const total = Math.round(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
export const actionNames: Record<string, string> = {
  'activity.restored': '恢复到了操作前的状态',
  'chapter.created': '新建了章节',
  'chapter.updated': '修改了章节',
  'chapter.deleted': '移除了空章节',
  'primary.changed': '切换了主资源',
  'chapters.merged': '合并了章节',
  'chapters.edited': '批量修改了章节',
  'resources.moved': '重新分配了资源',
  'author.created': '新建了作者',
  'author.updated': '更新了作者资料',
  'author.deleted': '删除了空作者',
  'author.cover_uploaded': '上传了作者封面',
  'library.updated': '修改了分类',
  'library.deleted': '删除了空分类',
  'sync.requested': '重新安排了收听端同步',
  'work.created': '新建了作品',
  'work.updated': '修改了作品资料',
  'work.deleted': '删除了作品',
  'library.created': '新建了分类',
  'audio.referenced': '引用了已有音频',
  'audio.uploaded': '上传了音频',
  'cover.uploaded': '更换了作品封面',
  'media.deleted': '删除了音频',
  'chapters.reordered': '调整了播放顺序',
  'notice.accepted': '同意了上传须知',
  'role.updated': '调整了成员权限',
  'profile.updated': '更新了化名',
}
export function operationName(action: string) {
  return (actionNames[action] || '修改内容').replace('了', '').replace('到了', '到')
}
export const fieldNames: Record<string, string> = {
  title: '章节标题',
  season_number: '季',
  episode_number: '集 / 章节编号',
  name: '名称',
  tagline: '副标题',
  description: '简介',
  abs_library_id: '分类',
  date_air: '首播日期',
  is_adult: '成人内容',
  pseudonym: '化名',
  cover_file_id: '封面',
}
export function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '未填写'
  if (typeof value === 'boolean') return value ? '是' : '否'
  return String(value)
}
