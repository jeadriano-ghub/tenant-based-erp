-- Idempotent seed: computer retail store demo data
DO $$
DECLARE
  tid text;
  pc_parts_id text;
  cpu_id text;
  periph_id text;
  storage_id text;
  disp_id text;
  net_id text;
  office_id text;
BEGIN
  SELECT id INTO tid FROM "Tenant" LIMIT 1;
  IF tid IS NULL THEN
    RAISE NOTICE 'No tenant found; skipping seed.';
    RETURN;
  END IF;

  INSERT INTO "Category" (id, "tenantId", name, "isActive", "createdAt", "updatedAt") VALUES
    (gen_random_uuid(), tid, 'PC Parts', true, now(), now()) ON CONFLICT DO NOTHING;
  INSERT INTO "Category" (id, "tenantId", name, "isActive", "createdAt", "updatedAt") VALUES
    (gen_random_uuid(), tid, 'Peripherals', true, now(), now()) ON CONFLICT DO NOTHING;
  INSERT INTO "Category" (id, "tenantId", name, "isActive", "createdAt", "updatedAt") VALUES
    (gen_random_uuid(), tid, 'Storage', true, now(), now()) ON CONFLICT DO NOTHING;
  INSERT INTO "Category" (id, "tenantId", name, "isActive", "createdAt", "updatedAt") VALUES
    (gen_random_uuid(), tid, 'Displays', true, now(), now()) ON CONFLICT DO NOTHING;
  INSERT INTO "Category" (id, "tenantId", name, "isActive", "createdAt", "updatedAt") VALUES
    (gen_random_uuid(), tid, 'Networking', true, now(), now()) ON CONFLICT DO NOTHING;
  INSERT INTO "Category" (id, "tenantId", name, "isActive", "createdAt", "updatedAt") VALUES
    (gen_random_uuid(), tid, 'Office Supplies', true, now(), now()) ON CONFLICT DO NOTHING;

  SELECT id INTO pc_parts_id FROM "Category" WHERE "tenantId" = tid AND name = 'PC Parts';
  SELECT id INTO periph_id FROM "Category" WHERE "tenantId" = tid AND name = 'Peripherals';
  SELECT id INTO storage_id FROM "Category" WHERE "tenantId" = tid AND name = 'Storage';
  SELECT id INTO disp_id FROM "Category" WHERE "tenantId" = tid AND name = 'Displays';
  SELECT id INTO net_id FROM "Category" WHERE "tenantId" = tid AND name = 'Networking';
  SELECT id INTO office_id FROM "Category" WHERE "tenantId" = tid AND name = 'Office Supplies';

  INSERT INTO "Category" (id, "tenantId", name, "parentId", "isActive", fields, "createdAt", "updatedAt")
  SELECT gen_random_uuid(), tid, 'CPU', pc_parts_id, true,
    '[
      {"key":"clock_speed","label":"Clock Speed","type":"text","required":true,"status":"active"},
      {"key":"cores","label":"Cores","type":"number","required":true,"status":"active"},
      {"key":"threads","label":"Threads","type":"number","required":false,"status":"active"},
      {"key":"socket","label":"Socket","type":"select","required":true,"options":["LGA1700","AM5","AM4","LGA1200"],"status":"active"},
      {"key":"cache","label":"Cache","type":"text","required":false,"status":"active"},
      {"key":"tdp","label":"TDP (W)","type":"number","required":false,"status":"active"},
      {"key":"integrated_graphics","label":"Integrated Graphics","type":"text","required":false,"status":"active"}
    ]'::jsonb, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "tenantId" = tid AND name = 'CPU' AND "parentId" = pc_parts_id);
  SELECT id INTO cpu_id FROM "Category" WHERE "tenantId" = tid AND name = 'CPU' AND "parentId" = pc_parts_id;

  INSERT INTO "Category" (id, "tenantId", name, "parentId", "isActive", "createdAt", "updatedAt") SELECT gen_random_uuid(), tid, 'Keyboard', periph_id, true, now(), now() WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "tenantId"=tid AND name='Keyboard' AND "parentId"=periph_id);
  INSERT INTO "Category" (id, "tenantId", name, "parentId", "isActive", "createdAt", "updatedAt") SELECT gen_random_uuid(), tid, 'Mouse', periph_id, true, now(), now() WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "tenantId"=tid AND name='Mouse' AND "parentId"=periph_id);
  INSERT INTO "Category" (id, "tenantId", name, "parentId", "isActive", "createdAt", "updatedAt") SELECT gen_random_uuid(), tid, 'SSD', storage_id, true, now(), now() WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "tenantId"=tid AND name='SSD' AND "parentId"=storage_id);
  INSERT INTO "Category" (id, "tenantId", name, "parentId", "isActive", "createdAt", "updatedAt") SELECT gen_random_uuid(), tid, 'HDD', storage_id, true, now(), now() WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "tenantId"=tid AND name='HDD' AND "parentId"=storage_id);
  INSERT INTO "Category" (id, "tenantId", name, "parentId", "isActive", "createdAt", "updatedAt") SELECT gen_random_uuid(), tid, 'Monitor', disp_id, true, now(), now() WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "tenantId"=tid AND name='Monitor' AND "parentId"=disp_id);
  INSERT INTO "Category" (id, "tenantId", name, "parentId", "isActive", "createdAt", "updatedAt") SELECT gen_random_uuid(), tid, 'Router', net_id, true, now(), now() WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "tenantId"=tid AND name='Router' AND "parentId"=net_id);

  INSERT INTO "Brand" (id, "tenantId", name, "createdAt", "updatedAt") VALUES (gen_random_uuid(), tid, 'Intel', now(), now()) ON CONFLICT ("tenantId", name) DO NOTHING;
  INSERT INTO "Brand" (id, "tenantId", name, "createdAt", "updatedAt") VALUES (gen_random_uuid(), tid, 'AMD', now(), now()) ON CONFLICT ("tenantId", name) DO NOTHING;
  INSERT INTO "Brand" (id, "tenantId", name, "createdAt", "updatedAt") VALUES (gen_random_uuid(), tid, 'ASUS', now(), now()) ON CONFLICT ("tenantId", name) DO NOTHING;
  INSERT INTO "Brand" (id, "tenantId", name, "createdAt", "updatedAt") VALUES (gen_random_uuid(), tid, 'Western Digital', now(), now()) ON CONFLICT ("tenantId", name) DO NOTHING;
  INSERT INTO "Brand" (id, "tenantId", name, "createdAt", "updatedAt") VALUES (gen_random_uuid(), tid, 'Samsung', now(), now()) ON CONFLICT ("tenantId", name) DO NOTHING;
  INSERT INTO "Brand" (id, "tenantId", name, "createdAt", "updatedAt") VALUES (gen_random_uuid(), tid, 'TP-Link', now(), now()) ON CONFLICT ("tenantId", name) DO NOTHING;
  INSERT INTO "Brand" (id, "tenantId", name, "createdAt", "updatedAt") VALUES (gen_random_uuid(), tid, 'Logitech', now(), now()) ON CONFLICT ("tenantId", name) DO NOTHING;
  INSERT INTO "Brand" (id, "tenantId", name, "createdAt", "updatedAt") VALUES (gen_random_uuid(), tid, 'HP', now(), now()) ON CONFLICT ("tenantId", name) DO NOTHING;

  INSERT INTO "Product" (id, "tenantId", "categoryId", "brandId", sku, name, description, "productType", "unitOfMeasure", "costPrice", "sellingPrice", "isActive", specs, "createdAt", "updatedAt")
  SELECT gen_random_uuid(), tid, cpu_id, (SELECT id FROM "Brand" WHERE "tenantId"=tid AND name='Intel'), 'CPU-I5-13600K', 'Intel Core i5-13600K', '14-core desktop processor', 'NON_SERIALIZED', 'pc', 16500, 19900, true,
    '[{"key":"clock_speed","value":"3.5 GHz"},{"key":"cores","value":"14"},{"key":"threads","value":"20"},{"key":"socket","value":"LGA1700"},{"key":"cache","value":"24MB"},{"key":"tdp","value":"181"},{"key":"integrated_graphics","value":"UHD 770"}]'::jsonb, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM "Product" WHERE "tenantId"=tid AND sku='CPU-I5-13600K');

  INSERT INTO "Product" (id, "tenantId", "categoryId", "brandId", sku, name, description, "productType", "unitOfMeasure", "costPrice", "sellingPrice", "isActive", specs, "createdAt", "updatedAt")
  SELECT gen_random_uuid(), tid, cpu_id, (SELECT id FROM "Brand" WHERE "tenantId"=tid AND name='AMD'), 'CPU-R5-7600X', 'AMD Ryzen 5 7600X', '6-core gaming processor', 'NON_SERIALIZED', 'pc', 12500, 15900, true,
    '[{"key":"clock_speed","value":"4.7 GHz"},{"key":"cores","value":"6"},{"key":"threads","value":"12"},{"key":"socket","value":"AM5"},{"key":"cache","value":"32MB"},{"key":"tdp","value":"105"},{"key":"integrated_graphics","value":"RDNA 2"}]'::jsonb, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM "Product" WHERE "tenantId"=tid AND sku='CPU-R5-7600X');

  INSERT INTO "Product" (id, "tenantId", "categoryId", "brandId", sku, name, description, "productType", "unitOfMeasure", "costPrice", "sellingPrice", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), tid, (SELECT id FROM "Category" WHERE "tenantId"=tid AND name='SSD' AND "parentId"=storage_id), (SELECT id FROM "Brand" WHERE "tenantId"=tid AND name='Western Digital'), 'SSD-WD-1TB', 'WD Blue SN570 1TB NVMe SSD', 'PCIe Gen3 NVMe', 'NON_SERIALIZED', 'pc', 3200, 3990, true, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM "Product" WHERE "tenantId"=tid AND sku='SSD-WD-1TB');

  INSERT INTO "Product" (id, "tenantId", "categoryId", "brandId", sku, name, description, "productType", "unitOfMeasure", "costPrice", "sellingPrice", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), tid, (SELECT id FROM "Category" WHERE "tenantId"=tid AND name='Monitor' AND "parentId"=disp_id), (SELECT id FROM "Brand" WHERE "tenantId"=tid AND name='Samsung'), 'MON-SAM-24', 'Samsung 24" FHD Monitor', '1920x1080 75Hz', 'NON_SERIALIZED', 'pc', 4500, 5990, true, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM "Product" WHERE "tenantId"=tid AND sku='MON-SAM-24');

  INSERT INTO "Product" (id, "tenantId", "categoryId", "brandId", sku, name, description, "productType", "unitOfMeasure", "costPrice", "sellingPrice", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), tid, (SELECT id FROM "Category" WHERE "tenantId"=tid AND name='Router' AND "parentId"=net_id), (SELECT id FROM "Brand" WHERE "tenantId"=tid AND name='TP-Link'), 'RTR-TP-AC1200', 'TP-Link AC1200 Dual-Band Router', 'Wi-Fi 5 router', 'NON_SERIALIZED', 'pc', 1200, 1790, true, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM "Product" WHERE "tenantId"=tid AND sku='RTR-TP-AC1200');

  INSERT INTO "Product" (id, "tenantId", "categoryId", "brandId", sku, name, description, "productType", "unitOfMeasure", "costPrice", "sellingPrice", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), tid, (SELECT id FROM "Category" WHERE "tenantId"=tid AND name='Keyboard' AND "parentId"=periph_id), (SELECT id FROM "Brand" WHERE "tenantId"=tid AND name='Logitech'), 'KB-LOGI-K120', 'Logitech K120 Keyboard', 'Wired USB keyboard', 'NON_SERIALIZED', 'pc', 650, 990, true, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM "Product" WHERE "tenantId"=tid AND sku='KB-LOGI-K120');

  INSERT INTO "Product" (id, "tenantId", "categoryId", "brandId", sku, name, description, "productType", "unitOfMeasure", "costPrice", "sellingPrice", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), tid, (SELECT id FROM "Category" WHERE "tenantId"=tid AND name='Mouse' AND "parentId"=periph_id), (SELECT id FROM "Brand" WHERE "tenantId"=tid AND name='Logitech'), 'MS-LOGI-M170', 'Logitech M170 Wireless Mouse', '2.4GHz wireless', 'NON_SERIALIZED', 'pc', 450, 790, true, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM "Product" WHERE "tenantId"=tid AND sku='MS-LOGI-M170');

  INSERT INTO "Product" (id, "tenantId", "categoryId", "brandId", sku, name, description, "productType", "unitOfMeasure", "costPrice", "sellingPrice", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), tid, office_id, (SELECT id FROM "Brand" WHERE "tenantId"=tid AND name='HP'), 'OFF-HP-A4', 'HP A4 Bond Paper 500s', '80gsm copy paper', 'NON_SERIALIZED', 'ream', 180, 250, true, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM "Product" WHERE "tenantId"=tid AND sku='OFF-HP-A4');

  RAISE NOTICE 'Seed complete for tenant %.', tid;
END $$;
