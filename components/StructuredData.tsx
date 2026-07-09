interface StructuredDataProps {
  data: Record<string, unknown>;
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function articleSchema(opts: {
  title: string;
  description: string;
  author: string;
  date: string;
  image?: string;
  url: string;
  /** Visible reader comments — emitted as commentCount + discussionUrl. */
  commentCount?: number;
  /** Reader likes — emitted as an interactionStatistic (LikeAction). */
  likeCount?: number;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    author: { "@type": "Person", name: opts.author },
    datePublished: opts.date,
    image: opts.image,
    url: opts.url,
  };
  if (opts.commentCount && opts.commentCount > 0) {
    schema.commentCount = opts.commentCount;
    schema.discussionUrl = `${opts.url}#comments`;
  }
  if (opts.likeCount && opts.likeCount > 0) {
    schema.interactionStatistic = {
      "@type": "InteractionCounter",
      interactionType: { "@type": "LikeAction" },
      userInteractionCount: opts.likeCount,
    };
  }
  return schema;
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function collectionPageSchema(opts: {
  name: string;
  description: string;
  url: string;
  datasets: { name: string; description: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    isPartOf: {
      "@type": "WebSite",
      name: "PlanMyCashflows",
      url: "https://planmycashflows.com",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://planmycashflows.com/markets?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
    mainEntity: opts.datasets.map((d) => ({
      "@type": "Dataset",
      name: d.name,
      description: d.description,
      creator: { "@type": "Organization", name: "PlanMyCashflows" },
    })),
  };
}
