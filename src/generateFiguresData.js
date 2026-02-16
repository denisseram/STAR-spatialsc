import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const OUTPUT_DIR = "./public/data";
const EXTERNAL_BASE_URL = "https://drive.google.com/drive/folders/1xnupuURsslGGNMmCKGUaY4Clitt4amTi?usp=sharing"; 

// Read all the JSON files
const quotationsDir = path.join(OUTPUT_DIR, "content", "quotations");
const codesDir = path.join(OUTPUT_DIR, "content", "codes");
const sourcesDir = path.join(OUTPUT_DIR, "content", "sources");

// Load quotations
const quotationFiles = fs.readdirSync(quotationsDir);
const quotations = quotationFiles.map((file) => {
  const content = fs.readFileSync(path.join(quotationsDir, file), "utf-8");
  return JSON.parse(content);
});

// Load codes
const codeFiles = fs.readdirSync(codesDir);
const codes = codeFiles.map((file) => {
  const content = fs.readFileSync(path.join(codesDir, file), "utf-8");
  return JSON.parse(content);
});

// Load sources
const sourceFiles = fs.readdirSync(sourcesDir);
const sources = sourceFiles.map((file) => {
  const content = fs.readFileSync(path.join(sourcesDir, file), "utf-8");
  return JSON.parse(content);
});

// Create lookup maps
const codeMap = Object.fromEntries(codes.map((c) => [c.guid, c]));
const sourceMap = Object.fromEntries(sources.map((s) => [s.guid, s]));

// Prepare data
const figuresData = quotations
  .filter((q) => q.Coding && q.Coding.length > 0)
  .map((quotation) => {
    const codingArray = Array.isArray(quotation.Coding)
      ? quotation.Coding
      : [quotation.Coding];
    const codeGuids = codingArray.map((c) => c.CodeRef.attrs.targetGUID);
    const codeNames = codeGuids.map((guid) => codeMap[guid]?.name || "Unknown");
    
    const source = sourceMap[quotation.source_guid];
    const bibliography = source?.bibliography;

    return {
      guid: quotation.attrs.guid,
      name: quotation.attrs.name,
      sourceGuid: quotation.source_guid,
      sourceName: source?.name || "Unknown",
      subfigNum: quotation.subfig_num,
      codes: codeNames,
      codeGuids: codeGuids,
      // Use external URL for images
      imagePath: `${EXTERNAL_BASE_URL}${quotation.source_guid}/${quotation.attrs.guid}.png`,
      citation: bibliography?.citation || null,
      paperTitle: bibliography?.title || null,
      paperUrl: bibliography?.url || null,
      year: bibliography?.year || null,
    };
  });

// Write to file
const outputPath = path.join(__dirname, '..', 'figuresData.json');
fs.writeFileSync(outputPath, JSON.stringify(figuresData, null, 2));

console.log(`Generated figuresData.json with ${figuresData.length} figures`);
console.log(` Saved to: ${outputPath}`);