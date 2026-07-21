import type { SchemaTypeDefinition } from "sanity";
import { author } from "./author";
import { category } from "./category";
import { blogPost } from "./blogPost";
import { stockAnalysis } from "./stockAnalysis";
import { pmsStrategy } from "./pmsStrategy";
import { benchmark } from "./benchmark";
import { aifFund } from "./aifFund";
import { unlistedShare } from "./unlistedShare";

export const schemaTypes: SchemaTypeDefinition[] = [
  // Editorial
  blogPost,
  stockAnalysis,
  author,
  category,
  // Data
  pmsStrategy,
  benchmark,
  aifFund,
  unlistedShare,
];
