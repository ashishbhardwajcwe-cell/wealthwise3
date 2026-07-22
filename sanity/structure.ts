import type { StructureResolver } from "sanity/structure";

export const deskStructure: StructureResolver = (S) =>
  S.list()
    .title("PlanMyCashflows Content")
    .items([
      S.listItem()
        .title("Editorial")
        .child(
          S.list()
            .title("Editorial")
            .items([
              S.documentTypeListItem("blogPost").title("Blog Posts"),
              // Reader submissions arrive as drafts flagged isGuestSubmission.
              // Review → assign an Author → Publish to approve; delete to decline.
              S.listItem()
                .title("Guest Submissions (review queue)")
                .child(
                  S.documentList()
                    .title("Guest Submissions")
                    .filter('_type == "blogPost" && isGuestSubmission == true')
                    .apiVersion("2024-09-01"),
                ),
              S.documentTypeListItem("stockAnalysis").title("Stock Analyses"),
              S.documentTypeListItem("author").title("Authors"),
              S.documentTypeListItem("category").title("Categories"),
            ]),
        ),
      S.divider(),
      S.listItem()
        .title("Investment Data")
        .child(
          S.list()
            .title("Investment Data")
            .items([
              S.documentTypeListItem("pmsStrategy").title("PMS Strategies"),
              // Singleton — the explorer's alpha benchmark. Pinned to one
              // document so there's a single row the monthly refresh updates.
              S.listItem()
                .title("Benchmark (S&P BSE 500 TRI)")
                .id("benchmark")
                .child(
                  S.document()
                    .schemaType("benchmark")
                    .documentId("benchmark-sp-bse-500-tri"),
                ),
              S.documentTypeListItem("aifFund").title("AIF Funds"),
              S.documentTypeListItem("unlistedShare").title("Unlisted Shares"),
              // Companies the price importer auto-created but couldn't match.
              // Fix the name/sector/summary, then untick needsReview to publish.
              S.listItem()
                .title("Unlisted Shares (needs review)")
                .child(
                  S.documentList()
                    .title("Needs review")
                    .filter('_type == "unlistedShare" && needsReview == true')
                    .apiVersion("2024-09-01"),
                ),
            ]),
        ),
    ]);
