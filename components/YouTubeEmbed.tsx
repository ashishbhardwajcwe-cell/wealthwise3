interface YouTubeEmbedProps {
  url: string;
  caption?: string;
}

/** Extracts a YouTube video ID from any common URL shape. */
function getVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    // Shorts: /shorts/VIDEO_ID
    const shortsMatch = u.pathname.match(/^\/shorts\/([^/]+)/);
    if (shortsMatch) return shortsMatch[1];
    // Embed: /embed/VIDEO_ID
    const embedMatch = u.pathname.match(/^\/embed\/([^/]+)/);
    if (embedMatch) return embedMatch[1];
  } catch {
    return null;
  }
  return null;
}

export function YouTubeEmbed({ url, caption }: YouTubeEmbedProps) {
  const id = getVideoId(url);
  if (!id) return null;
  return (
    <figure className="my-6">
      <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title={caption ?? "Embedded YouTube video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
      {caption && (
        <figcaption className="text-xs text-[var(--color-slate)] mt-2 text-center italic">{caption}</figcaption>
      )}
    </figure>
  );
}
