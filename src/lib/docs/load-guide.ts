import fs from "fs/promises";
import path from "path";

export async function loadConnectorSetupGuide(): Promise<string> {
  const filePath = path.join(process.cwd(), "CONNECTOR_SETUP.md");
  return fs.readFile(filePath, "utf-8");
}
