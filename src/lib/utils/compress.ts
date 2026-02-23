const MAX_WIDTH = 2000
const MAX_HEIGHT = 2000
const QUALITY = 0.85
const TARGET_BYTES = 500_000 // 500 KB

export interface CompressResult {
	file: File
	originalSize: number
	compressedSize: number
}

/**
 * Compresses an image using the browser Canvas API.
 * Resizes to fit within MAX_WIDTH x MAX_HEIGHT and converts to WebP.
 * If the first pass is still over TARGET_BYTES, retries at lower quality.
 */
export async function compressImage(source: File): Promise<CompressResult> {
	const originalSize = source.size
	const bitmap = await createImageBitmap(source)

	let { width, height } = bitmap

	if (width > MAX_WIDTH || height > MAX_HEIGHT) {
		const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
		width = Math.round(width * ratio)
		height = Math.round(height * ratio)
	}

	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d')!
	ctx.drawImage(bitmap, 0, 0, width, height)
	bitmap.close()

	// First pass at target quality
	let blob = await canvasToBlob(canvas, QUALITY)

	// If still too large, reduce quality until under target or floor of 0.6
	if (blob.size > TARGET_BYTES) {
		let q = QUALITY - 0.1
		while (blob.size > TARGET_BYTES && q >= 0.6) {
			blob = await canvasToBlob(canvas, q)
			q -= 0.05
		}
	}

	const name = source.name.replace(/\.[^.]+$/, '.webp')
	const file = new File([blob], name, { type: 'image/webp' })

	return { file, originalSize, compressedSize: file.size }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob)
				else reject(new Error('Canvas toBlob failed'))
			},
			'image/webp',
			quality
		)
	})
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Removes a leading street number (e.g. "37 Gould Ave" → "Gould Ave", "14A Main St" → "Main St") */
export function stripStreetNumber(street: string | null | undefined): string {
	if (!street) return ''
	return street.replace(/^\d+\w*\s+/, '')
}
