"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { StarRating } from "@/components/StarRating";

const MAX_PHOTOS = 4;

/** Customer review form with optional healed-tattoo photos. Photos are
 *  compressed + uploaded client-side to the public `review-images` bucket, then
 *  their URLs are submitted alongside the text via the passed server action. */
export function ReviewForm({
  requestId,
  artistId,
  name,
  isBookedHere,
  action,
}: {
  requestId: string;
  artistId: string;
  name: string;
  isBookedHere: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  const supabase = createClient();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const previews = files.map((f) => ({ f, url: URL.createObjectURL(f) }));

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list).filter((f) => f.type.startsWith("image/"))].slice(0, MAX_PHOTOS);
    setFiles(next);
    if (fileRef.current) fileRef.current.value = "";
  }
  function removeAt(i: number) {
    setFiles(files.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget); // rating / title / body / hidden ids
    try {
      for (const original of files.slice(0, MAX_PHOTOS)) {
        const img = await compressImage(original);
        const ext = img.type === "image/webp" ? "webp" : img.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${artistId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("review-images")
          .upload(path, img, { contentType: img.type || undefined });
        if (upErr) throw upErr;
        const url = supabase.storage.from("review-images").getPublicUrl(path).data.publicUrl;
        fd.append("image_url", url);
      }
    } catch {
      setError("A photo failed to upload. You can remove it and try again.");
      setBusy(false);
      return;
    }
    await action(fd); // server action redirects on success
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 14 }}>
      <input type="hidden" name="request_id" value={requestId} />
      <input type="hidden" name="artist_id" value={artistId} />
      <div className="ns-label" style={{ marginBottom: 10 }}>
        Review {name}
        {isBookedHere ? "  ✅ Verified booking" : ""}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <StarRating name="rating" defaultValue={5} />
        <input name="title" placeholder="Title (optional)" className="rev-input" />
        <textarea name="body" placeholder="How was your experience?" className="rev-input" rows={3} />

        {previews.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {previews.map((p, i) => (
              <span key={p.url} style={{ position: "relative", display: "inline-block" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} />
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label="Remove photo"
                  style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: "50%", border: "none", background: "#311A41", color: "#fff", cursor: "pointer", fontSize: 13, lineHeight: 1 }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {files.length < MAX_PHOTOS && (
          <label style={{ fontSize: 13.5, fontWeight: 700, color: "var(--violet)", cursor: "pointer" }}>
            + Add photos of your tattoo ({files.length}/{MAX_PHOTOS})
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => addFiles(e.target.files)}
              style={{ display: "none" }}
            />
          </label>
        )}

        {error && <p style={{ color: "var(--danger, #c0392b)", fontSize: 13, margin: 0 }}>{error}</p>}

        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </form>
  );
}
