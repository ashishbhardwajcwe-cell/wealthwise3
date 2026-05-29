import { createClient, type SanityClient } from "next-sanity";
import createImageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { apiVersion, dataset, projectId, token, isSanityConfigured } from "./env";

// Re-export so callers can guard on availability without importing env directly.
export { isSanityConfigured };

/** Lazy clients — only created when Sanity env vars are present.
 *  Importing `sanityClient` is safe even without env vars; we only
 *  throw if someone actually tries to use it.
 *  Callers should check `isSanityConfigured` first.
 */
let _client: SanityClient | null = null;
let _freshClient: SanityClient | null = null;

function getClient(): SanityClient {
  if (!isSanityConfigured) {
    throw new Error("Sanity is not configured (missing NEXT_PUBLIC_SANITY_PROJECT_ID).");
  }
  if (!_client) {
    _client = createClient({
      projectId, dataset, apiVersion,
      useCdn: true,
      perspective: "published",
      token,
    });
  }
  return _client;
}

function getFreshClient(): SanityClient {
  if (!isSanityConfigured) {
    throw new Error("Sanity is not configured.");
  }
  if (!_freshClient) {
    _freshClient = createClient({
      projectId, dataset, apiVersion,
      useCdn: false,
      perspective: "previewDrafts",
      token,
    });
  }
  return _freshClient;
}

export const sanityClient = new Proxy({} as SanityClient, {
  get(_t, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export const sanityFreshClient = new Proxy({} as SanityClient, {
  get(_t, prop) {
    const client = getFreshClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

const imageBuilder = isSanityConfigured ? createImageUrlBuilder({ projectId, dataset }) : null;

export function urlFor(source: SanityImageSource) {
  if (!imageBuilder) {
    throw new Error("Cannot build image URL: Sanity not configured.");
  }
  return imageBuilder.image(source);
}
