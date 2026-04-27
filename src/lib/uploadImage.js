import { supabase } from './supabase'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED   = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

function getMimeType(file) {
  if (file.type === 'image/jpg' || file.name.match(/\.(jpg|jpeg)$/i)) return 'image/jpeg'
  if (file.name.match(/\.png$/i))  return 'image/png'
  if (file.name.match(/\.webp$/i)) return 'image/webp'
  return file.type || 'image/jpeg'
}

export function validateImageFile(file) {
  const mime = getMimeType(file)
  if (!ALLOWED.includes(mime)) {
    throw new Error('Unsupported format. Please use JPEG, PNG, or WebP.')
  }
  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    throw new Error(`File is ${mb} MB — maximum allowed size is 5 MB.`)
  }
}

export async function uploadImage(bucket, path, file) {
  validateImageFile(file)

  const contentType = getMimeType(file)
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType })

  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}
