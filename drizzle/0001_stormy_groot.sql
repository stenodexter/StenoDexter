DROP INDEX "idx_user_type";--> statement-breakpoint
DROP INDEX "idx_stage";--> statement-breakpoint
CREATE INDEX "admin_invited_by_idx" ON "admin" USING btree ("invited_by_admin_id");--> statement-breakpoint
CREATE INDEX "admin_is_super_idx" ON "admin" USING btree ("is_super");--> statement-breakpoint
CREATE INDEX "admin_is_system_idx" ON "admin" USING btree ("is_system");--> statement-breakpoint
CREATE INDEX "admin_invite_created_by_idx" ON "admin_invite" USING btree ("created_by_admin_id");--> statement-breakpoint
CREATE INDEX "admin_invite_status_idx" ON "admin_invite" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admin_invite_token_status_expires_idx" ON "admin_invite" USING btree ("token","status","expires_at");--> statement-breakpoint
CREATE INDEX "admin_invite_expires_at_idx" ON "admin_invite" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "admin_invite_usage_invite_id_idx" ON "admin_invite_usage" USING btree ("invite_id");--> statement-breakpoint
CREATE INDEX "admin_invite_usage_used_by_idx" ON "admin_invite_usage" USING btree ("used_by_admin_id");--> statement-breakpoint
CREATE INDEX "admin_invite_usage_invite_used_by_idx" ON "admin_invite_usage" USING btree ("invite_id","used_by_admin_id");--> statement-breakpoint
CREATE INDEX "admin_session_token_expires_idx" ON "admin_session" USING btree ("token","expires_at");--> statement-breakpoint
CREATE INDEX "admin_session_admin_id_idx" ON "admin_session" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "admin_session_expires_at_idx" ON "admin_session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_active_attempts" ON "test_attempts" USING btree ("user_id","stage") WHERE is_submitted = false;--> statement-breakpoint
CREATE INDEX "idx_unscored" ON "test_attempts" USING btree ("test_id","submitted_at") WHERE is_submitted = true AND score IS NULL;