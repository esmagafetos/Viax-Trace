import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const userSettingsTable = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  parserMode: text("parser_mode").notNull().default("builtin"),
  aiProvider: text("ai_provider"),
  aiApiKey: text("ai_api_key"),
  toleranceMeters: integer("tolerance_meters").notNull().default(300),
  instanceMode: text("instance_mode").notNull().default("builtin"),
  googleMapsApiKey: text("google_maps_api_key"),
  geocodebrUrl: text("geocodebr_url"),
  valorPorRota: real("valor_por_rota"),
  cicloPagamentoDias: integer("ciclo_pagamento_dias").notNull().default(30),
  metaMensalRotas: integer("meta_mensal_rotas"),
  despesasFixasMensais: real("despesas_fixas_mensais"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSettingsSchema = createInsertSchema(userSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettingsTable.$inferSelect;
