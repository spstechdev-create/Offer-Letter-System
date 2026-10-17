CREATE TABLE "faculties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name_ms" text NOT NULL,
	"name_en" text NOT NULL,
	"kind" text DEFAULT 'faculty' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faculties_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "faculty_id" uuid;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "faculty_id" uuid;--> statement-breakpoint
ALTER TABLE "catalogue" ADD COLUMN "faculty_id" uuid;--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue" ADD CONSTRAINT "catalogue_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO faculties(code,name_ms,name_en,kind,website,source_url,notes,is_active) SELECT code,name_ms,name_en,kind,website,source_url,COALESCE(notes,''),is_active FROM jsonb_to_recordset('[{"id":"ftke","code":"FTKE","name_ms":"Fakulti Teknologi dan Kejuruteraan Elektrik","name_en":"Faculty of Electrical Technology and Engineering","kind":"faculty","website":"https://ftke.utem.edu.my/en/","source_url":"https://ftke.utem.edu.my/en/","is_active":true,"notes":"Malay and English names and FTKE code verified on the faculty website and corroborated by UTeM corporate directories on 2026-10-17."},{"id":"ftkek","code":"FTKEK","name_ms":"Fakulti Teknologi dan Kejuruteraan Elektronik dan Komputer","name_en":"Faculty of Electronic and Computer Technology and Engineering","kind":"faculty","website":"https://ftkek.utem.edu.my/","source_url":"https://ftkek.utem.edu.my/menu-1/dean-s-welcome-note.html","is_active":true,"notes":"Malay name/code verified on faculty site. English name follows faculty Dean''s Welcome Note (updated 2025-11-18); corporate directory uses Electronics (plural), while the SPS 2026 embedded list uses Faculty of Electronic and Computer Engineering Technology. These official English variants remain documented; no programme titles are changed. Checked 2026-10-17."},{"id":"ftkm","code":"FTKM","name_ms":"Fakulti Teknologi dan Kejuruteraan Mekanikal","name_en":"Faculty of Mechanical Technology and Engineering","kind":"faculty","website":"https://ftkm.utem.edu.my/","source_url":"https://ftkm.utem.edu.my/","is_active":true,"notes":"Malay name/code and English faculty name verified on faculty homepage and corroborated by UTeM corporate directories on 2026-10-17."},{"id":"ftkip","code":"FTKIP","name_ms":"Fakulti Teknologi dan Kejuruteraan Industri dan Pembuatan","name_en":"Faculty of Industrial and Manufacturing Technology and Engineering","kind":"faculty","website":"https://ftkip.utem.edu.my/","source_url":"https://www.utem.edu.my/en/corporate-info/faculties-department-centres.html","is_active":true,"notes":"Malay name/code verified in FTKIP faculty contact footer; English name verified in UTeM corporate directory and SPS 2026 embedded faculty list. Checked 2026-10-17."},{"id":"ftmk","code":"FTMK","name_ms":"Fakulti Teknologi Maklumat dan Komunikasi","name_en":"Faculty of Information and Communication Technology","kind":"faculty","website":"https://ftmk.utem.edu.my/web/","source_url":"https://ftmk.utem.edu.my/web/index.php/deans-foreword/","is_active":true,"notes":"Malay name verified in UTeM Malay corporate directory. English singular Communication follows faculty Dean''s Foreword (updated September 2026) and SPS 2026 embedded faculty list; corporate English directory uses Communications (plural). Checked 2026-10-17."},{"id":"fptt","code":"FPTT","name_ms":"Fakulti Pengurusan Teknologi dan Teknousahawanan","name_en":"Faculty of Technology Management and Technopreneurship","kind":"faculty","website":"https://fptt.utem.edu.my/","source_url":"https://fptt.utem.edu.my/home/about-us-fptt/about-fptt.html","is_active":true,"notes":"Malay contact footer, English faculty heading and FPTT code verified on faculty site; corroborated by UTeM corporate directories. Checked 2026-10-17."},{"id":"faix","code":"FAIX","name_ms":"Fakulti Kecerdasan Buatan dan Keselamatan Siber","name_en":"Faculty of Artificial Intelligence and Cyber Security","kind":"faculty","website":"https://faix.utem.edu.my/en/","source_url":"https://faix.utem.edu.my/en/","is_active":true,"notes":"English name/code verified on faculty site; Malay name verified in UTeM Malay corporate directory and academic page. Faculty registry activation does not approve the legacy MAIX offering''s fees or modes. Checked 2026-10-17."},{"id":"iptk","code":"IPTK","name_ms":"Institut Pengurusan Teknologi dan Keusahawanan","name_en":"Institute of Technology Management and Entrepreneurship","kind":"institute","website":"https://iptk.utem.edu.my/en/","source_url":"https://iptk.utem.edu.my/en/","is_active":true,"notes":"Legacy programme owner retained without automatic retirement. IPTK website still displays this English name/code and UTeM Malay homepage still lists the Malay legacy name. Corporate ms/en directories now label the same destination ITK. Current identity/transition and programme ownership are unresolved; do not reassign IPTK programmes or rewrite saved letters automatically. Checked 2026-10-17."},{"id":"itk","code":"ITK","name_ms":"Institut Teknologi Kelestarian","name_en":"Institute of Sustainability Technology","kind":"institute","website":"https://iptk.utem.edu.my/en/","source_url":"https://www.utem.edu.my/en/corporate-info/faculties-department-centres.html","is_active":true,"notes":"Current ITK code/Malay/English names verified in UTeM corporate ms/en directories. SPS 2026 embedded list uses Institute of Sustainable Technology; corporate naming is retained here. Corporate links lead to the still-IPTK-branded site. Separate registry entry only: no legacy IPTK programmes migrated or new offerings inferred. Checked 2026-10-17."}]'::jsonb) AS f(code text,name_ms text,name_en text,kind text,website text,source_url text,notes text,is_active boolean) ON CONFLICT(code) DO NOTHING;
--> statement-breakpoint
UPDATE catalogue c SET faculty_id=f.id FROM faculties f WHERE upper(c.faculty)=f.code AND c.faculty_id IS NULL;
--> statement-breakpoint
UPDATE app_users u SET faculty_id=f.id FROM faculties f WHERE upper(u.faculty_code)=f.code AND u.faculty_id IS NULL;
--> statement-breakpoint
UPDATE applications a SET faculty_id=f.id FROM faculties f WHERE upper(a.faculty_snapshot)=f.code AND a.faculty_id IS NULL;
--> statement-breakpoint
ALTER TABLE catalogue ALTER COLUMN faculty_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE applications ALTER COLUMN faculty_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE faculties ADD CONSTRAINT faculty_kind_valid CHECK(kind IN ('faculty','institute'));
--> statement-breakpoint
CREATE INDEX catalogue_faculty_idx ON catalogue(faculty_id);
--> statement-breakpoint
CREATE INDEX application_faculty_idx ON applications(faculty_id);
--> statement-breakpoint
INSERT INTO pages(id,page_key,title,route,icon,urutan) VALUES('faculties','faculties','Faculties & institutes','/?page=faculties','Building2',35) ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO page_grants(page_id,level_id,actions) VALUES('faculties','admin','["view","create","edit","manage"]'::jsonb),('faculties','staff','["view"]'::jsonb) ON CONFLICT DO NOTHING;
