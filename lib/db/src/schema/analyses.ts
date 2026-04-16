import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const analysesTable = pgTable("analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  totalAddresses: integer("total_addresses").notNull().default(0),
  nuances: integer("nuances").notNull().default(0),
  geocodeSuccess: integer("geocode_success").notNull().default(0),
  similarityAvg: real("similarity_avg").notNull().default(0),
  processingTimeMs: integer("processing_time_ms").notNull().default(0),
  parserMode: text("parser_mode").notNull().default("builtin"),
  status: text("status").notNull().default("done"),
  results: text("results"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAnalysisSchema = createInsertSchema(analysesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
