ALTER TABLE "companies" RENAME COLUMN "status" TO "is_active";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "status" TO "is_active";--> statement-breakpoint
ALTER INDEX "companies_status_idx" RENAME TO "companies_is_active_idx";--> statement-breakpoint
ALTER INDEX "users_status_idx" RENAME TO "users_is_active_idx";
