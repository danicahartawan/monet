import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { nodesTable } from "./nodes";

export const edgesTable = pgTable("edges", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceNodeId: uuid("source_node_id")
    .notNull()
    .references(() => nodesTable.id, { onDelete: "cascade" }),
  targetNodeId: uuid("target_node_id")
    .notNull()
    .references(() => nodesTable.id, { onDelete: "cascade" }),
  label: text("label"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEdgeSchema = createInsertSchema(edgesTable).omit({
  id: true,
  createdAt: true,
});

export const selectEdgeSchema = createSelectSchema(edgesTable);

export const patchEdgeSchema = insertEdgeSchema.partial();

export type Edge = typeof edgesTable.$inferSelect;
export type InsertEdge = z.infer<typeof insertEdgeSchema>;
export type PatchEdge = z.infer<typeof patchEdgeSchema>;
