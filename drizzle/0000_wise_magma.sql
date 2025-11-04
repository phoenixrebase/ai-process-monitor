CREATE TABLE "compliance_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"guideline" text NOT NULL,
	"result" varchar(10) NOT NULL,
	"confidence" numeric(5, 4) NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "created_at_idx" ON "compliance_results" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "guideline_idx" ON "compliance_results" USING btree ("guideline");--> statement-breakpoint
CREATE INDEX "result_idx" ON "compliance_results" USING btree ("result");--> statement-breakpoint
CREATE INDEX "timestamp_idx" ON "compliance_results" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "action_guideline_idx" ON "compliance_results" USING btree ("action","guideline");