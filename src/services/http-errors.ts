export function isHttp524(err: unknown): boolean {
  const anyErr = err as any
  const status = anyErr?.response?.status
  const msg = String(anyErr?.message ?? '')
  return status === 524 || msg.includes('524')
}
