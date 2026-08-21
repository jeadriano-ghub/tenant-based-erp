-- Seed suppliers (with multiple business names/TINs) + more brands
DO $$
DECLARE
  tid text;
  s1 text; s2 text; s3 text; s4 text; s5 text;
BEGIN
  SELECT id INTO tid FROM "Tenant" LIMIT 1;
  IF tid IS NULL THEN RAISE NOTICE 'No tenant; skip.'; RETURN; END IF;

  -- Brands (idempotent)
  INSERT INTO "Brand" (id,"tenantId",name,"createdAt","updatedAt") VALUES (gen_random_uuid(),tid,'Seagate',now(),now()) ON CONFLICT ("tenantId",name) DO NOTHING;
  INSERT INTO "Brand" (id,"tenantId",name,"createdAt","updatedAt") VALUES (gen_random_uuid(),tid,'Corsair',now(),now()) ON CONFLICT ("tenantId",name) DO NOTHING;
  INSERT INTO "Brand" (id,"tenantId",name,"createdAt","updatedAt") VALUES (gen_random_uuid(),tid,'Gigabyte',now(),now()) ON CONFLICT ("tenantId",name) DO NOTHING;
  INSERT INTO "Brand" (id,"tenantId",name,"createdAt","updatedAt") VALUES (gen_random_uuid(),tid,'MSI',now(),now()) ON CONFLICT ("tenantId",name) DO NOTHING;
  INSERT INTO "Brand" (id,"tenantId",name,"createdAt","updatedAt") VALUES (gen_random_uuid(),tid,'Kingston',now(),now()) ON CONFLICT ("tenantId",name) DO NOTHING;
  INSERT INTO "Brand" (id,"tenantId",name,"createdAt","updatedAt") VALUES (gen_random_uuid(),tid,'Crucial',now(),now()) ON CONFLICT ("tenantId",name) DO NOTHING;
  INSERT INTO "Brand" (id,"tenantId",name,"createdAt","updatedAt") VALUES (gen_random_uuid(),tid,'ViewSonic',now(),now()) ON CONFLICT ("tenantId",name) DO NOTHING;
  INSERT INTO "Brand" (id,"tenantId",name,"createdAt","updatedAt") VALUES (gen_random_uuid(),tid,'D-Link',now(),now()) ON CONFLICT ("tenantId",name) DO NOTHING;

  -- Suppliers (unique tenant+name)
  INSERT INTO "Supplier" (id,"tenantId",name,"contactPerson",email,"contactNo","addressLine1",city,"tin","businessRegNo","termsDays","isActive","createdAt","updatedAt")
  VALUES (gen_random_uuid(),tid,'PC Central Trading','Juan Dela Cruz','juan@pccentral.ph','09171234567','123 Gil Puyat Ave','Makati','123-456-789-000','CN-2010-12345',30,true,now(),now())
  ON CONFLICT ("tenantId",name) DO NOTHING;
  SELECT id INTO s1 FROM "Supplier" WHERE "tenantId"=tid AND name='PC Central Trading';

  INSERT INTO "Supplier" (id,"tenantId",name,"contactPerson",email,"contactNo","addressLine1",city,"tin","businessRegNo","termsDays","isActive","createdAt","updatedAt")
  VALUES (gen_random_uuid(),tid,'TechSource Inc.','Maria Santos','maria@techsource.ph','09179876543','88 Quezon Ave','Quezon City','987-654-321-000','CN-2008-98765',15,true,now(),now())
  ON CONFLICT ("tenantId",name) DO NOTHING;
  SELECT id INTO s2 FROM "Supplier" WHERE "tenantId"=tid AND name='TechSource Inc.';

  INSERT INTO "Supplier" (id,"tenantId",name,"contactPerson",email,"contactNo","addressLine1",city,"tin","businessRegNo","termsDays","isActive","createdAt","updatedAt")
  VALUES (gen_random_uuid(),tid,'Gadget Wholesale','Pedro Reyes','pedro@gadget.ph','09173334444','45 Escolta St','Manila','111-222-333-000','CN-2015-54321',45,true,now(),now())
  ON CONFLICT ("tenantId",name) DO NOTHING;
  SELECT id INTO s3 FROM "Supplier" WHERE "tenantId"=tid AND name='Gadget Wholesale';

  INSERT INTO "Supplier" (id,"tenantId",name,"contactPerson",email,"contactNo","addressLine1",city,"tin","businessRegNo","termsDays","isActive","createdAt","updatedAt")
  VALUES (gen_random_uuid(),tid,'Prime Components','Ana Cruz','ana@primecomp.ph','09175556666','9 Ayala Blvd','Pasay','444-555-666-000','CN-2012-11122',7,true,now(),now())
  ON CONFLICT ("tenantId",name) DO NOTHING;
  SELECT id INTO s4 FROM "Supplier" WHERE "tenantId"=tid AND name='Prime Components';

  INSERT INTO "Supplier" (id,"tenantId",name,"contactPerson",email,"contactNo","addressLine1",city,"tin","businessRegNo","termsDays","isActive","createdAt","updatedAt")
  VALUES (gen_random_uuid(),tid,'NetLink Distributors','Bob Martin','bob@netlink.ph','09178889999','200 Roxas Blvd','Paranaque','777-888-999-000','CN-2019-33344',60,true,now(),now())
  ON CONFLICT ("tenantId",name) DO NOTHING;
  SELECT id INTO s5 FROM "Supplier" WHERE "tenantId"=tid AND name='NetLink Distributors';

  -- SupplierBusiness rows (multiple trade names / TINs per supplier)
  INSERT INTO "SupplierBusiness" (id,"tenantId","supplierId","businessName","tin","businessRegNo","createdAt","updatedAt")
  SELECT gen_random_uuid(),tid,s1,'PC Central Trading','123-456-789-000','CN-2010-12345',now(),now()
  WHERE s1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "SupplierBusiness" WHERE "tenantId"=tid AND "supplierId"=s1 AND "businessName"='PC Central Trading');

  INSERT INTO "SupplierBusiness" (id,"tenantId","supplierId","businessName","tin","businessRegNo","createdAt","updatedAt")
  SELECT gen_random_uuid(),tid,s1,'PC Central Makati Branch','123-456-789-001','CN-2010-12346',now(),now()
  WHERE s1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "SupplierBusiness" WHERE "tenantId"=tid AND "supplierId"=s1 AND "businessName"='PC Central Makati Branch');

  INSERT INTO "SupplierBusiness" (id,"tenantId","supplierId","businessName","tin","businessRegNo","createdAt","updatedAt")
  SELECT gen_random_uuid(),tid,s2,'TechSource Inc.','987-654-321-000','CN-2008-98765',now(),now()
  WHERE s2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "SupplierBusiness" WHERE "tenantId"=tid AND "supplierId"=s2 AND "businessName"='TechSource Inc.');

  INSERT INTO "SupplierBusiness" (id,"tenantId","supplierId","businessName","tin","businessRegNo","createdAt","updatedAt")
  SELECT gen_random_uuid(),tid,s2,'TechSource Retail','987-654-321-001','CN-2008-98766',now(),now()
  WHERE s2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "SupplierBusiness" WHERE "tenantId"=tid AND "supplierId"=s2 AND "businessName"='TechSource Retail');

  INSERT INTO "SupplierBusiness" (id,"tenantId","supplierId","businessName","tin","businessRegNo","createdAt","updatedAt")
  SELECT gen_random_uuid(),tid,s3,'Gadget Wholesale','111-222-333-000','CN-2015-54321',now(),now()
  WHERE s3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "SupplierBusiness" WHERE "tenantId"=tid AND "supplierId"=s3 AND "businessName"='Gadget Wholesale');

  INSERT INTO "SupplierBusiness" (id,"tenantId","supplierId","businessName","tin","businessRegNo","createdAt","updatedAt")
  SELECT gen_random_uuid(),tid,s3,'Gadget Express','111-222-333-001','CN-2015-54322',now(),now()
  WHERE s3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "SupplierBusiness" WHERE "tenantId"=tid AND "supplierId"=s3 AND "businessName"='Gadget Express');

  INSERT INTO "SupplierBusiness" (id,"tenantId","supplierId","businessName","tin","businessRegNo","createdAt","updatedAt")
  SELECT gen_random_uuid(),tid,s4,'Prime Components','444-555-666-000','CN-2012-11122',now(),now()
  WHERE s4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "SupplierBusiness" WHERE "tenantId"=tid AND "supplierId"=s4 AND "businessName"='Prime Components');

  INSERT INTO "SupplierBusiness" (id,"tenantId","supplierId","businessName","tin","businessRegNo","createdAt","updatedAt")
  SELECT gen_random_uuid(),tid,s5,'NetLink Distributors','777-888-999-000','CN-2019-33344',now(),now()
  WHERE s5 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "SupplierBusiness" WHERE "tenantId"=tid AND "supplierId"=s5 AND "businessName"='NetLink Distributors');

  INSERT INTO "SupplierBusiness" (id,"tenantId","supplierId","businessName","tin","businessRegNo","createdAt","updatedAt")
  SELECT gen_random_uuid(),tid,s5,'NetLink Cable Systems','777-888-999-001','CN-2019-33345',now(),now()
  WHERE s5 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "SupplierBusiness" WHERE "tenantId"=tid AND "supplierId"=s5 AND "businessName"='NetLink Cable Systems');

  RAISE NOTICE 'Suppliers + brands seeded for tenant %.', tid;
END $$;
