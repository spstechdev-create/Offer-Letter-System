-- Custom SQL migration file, put your code below! --
CREATE OR REPLACE FUNCTION prevent_letter_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Issued letter snapshots are immutable. Create a new version to correct a letter.';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER issued_letter_immutable BEFORE UPDATE OR DELETE ON issued_letters FOR EACH ROW EXECUTE FUNCTION prevent_letter_mutation();
--> statement-breakpoint
CREATE INDEX applications_owner_idx ON applications(created_by);
--> statement-breakpoint
CREATE INDEX applications_student_idx ON applications(student_id);
--> statement-breakpoint
ALTER TABLE app_users ADD CONSTRAINT user_scope_valid CHECK(scope IN ('own','faculty','all'));
--> statement-breakpoint
ALTER TABLE catalogue ADD CONSTRAINT fee_nonnegative CHECK(total_fee >= 0);
