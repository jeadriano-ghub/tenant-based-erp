-- Add more PC Parts subcategories with spec fields + seed specs for all subcategories
DO $$
DECLARE
  tid text;
  pc_parts_id text;
  periph_id text;
  storage_id text;
  disp_id text;
  net_id text;
  office_id text;
  brand_intel text; brand_amd text; brand_asus text; brand_gigabyte text;
  brand_corsair text; brand_wd text; brand_samsung text; brand_tp text;
  brand_logi text; brand_hp text; brand_seasonic text; brand_nzxt text;
  brand_nv text; brand_arctic text;
BEGIN
  SELECT id INTO tid FROM "Tenant" LIMIT 1;
  IF tid IS NULL THEN RAISE NOTICE 'No tenant; skip.'; RETURN; END IF;

  SELECT id INTO pc_parts_id FROM "Category" WHERE "tenantId"=tid AND name='PC Parts';
  SELECT id INTO periph_id FROM "Category" WHERE "tenantId"=tid AND name='Peripherals';
  SELECT id INTO storage_id FROM "Category" WHERE "tenantId"=tid AND name='Storage';
  SELECT id INTO disp_id FROM "Category" WHERE "tenantId"=tid AND name='Displays';
  SELECT id INTO net_id FROM "Category" WHERE "tenantId"=tid AND name='Networking';
  SELECT id INTO office_id FROM "Category" WHERE "tenantId"=tid AND name='Office Supplies';

  -- PC Parts subcategories + specs
  INSERT INTO "Category" (id,"tenantId",name,"parentId","isActive",fields,"createdAt","updatedAt")
  SELECT gen_random_uuid(),tid,'Motherboard',pc_parts_id,true,
   '[{"key":"socket","label":"Socket","type":"select","required":true,"options":["LGA1700","AM5","AM4"],"status":"active"},
     {"key":"chipset","label":"Chipset","type":"text","required":false,"status":"active"},
     {"key":"form_factor","label":"Form Factor","type":"select","required":true,"options":["ATX","mATX","ITX"],"status":"active"},
     {"key":"memory_slots","label":"Memory Slots","type":"number","required":false,"status":"active"}]'::jsonb, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "tenantId"=tid AND name='Motherboard' AND "parentId"=pc_parts_id);

  INSERT INTO "Category" (id,"tenantId",name,"parentId","isActive",fields,"createdAt","updatedAt")
  SELECT gen_random_uuid(),tid,'RAM',pc_parts_id,true,
   '[{"key":"capacity","label":"Capacity (GB)","type":"number","required":true,"status":"active"},
     {"key":"speed","label":"Speed (MHz)","type":"number","required":false,"status":"active"},
     {"key":"type","label":"Memory Type","type":"select","required":true,"options":["DDR4","DDR5"],"status":"active"}]'::jsonb, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "tenantId"=tid AND name='RAM' AND "parentId"=pc_parts_id);

  INSERT INTO "Category" (id,"tenantId",name,"parentId","isActive",fields,"createdAt","updatedAt")
  SELECT gen_random_uuid(),tid,'GPU',pc_parts_id,true,
   '[{"key":"vram","label":"VRAM (GB)","type":"number","required":true,"status":"active"},
     {"key":"bus","label":"Bus","type":"select","required":true,"options":["PCIe 4.0","PCIe 5.0"],"status":"active"},
     {"key":"tdp","label":"TDP (W)","type":"number","required":false,"status":"active"},
     {"key":"length_mm","label":"Length (mm)","type":"number","required":false,"status":"active"}]'::jsonb, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "tenantId"=tid AND name='GPU' AND "parentId"=pc_parts_id);

  INSERT INTO "Category" (id,"tenantId",name,"parentId","isActive",fields,"createdAt","updatedAt")
  SELECT gen_random_uuid(),tid,'PSU',pc_parts_id,true,
   '[{"key":"wattage","label":"Wattage (W)","type":"number","required":true,"status":"active"},
     {"key":"rating","label":"Efficiency","type":"select","required":true,"options":["80+ Bronze","80+ Gold","80+ Platinum"],"status":"active"},
     {"key":"modular","label":"Modular","type":"select","required":false,"options":["Full","Semi","Non"],"status":"active"}]'::jsonb, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "tenantId"=tid AND name='PSU' AND "parentId"=pc_parts_id);

  INSERT INTO "Category" (id,"tenantId",name,"parentId","isActive",fields,"createdAt","updatedAt")
  SELECT gen_random_uuid(),tid,'Case',pc_parts_id,true,
   '[{"key":"form_factor","label":"Supported Form Factor","type":"select","required":true,"options":["ATX","mATX","ITX"],"status":"active"},
     {"key":"color","label":"Color","type":"text","required":false,"status":"active"}]'::jsonb, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "tenantId"=tid AND name='Case' AND "parentId"=pc_parts_id);

  INSERT INTO "Category" (id,"tenantId",name,"parentId","isActive",fields,"createdAt","updatedAt")
  SELECT gen_random_uuid(),tid,'Cooler',pc_parts_id,true,
   '[{"key":"type","label":"Type","type":"select","required":true,"options":["Air","AIO Liquid"],"status":"active"},
     {"key":"socket_support","label":"Socket Support","type":"text","required":false,"status":"active"},
     {"key":"height_mm","label":"Height (mm)","type":"number","required":false,"status":"active"}]'::jsonb, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "tenantId"=tid AND name='Cooler' AND "parentId"=pc_parts_id);

  -- Add specs to existing subcategories under other mains
  UPDATE "Category" SET fields=
   '[{"key":"switch_type","label":"Switch Type","type":"select","required":false,"options":["Mechanical","Membrane"],"status":"active"},
     {"key":"layout","label":"Layout","type":"text","required":false,"status":"active"}]'::jsonb, "updatedAt"=now()
  WHERE "tenantId"=tid AND name='Keyboard' AND "parentId"=periph_id AND (fields IS NULL OR fields::text='[]');

  UPDATE "Category" SET fields=
   '[{"key":"dpi","label":"DPI","type":"number","required":false,"status":"active"},
     {"key":"connectivity","label":"Connectivity","type":"select","required":false,"options":["Wired","Wireless","Bluetooth"],"status":"active"}]'::jsonb, "updatedAt"=now()
  WHERE "tenantId"=tid AND name='Mouse' AND "parentId"=periph_id AND (fields IS NULL OR fields::text='[]');

  UPDATE "Category" SET fields=
   '[{"key":"capacity","label":"Capacity (GB)","type":"number","required":true,"status":"active"},
     {"key":"interface","label":"Interface","type":"select","required":true,"options":["SATA","NVMe"],"status":"active"},
     {"key":"read_speed","label":"Read (MB/s)","type":"number","required":false,"status":"active"}]'::jsonb, "updatedAt"=now()
  WHERE "tenantId"=tid AND name='SSD' AND "parentId"=storage_id AND (fields IS NULL OR fields::text='[]');

  UPDATE "Category" SET fields=
   '[{"key":"capacity","label":"Capacity (GB)","type":"number","required":true,"status":"active"},
     {"key":"rpm","label":"RPM","type":"number","required":false,"status":"active"}]'::jsonb, "updatedAt"=now()
  WHERE "tenantId"=tid AND name='HDD' AND "parentId"=storage_id AND (fields IS NULL OR fields::text='[]');

  UPDATE "Category" SET fields=
   '[{"key":"size_in","label":"Size (inch)","type":"number","required":true,"status":"active"},
     {"key":"resolution","label":"Resolution","type":"text","required":false,"status":"active"},
     {"key":"refresh_hz","label":"Refresh (Hz)","type":"number","required":false,"status":"active"},
     {"key":"panel","label":"Panel","type":"select","required":false,"options":["IPS","VA","TN","OLED"],"status":"active"}]'::jsonb, "updatedAt"=now()
  WHERE "tenantId"=tid AND name='Monitor' AND "parentId"=disp_id AND (fields IS NULL OR fields::text='[]');

  UPDATE "Category" SET fields=
   '[{"key":"wifi_std","label":"Wi-Fi Standard","type":"select","required":true,"options":["Wi-Fi 5","Wi-Fi 6","Wi-Fi 6E"],"status":"active"},
     {"key":"ports","label":"Ports","type":"text","required":false,"status":"active"},
     {"key":"speed","label":"Speed (Mbps)","type":"number","required":false,"status":"active"}]'::jsonb, "updatedAt"=now()
  WHERE "tenantId"=tid AND name='Router' AND "parentId"=net_id AND (fields IS NULL OR fields::text='[]');

  RAISE NOTICE 'Subcategory specs seeded for tenant %.', tid;
END $$;
