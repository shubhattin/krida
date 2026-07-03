type WebpOptions = import('sharp').WebpOptions;

export const resizeImage = async (
  inputPng: Buffer | string,
  width: number,
  height: number,
  webp_options?: WebpOptions
) => {
  const sharpModule = (await import('sharp')).default;

  let inputPngBuffer = inputPng;
  if (typeof inputPng === 'string') {
    inputPngBuffer = Buffer.from(inputPng, 'base64');
  } else {
    inputPngBuffer = inputPng;
  }

  const webpBuffer = await sharpModule(inputPngBuffer)
    .resize({
      width: width,
      height: height,
      fit: 'cover', // preserves aspect ratio while ensuring exact 256x256
      position: 'centre',
      kernel: sharpModule.kernel.lanczos3, // high-quality downscale
      withoutEnlargement: true,
      fastShrinkOnLoad: true
    })
    .webp({
      quality: 80, // good balance; raise to 85–90 for more fidelity
      effort: 5, // 0–6; higher = slower but smaller
      alphaQuality: 80, // preserve decent transparency quality
      lossless: false, // set true if you need near-lossless (bigger files)
      nearLossless: false,
      smartSubsample: true,
      ...webp_options
    })
    .toBuffer();

  return webpBuffer;
};
