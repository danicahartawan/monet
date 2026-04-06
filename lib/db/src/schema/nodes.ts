import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const nodesTable = pgTable("nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNodeSchema = createInsertSchema(nodesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectNodeSchema = createSelectSchema(nodesTable);

export const patchNodeSchema = insertNodeSchema.partial();

export type Node = typeof nodesTable.$inferSelect;
export type InsertNode = z.infer<typeof insertNodeSchema>;
export type PatchNode = z.infer<typeof patchNodeSchema>;
