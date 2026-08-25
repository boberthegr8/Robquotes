# Forge Reader

Forge Reader is the document-intake and document-understanding module for the Forge construction/LBM suite.

Repository history: this repo began as the `Robquotes` prototype. The current product direction is Forge Reader.

## Current v1 workflow

1. Sign into Forge Core with the same passwordless Forge identity used by CRM.
2. Choose an existing customer/project or leave the document unassigned for intake-first review.
3. Upload a PDF drawing set, truss layout, engineering package, quote, BOM or specification.
4. Forge computes a SHA-256 digest and checks for an existing organization document.
5. The original PDF is stored in the private `forge-documents` Supabase Storage bucket using an organization-prefixed path.
6. `commit_reader_document_v1` atomically creates the Core `documents` row, a queued `document_analysis_runs` record and a platform event.
7. The Reader document inbox shows customer/project association and analysis state.

## Forge Core

Production Core project ref: `uyqanhwurngoupmvzxrh`.

Reader depends on the canonical Core contracts in `boberthegr8/Forgecore`, including:

- `documents`
- `document_analysis_runs`
- `customers`
- `projects`
- `events`
- private `forge-documents` storage

All business access is tenant-scoped by `organization_id` and protected by Supabase Auth + RLS.

## Hard infrastructure boundary

Great White Streams is unrelated to Forge. This Reader code must never use Great White Streams Firebase, auth, storage, databases, naming or infrastructure. Legacy Firebase/GWS configuration from the original prototype has been removed.

## What v1 intentionally does not fake

The current release makes intake, storage, deduplication, review state and Core persistence real. It does not pretend that full drawing understanding is finished yet.

The next Reader worker should consume queued `document_analysis_runs`, extract structured drawing/document metadata into `extracted_data`, preserve warnings/uncertainty, and feed that canonical output into Forge Scope.

## Local development

```bash
npm install
npm run dev
```

Build verification:

```bash
npm run build
```
