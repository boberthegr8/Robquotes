const PDFJS_URL = 'https://esm.sh/pdfjs-dist@4.10.38/build/pdf.mjs';
const PDFJS_WORKER_URL = 'https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

const SIGNALS: Array<{ key: string; label: string; pattern: RegExp }> = [
  { key: 'cover_sheet', label: 'Cover / title sheet', pattern: /\b(cover sheet|title sheet|drawing index|sheet index)\b/i },
  { key: 'site_plan', label: 'Site plan', pattern: /\b(site plan|plot plan|grading plan)\b/i },
  { key: 'foundation_plan', label: 'Foundation plan', pattern: /\b(foundation plan|footing plan|basement plan)\b/i },
  { key: 'floor_plan', label: 'Floor plan', pattern: /\b(first floor plan|second floor plan|main floor plan|floor plan|level plan)\b/i },
  { key: 'roof_plan', label: 'Roof plan', pattern: /\b(roof plan|roof framing plan)\b/i },
  { key: 'elevations', label: 'Elevations', pattern: /\b(front elevation|rear elevation|left elevation|right elevation|exterior elevations?)\b/i },
  { key: 'sections', label: 'Sections', pattern: /\b(building section|wall section|cross section|sections?)\b/i },
  { key: 'details', label: 'Details', pattern: /\b(construction details?|typical details?|details?)\b/i },
  { key: 'structural', label: 'Structural', pattern: /\b(structural notes?|structural plan|beam schedule|lintel schedule|joist layout)\b/i },
  { key: 'truss', label: 'Truss / roof framing', pattern: /\b(truss layout|truss plan|roof truss|girder truss)\b/i },
  { key: 'window_schedule', label: 'Window schedule', pattern: /\b(window schedule|windows? schedule)\b/i },
  { key: 'door_schedule', label: 'Door schedule', pattern: /\b(door schedule|doors? schedule)\b/i },
  { key: 'finish_schedule', label: 'Finish schedule', pattern: /\b(finish schedule|room finish)\b/i },
  { key: 'general_notes', label: 'General notes', pattern: /\b(general notes?|construction notes?)\b/i },
  { key: 'electrical', label: 'Electrical', pattern: /\b(electrical plan|lighting plan|panel schedule)\b/i },
  { key: 'mechanical', label: 'Mechanical', pattern: /\b(mechanical plan|hvac|duct layout|ventilation)\b/i },
  { key: 'plumbing', label: 'Plumbing', pattern: /\b(plumbing plan|fixture schedule|sanitary plan)\b/i }
];

const ISSUE_PATTERNS: Array<{ key: string; label: string; pattern: RegExp }> = [
  { key: 'permit', label: 'Permit / issued for permit', pattern: /\b(issued for permit|permit drawings?|building permit)\b/i },
  { key: 'construction', label: 'Issued for construction', pattern: /\b(issued for construction|construction issue)\b/i },
  { key: 'revision', label: 'Revision information', pattern: /\b(revision|revised|rev\.?\s*[A-Z0-9]+)\b/i },
  { key: 'not_for_construction', label: 'Not for construction', pattern: /\b(not for construction|preliminary|concept only)\b/i }
];

const SHEET_REGEX = /\b(?:A|S|C|M|E|P|L|G|T|D)[-.]?\d{1,3}(?:\.\d{1,2})?\b/g;
const SCALE_REGEX = /\b(?:scale\s*[:=]?\s*)?(?:1\/\d+|\d+\/\d+)\s*["”]?\s*=\s*\d+'(?:-\d+)?["”]?\b/gi;

export interface ReaderAnalysisOutput {
  parser: string;
  pageCount: number;
  status: 'completed' | 'review';
  extractedData: Record<string, unknown>;
  warnings: string[];
}

function normalizeText(value: string) {
  return value
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function detectSignals(text: string) {
  return SIGNALS.filter(signal => signal.pattern.test(text)).map(signal => ({ key: signal.key, label: signal.label }));
}

function detectIssueSignals(text: string) {
  return ISSUE_PATTERNS.filter(signal => signal.pattern.test(text)).map(signal => ({ key: signal.key, label: signal.label }));
}

function detectSheetNumbers(text: string) {
  return unique((text.toUpperCase().match(SHEET_REGEX) || []).map(value => value.replace('-', '.'))).slice(0, 40);
}

function detectScales(text: string) {
  return unique((text.match(SCALE_REGEX) || []).map(value => value.trim())).slice(0, 12);
}

function extractLikelyTitle(text: string) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length >= 4 && line.length <= 120);
  const ranked = lines.filter(line => SIGNALS.some(signal => signal.pattern.test(line)) || /\b(plan|elevation|section|schedule|details?|notes?)\b/i.test(line));
  return (ranked[0] || lines[0] || '').slice(0, 120);
}

export async function analyzePdfLocally(file: File): Promise<ReaderAnalysisOutput> {
  const pdfjs: any = await import(/* @vite-ignore */ PDFJS_URL);
  if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pages: any[] = [];
  const allSheetNumbers: string[] = [];
  const allScales: string[] = [];
  const allSignalKeys: string[] = [];
  const allIssueKeys: string[] = [];
  let totalCharacters = 0;
  let pagesWithUsefulText = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const rawText = content.items.map((item: any) => typeof item.str === 'string' ? item.str : '').join('\n');
    const normalized = normalizeText(rawText);
    const charCount = normalized.length;
    if (charCount >= 80) pagesWithUsefulText += 1;
    totalCharacters += charCount;

    const signals = detectSignals(normalized);
    const issueSignals = detectIssueSignals(normalized);
    const sheetNumbers = detectSheetNumbers(normalized);
    const scales = detectScales(normalized);
    allSheetNumbers.push(...sheetNumbers);
    allScales.push(...scales);
    allSignalKeys.push(...signals.map(signal => signal.key));
    allIssueKeys.push(...issueSignals.map(signal => signal.key));

    pages.push({
      page: pageNumber,
      title: extractLikelyTitle(normalized),
      character_count: charCount,
      sheet_numbers: sheetNumbers,
      scales,
      signals,
      issue_signals: issueSignals,
      text: normalized.slice(0, 12000),
      text_truncated: normalized.length > 12000
    });
  }

  const coverageRatio = pdf.numPages ? pagesWithUsefulText / pdf.numPages : 0;
  const averageCharacters = pdf.numPages ? Math.round(totalCharacters / pdf.numPages) : 0;
  const warnings: string[] = [];

  if (totalCharacters < 200) warnings.push('Very little machine-readable text was found. This PDF may be scanned/image-only and should be reviewed with the future vision/OCR worker.');
  if (coverageRatio < 0.5 && pdf.numPages > 1) warnings.push(`Only ${pagesWithUsefulText} of ${pdf.numPages} pages contained useful machine-readable text.`);
  if (!allSheetNumbers.length) warnings.push('No architectural/engineering sheet numbers were confidently detected.');
  if (pages.some(page => page.text_truncated)) warnings.push('Long page text was capped at 12,000 characters per page for the Reader v1 Core payload.');

  const status: 'completed' | 'review' = totalCharacters >= 200 && coverageRatio >= 0.5 ? 'completed' : 'review';
  const signalSummary = SIGNALS
    .filter(signal => allSignalKeys.includes(signal.key))
    .map(signal => ({ key: signal.key, label: signal.label, pages: pages.filter(page => page.signals.some((item: any) => item.key === signal.key)).map(page => page.page) }));
  const issueSummary = ISSUE_PATTERNS
    .filter(signal => allIssueKeys.includes(signal.key))
    .map(signal => ({ key: signal.key, label: signal.label, pages: pages.filter(page => page.issue_signals.some((item: any) => item.key === signal.key)).map(page => page.page) }));

  return {
    parser: 'pdfjs-text-signals-v1',
    pageCount: pdf.numPages,
    status,
    warnings,
    extractedData: {
      schema: 'forge.reader.analysis.v1',
      source: 'deterministic_pdf_text',
      filename: file.name,
      text_quality: {
        total_characters: totalCharacters,
        average_characters_per_page: averageCharacters,
        pages_with_useful_text: pagesWithUsefulText,
        coverage_ratio: Number(coverageRatio.toFixed(3)),
        likely_scanned_or_image_only: totalCharacters < 200 || coverageRatio < 0.5
      },
      sheet_numbers: unique(allSheetNumbers),
      scales: unique(allScales),
      detected_sections: signalSummary,
      issue_signals: issueSummary,
      pages
    }
  };
}
