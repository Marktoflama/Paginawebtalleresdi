/**
 * Writes reservas-taller.xlsx: an empty workbook with real Excel tables named
 * "Registros" and "Reservas", ready to upload to OneDrive/SharePoint for the
 * Microsoft Graph sync. See README › Excel en OneDrive.
 *
 *   npm run excel:template
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { buildTemplateBuffer } from "../src/lib/excel/workbook";

async function main() {
  const out = path.resolve(process.cwd(), "reservas-taller.xlsx");
  await writeFile(out, await buildTemplateBuffer());
  console.log(`✓ ${out}`);
  console.log("Súbelo a OneDrive o SharePoint y copia su driveId e itemId en MS_DRIVE_ID y MS_FILE_ID (README).");
}

main().catch((e) => {
  console.error("✗", (e as Error).message);
  process.exitCode = 1;
});
