export const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener('load', () => resolve(image))
        image.addEventListener('error', (error) => reject(error))
        image.src = url
    })

export function getRadianAngle(degreeValue: number) {
    return (degreeValue * Math.PI) / 180
}

export default async function getCroppedImg(
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number },
    targetWidth: number = 256,
    targetHeight: number = 256
): Promise<Blob | null> {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        return null
    }

    // Set canvas dimensions to the TARGET low resolution (e.g., 256x256)
    canvas.width = targetWidth
    canvas.height = targetHeight

    // Draw the cropped area of the original image onto the low-res canvas
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        targetWidth,
        targetHeight
    )

    // Export as WebP for best compression/quality, fallback to JPEG if needed
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                // reject(new Error('Canvas is empty'));
                console.error('Canvas is empty');
                resolve(null);
                return;
            }
            resolve(blob);
        }, 'image/webp', 0.8) // 0.8 quality = good balance of size vs quality
    })
}
