"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

// TODO: Replace with the real intro video ID once the video is published.
export const HERO_VIDEO_ID = "PLACEHOLDER_VIDEO_ID";

interface LazyYouTubeProps {
  videoId: string;
  title: string;
  className?: string;
}

/**
 * Click-to-load YouTube facade: only a lightweight thumbnail renders on
 * page load; the iframe is injected the moment the visitor presses play.
 * While the video ID is still the placeholder, a branded "coming soon"
 * panel renders instead of a broken thumbnail.
 */
export function LazyYouTube({ videoId, title, className }: LazyYouTubeProps) {
  const [playing, setPlaying] = useState(false);
  const isPlaceholder = !videoId || videoId === "PLACEHOLDER_VIDEO_ID";

  return (
    <div className={cn("relative w-full aspect-video overflow-hidden rounded-2xl shadow-lg bg-[var(--color-navy)]", className)}>
      {playing && !isPlaceholder ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => !isPlaceholder && setPlaying(true)}
          disabled={isPlaceholder}
          aria-label={isPlaceholder ? `${title} — video coming soon` : `Play video: ${title}`}
          className="group absolute inset-0 w-full h-full cursor-pointer disabled:cursor-default"
        >
          {isPlaceholder ? (
            <span
              className="absolute inset-0 bg-gradient-to-br from-[var(--color-navy)] via-[var(--color-midnight)] to-[var(--color-ocean)]"
              aria-hidden
            />
          ) : (
            // Facade thumbnail: next/image would need an i.ytimg.com remotePattern for no optimisation benefit.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
              alt={`Video thumbnail: ${title}`}
              loading="lazy"
              width={480}
              height={360}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center bg-[var(--color-gold)] text-[var(--color-navy)] shadow-lg transition-transform",
                isPlaceholder ? "opacity-70" : "group-hover:scale-110",
              )}
            >
              <Play className="w-7 h-7 ml-1" fill="currentColor" aria-hidden />
            </span>
            {isPlaceholder && (
              <span className="text-xs uppercase tracking-wider text-[var(--color-cream)]/80 font-semibold">
                Video coming soon
              </span>
            )}
          </span>
        </button>
      )}
    </div>
  );
}
