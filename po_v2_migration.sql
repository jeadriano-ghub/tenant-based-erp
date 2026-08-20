-- Purchase Order enhancements (idempotent, plain PostgreSQL)
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "globalTaxRate" double precision NOT NULL DEFAULT 0;

ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "remarks" text;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "taxExempt" boolean NOT NULL DEFAULT false;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "taxRate" double precision;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "taxAmount" double precision NOT NULL DEFAULT 0;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "subtotal" double precision NOT NULL DEFAULT 0;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "supplierCreditApplied" double precision NOT NULL DEFAULT 0;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "earnedCredit" double precision NOT NULL DEFAULT 0;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "earnedCreditScope" text;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "earnedCreditCategoryIds" jsonb;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "earnedCreditProductIds" jsonb;
