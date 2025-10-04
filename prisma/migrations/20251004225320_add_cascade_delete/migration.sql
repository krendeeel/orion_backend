-- DropForeignKey
ALTER TABLE "public"."Field" DROP CONSTRAINT "Field_baseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Option" DROP CONSTRAINT "Option_fieldId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Record" DROP CONSTRAINT "Record_baseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Value" DROP CONSTRAINT "Value_fieldId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Value" DROP CONSTRAINT "Value_recordId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Field" ADD CONSTRAINT "Field_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "public"."Base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Option" ADD CONSTRAINT "Option_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "public"."Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Record" ADD CONSTRAINT "Record_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "public"."Base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Value" ADD CONSTRAINT "Value_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "public"."Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Value" ADD CONSTRAINT "Value_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "public"."Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;
