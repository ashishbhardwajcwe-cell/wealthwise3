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
              S.documentTypeListItem("aifFund").title("AIF Funds"),
              S.documentTypeListItem("unlistedShare").title("Unlisted Shares"),
            ]),
        ),
    ]);
