-- Inventory module additions (idempotent)
CREATE TABLE IF NOT EXISTS "SupplierBusiness" (
  "id" String NOT NULL,
  "tenantId" String NOT NULL,
  "supplierId" String NOT NULL,
  "businessName" String NOT NULL,
  "tin" String?,
  "businessRegNo" String?,
  "isPrimary" Boolean NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierBusiness_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupplierBusiness_tenantId_idx" ON "SupplierBusiness"("tenantId");
CREATE INDEX IF NOT EXISTS "SupplierBusiness_supplierId_idx" ON "SupplierBusiness"("supplierId");

ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "fields" JSONB;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "termsDays" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "specs" JSONB;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "termsDays" INTEGER;

-- FKs (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'SupplierBusiness_tenantId_fkey' AND table_name = 'SupplierBusiness'
  ) THEN
    ALTER TABLE "SupplierBusiness" ADD CONSTRAINT "SupplierBusiness_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'SupplierBusiness_supplierId_fkey' AND table_name = 'SupplierBusiness'
  ) THEN
    ALTER TABLE "SupplierBusiness" ADD CONSTRAINT "SupplierBusiness_supplierId_fkey"
      FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
