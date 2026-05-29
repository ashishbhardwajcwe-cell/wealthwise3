import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { apiVersion, dataset, projectId } from "./sanity/env";
import { schemaTypes } from "./sanity/schemas";
import { deskStructure } from "./sanity/structure";

export default defineConfig({
  basePath: "/studio",
  name: "auris-wealth",
  title: "Auris Wealth",
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins: [
    structureTool({ structure: deskStructure }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
});
