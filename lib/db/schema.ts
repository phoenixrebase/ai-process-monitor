import { pgTable, serial, text, varchar, decimal, timestamp, index } from "drizzle-orm/pg-core";

export const complianceResults = pgTable(
  "compliance_results",
  {
    id: serial("id").primaryKey(),
    action: text("action").notNull(),
    guideline: text("guideline").notNull(),
    result: varchar("result", { length: 10 }).notNull(),
    confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("created_at_idx").on(table.createdAt),
    index("guideline_idx").on(table.guideline),
    index("result_idx").on(table.result),
    index("timestamp_idx").on(table.timestamp),
    index("action_guideline_idx").on(table.action, table.guideline),
  ]
);
