export interface UploadResult {
  imageUrl: string
  publicId: string
  uploadedAt: string
  fileSizeKb: number
  format: string
}

export class ProofUploadError extends Error {
  constructor(
    public code: 'INVALID_TYPE' | 'TOO_LARGE' | 'UPLOAD_FAILED',
    message: string
  ) {
    super(message)
    this.name = 'ProofUploadError'
  }
}

export async function uploadProofImage(
  file: File,
  habitId: string,
  userId: string
): Promise<UploadResult> {
  // Step 1 — validate type
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    throw new ProofUploadError('INVALID_TYPE', 
      'Only JPEG, PNG or WEBP images are allowed.')
  }

  // Step 2 — validate size (4MB max)
  if (file.size > 4 * 1024 * 1024) {
    throw new ProofUploadError('TOO_LARGE', 
      'Image must be under 4MB.')
  }

  // Step 3 — build FormData
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', `habit-proof/${userId}/${habitId}`)
  formData.append('public_id', `${habitId}_${userId}_${Date.now()}`)
  formData.append('tags', `habit-proof,${habitId}`)

  // Step 4 — upload directly to Cloudinary
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    throw new ProofUploadError('UPLOAD_FAILED',
      'Image upload failed. Check your connection and try again.')
  }

  const data = await response.json()

  // Step 5 — return result
  return {
    imageUrl: data.secure_url,
    publicId: data.public_id,
    uploadedAt: new Date().toISOString(),
    fileSizeKb: Math.round(file.size / 1024),
    format: data.format
  }
}
