-- Custom SQL migration file, put your code below! --
INSERT INTO app_settings(key,value)
SELECT 'template_faculties',jsonb_build_object('ftmk-conditional-v1',id::text)
FROM faculties WHERE code='FTMK'
ON CONFLICT(key) DO NOTHING;
