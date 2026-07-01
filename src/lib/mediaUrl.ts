// Rewrites raw S3 bucket URLs (which leak the bucket name/region/key layout in
// page source) to a same-origin path. The actual proxying happens via the
// rewrite rule in next.config.ts, so this only needs to swap the prefix.
const BUCKET_URL = process.env.NEXT_PUBLIC_AWS_BUCKET_URL

export function mediaUrl(url: string): string
export function mediaUrl(url: string | null | undefined): string | null | undefined
export function mediaUrl(url: string | null | undefined): string | null | undefined {
  if (!url) return url
  if (BUCKET_URL && url.startsWith(BUCKET_URL)) {
    return `/media${url.slice(BUCKET_URL.length)}`
  }
  return url
}
