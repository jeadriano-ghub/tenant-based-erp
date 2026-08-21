-- Seed products: flip CPU to SERIALIZED; add NON_SERIALIZED (fans, RJ45, LAN cable Cat5) and BARCODE (LAN cables)
DO $$
DECLARE
  tid text;
  intel_id text; amd_id text; noctu_id text; tp_id text; ubiq_id text;
  cpu_id text; fan_id text; rj45_id text; cat5_id text;
  cpu_sub_id text; periph_id text; net_id text; cable_id text;
  p1 text; p2 text; p3 text;
BEGIN
  SELECT id INTO tid FROM "Tenant" LIMIT 1;
  IF tid IS NULL THEN RAISE NOTICE 'No tenant; skip.'; RETURN; END IF;

  SELECT id INTO intel_id FROM "Brand" WHERE "tenantId"=tid AND name='Intel';
  SELECT id INTO amd_id   FROM "Brand" WHERE "tenantId"=tid AND name='AMD';
  SELECT id INTO noctu_id FROM "Brand" WHERE "tenantId"=tid AND name='Noctua';
  SELECT id INTO tp_id    FROM "Brand" WHERE "tenantId"=tid AND name='TP-Link';
  SELECT id INTO ubiq_id  FROM "Brand" WHERE "tenantId"=tid AND name='Ubiquiti';

  -- Subcategory: PC Parts > CPU
  SELECT c.id INTO cpu_sub_id FROM "Category" c WHERE "tenantId"=tid AND name='CPU' AND "parentId" IS NOT NULL LIMIT 1;
  -- Subcategory: Peripherals (main) > ... we'll just use any sub under Peripherals for fan/rj45; fallback to CPU sub not appropriate.
  SELECT c.id INTO periph_id FROM "Category" c WHERE "tenantId"=tid AND name='Peripherals' AND "parentId" IS NULL LIMIT 1;
  SELECT c.id INTO net_id    FROM "Category" c WHERE "tenantId"=tid AND name='Networking' AND "parentId" IS NULL LIMIT 1;

  -- Fans / cooling sub (under PC Parts) or use CPU sub's parent (PC Parts). Use PC Parts main for fans.
  -- Simpler: put fans under Peripherals (or PC Parts). We'll create under PC Parts main if exists.
  SELECT c.id INTO cable_id FROM "Category" c WHERE "tenantId"=tid AND name='Cables' AND "parentId" IS NOT NULL LIMIT 1;

  -- 1) Flip CPU-I5-13600K to SERIALIZED (idempotent: only if currently different)
  UPDATE "Product" SET "productType"='SERIALIZED' WHERE "tenantId"=tid AND sku='CPU-I5-13600K' AND "productType" <> 'SERIALIZED';

  -- 2) NON_SERIALIZED: fans, RJ45, LAN cable Cat5
  INSERT INTO "Product" (id,"tenantId","categoryId","brandId",sku,name,description,"productType","unitOfMeasure","costPrice","sellingPrice","isActive","createdAt","updatedAt")
  SELECT gen_random_uuid(),tid, periph_id, noctu_id,'FAN-NF-A12x25','Noctua NF-A12x25 PWM Fan','120mm cooling fan',
         'NON_SERIALIZED','pc',450.00,750.00,true,now(),now()
  WHERE periph_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "tenantId"=tid AND sku='FAN-NF-A12x25');

  INSERT INTO "Product" (id,"tenantId","categoryId","brandId",sku,name,description,"productType","unitOfMeasure","costPrice","sellingPrice","isActive","createdAt","updatedAt")
  SELECT gen_random_uuid(),tid, net_id, tp_id,'RJ45-CAT6-CONN','RJ45 Cat6 Connector','8P8C modular connector',
         'NON_SERIALIZED','pc',8.00,15.00,true,now(),now()
  WHERE net_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "tenantId"=tid AND sku='RJ45-CAT6-CONN');

  INSERT INTO "Product" (id,"tenantId","categoryId","brandId",sku,name,description,"productType","unitOfMeasure","costPrice","sellingPrice","isActive","createdAt","updatedAt")
  SELECT gen_random_uuid(),tid, net_id, tp_id,'LAN-CAT5E-1M','LAN Cable Cat5e 1m','Ethernet patch cable',
         'NON_SERIALIZED','pc',60.00,120.00,true,now(),now()
  WHERE net_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "tenantId"=tid AND sku='LAN-CAT5E-1M');

  -- 3) BARCODE: LAN cables
  INSERT INTO "Product" (id,"tenantId","categoryId","brandId",sku,name,description,"productType","unitOfMeasure","costPrice","sellingPrice","isActive","createdAt","updatedAt")
  SELECT gen_random_uuid(),tid, net_id, ubiq_id,'LAN-CAT6-2M','LAN Cable Cat6 2m (Barcode)','Barcode-tracked ethernet cable',
         'BARCODE','pc',110.00,210.00,true,now(),now()
  WHERE net_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "tenantId"=tid AND sku='LAN-CAT6-2M');

  INSERT INTO "Product" (id,"tenantId","categoryId","brandId",sku,name,description,"productType","unitOfMeasure","costPrice","sellingPrice","isActive","createdAt","updatedAt")
  SELECT gen_random_uuid(),tid, net_id, ubiq_id,'LAN-CAT6-5M','LAN Cable Cat6 5m (Barcode)','Barcode-tracked ethernet cable',
         'BARCODE','pc',180.00,320.00,true,now(),now()
  WHERE net_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "tenantId"=tid AND sku='LAN-CAT6-5M');

  RAISE NOTICE 'Products seeded for tenant %.', tid;
END $$;
