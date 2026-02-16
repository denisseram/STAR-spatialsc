/**
 * Data loading utilities for Astro
 * These functions are used during build time to load and process data
 */

import fs from "fs";
import path from "path";

const OUTPUT_DIR = "./public/data";

/**
 * Load all quotation data from JSON files
 * @returns {Array} Array of quotation objects
 */
export function loadQuotations() {
  const quotationsDir = path.join(OUTPUT_DIR, "content", "quotations");
  const quotationFiles = fs.readdirSync(quotationsDir);
  
  return quotationFiles.map((file) => {
    const content = fs.readFileSync(path.join(quotationsDir, file), "utf-8");
    return JSON.parse(content);
  });
}

/**
 * Load all code metadata from JSON files
 * @returns {Object} Map of code GUID to code object
 */
export function loadCodeMap() {
  const codesDir = path.join(OUTPUT_DIR, "content", "codes");
  const codeFiles = fs.readdirSync(codesDir);
  
  const codes = codeFiles.map((file) => {
    const content = fs.readFileSync(path.join(codesDir, file), "utf-8");
    return JSON.parse(content);
  });
  
  return Object.fromEntries(codes.map((c) => [c.guid, c]));
}

/**
 * Load all source metadata from JSON files
 * @returns {Object} Map of source GUID to source object
 */
export function loadSourceMap() {
  const sourcesDir = path.join(OUTPUT_DIR, "content", "sources");
  const sourceFiles = fs.readdirSync(sourcesDir);
  
  const sources = sourceFiles.map((file) => {
    const content = fs.readFileSync(path.join(sourcesDir, file), "utf-8");
    return JSON.parse(content);
  });
  
  return Object.fromEntries(sources.map((s) => [s.guid, s]));
}

/**
 * Extract figure data from quotations with code and source information
 * @param {Array} quotations - Array of quotation objects
 * @param {Object} codeMap - Map of code GUID to code object
 * @param {Object} sourceMap - Map of source GUID to source object
 * @param {string} baseUrl - Base URL for image paths
 * @returns {Array} Array of processed figure objects
 */
export function extractFigureData(quotations, codeMap, sourceMap, baseUrl) {
  return quotations
    .filter((q) => q.Coding && q.Coding.length > 0)
    .map((quotation) => {
      const codingArray = Array.isArray(quotation.Coding)
        ? quotation.Coding
        : [quotation.Coding];
      
      const codeGuids = codingArray.map((c) => c.CodeRef.attrs.targetGUID);
      const codeNames = codeGuids.map((guid) => codeMap[guid]?.name || "Unknown");
      
      // Get source info including bibliography
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
        imagePath: `${baseUrl}data/images/${quotation.source_guid}/${quotation.attrs.guid}.png`,
        // Add bibliography fields
        citation: bibliography?.citation || null,
        paperTitle: bibliography?.title || null,
        paperUrl: bibliography?.url || null,
        year: bibliography?.year || null,
      };
    });
}

/**
 * Process base URL to ensure proper formatting
 * Ensures BASE_URL always ends with a single trailing slash
 * @param {string} baseUrl - Base URL from import.meta.env.BASE_URL
 * @returns {string} Normalized base URL
 */
export function normalizeBaseUrl(baseUrl) {
  const _base = baseUrl || "/";
  return _base.endsWith("/") ? _base : _base + "/";
}
