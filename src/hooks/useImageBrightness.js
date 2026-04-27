import { useState, useEffect } from 'react'

// Returns true if the sampled region of an image is dark (use light/white text)
// Returns false if bright (use dark text from scheme: #0B0F1A)
export function useImageBrightness(url, sampleRegion = 'bottom') {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    if (!url) { setIsDark(true); return }

    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const W = 100, H = 50
        const canvas = document.createElement('canvas')
        canvas.width = W; canvas.height = H
        const ctx = canvas.getContext('2d')

        // Sample the bottom third (where overlaid text usually lives)
        const srcY = sampleRegion === 'top' ? 0 : img.height * 0.6
        const srcH = img.height * 0.4
        ctx.drawImage(img, 0, srcY, img.width, srcH, 0, 0, W, H)

        const { data } = ctx.getImageData(0, 0, W, H)
        let luminanceSum = 0
        const pixels = data.length / 4
        for (let i = 0; i < data.length; i += 4) {
          // Perceived luminance (ITU-R BT.601)
          luminanceSum += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255
        }
        setIsDark((luminanceSum / pixels) < 0.55)
      } catch {
        setIsDark(true)
      }
    }
    img.onerror = () => setIsDark(true)
    img.src = url
  }, [url, sampleRegion])

  return isDark
}
