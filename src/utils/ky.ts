import ky from 'ky'

let csrf = ''
let userId: number | null = null
export function setCsrfToken(token: string) {
  csrf = token
}
export function setApiUserId(id: number | null) {
  userId = id
}

const api = ky.create({
  prefixUrl: '/api',
  credentials: 'same-origin',
  timeout: 30_000,
  retry: 0,
  headers: { Accept: 'application/json' },
  hooks: {
    beforeRequest: [
      (request) => {
        if (userId !== null) request.headers.set('ABS_USER_ID', String(userId))
        else request.headers.delete('ABS_USER_ID')
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && csrf)
          request.headers.set('X-CSRF-TOKEN', csrf)
      },
    ],
    afterResponse: [
      (_request, _options, response) => {
        if (response.status === 401) window.dispatchEvent(new Event('session-expired'))
      },
    ],
    beforeError: [
      async (error) => {
        const body = (await error.response
          .clone()
          .json()
          .catch(() => null)) as { error?: string } | null
        error.message =
          body?.error ||
          (error.response.status === 419
            ? '页面停留太久了，刷新后再试一次吧。'
            : `请求没有完成（${error.response.status}）`)
        return error
      },
    ],
  },
})
export { ky }
export default api
