/**
 * Client-side image compression. Resizes to a max dimension and re-encodes as
 * WebP, which typically cuts file size by 60-90% with no visible quality loss -
 * saving a lot of Supabase Storage. Runs entirely in the browser before upload.
 * Falls back to the original file on any error or if it wouldn't be smaller.
 */
export async function compressImage(
  file: File,
  { maxDim = 1600, quality = 0.82 }: { maxDim?: number; quality?: number } = {},
): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file; // keep animation

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/webp", quality),
    );
    if (!blob || blob.size >= file.size) return file; // no win, keep original

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch {
    return file;
  }
}

/**
 * Compress a set of files and return them as a FileList (via DataTransfer) so an
 * <input type="file"> can be re-populated with the compressed versions before a
 * form submits. Falls back to the originals if DataTransfer isn't available.
 */
export async function compressToFileList(
  files: File[],
  opts?: { maxDim?: number; quality?: number },
): Promise<FileList | null> {
  const compressed = await Promise.all(files.map((f) => compressImage(f, opts)));
  if (typeof DataTransfer === "undefined") return null;
  const dt = new DataTransfer();
  compressed.forEach((f) => dt.items.add(f));
  return dt.files;
}
