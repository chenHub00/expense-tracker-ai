# Export module

Exports the user's expenses as CSV, JSON or PDF. The module is organised around the SOLID
principles so that new formats and destinations can be added without touching existing code.

```
lib/export/
  types.ts           Domain types: ExportSelection, ExportSummary, ExportDocument
  selection.ts       Which expenses to export (date range, categories, ordering)
  summary.ts         Totals and per-category breakdown
  filename.ts        Suggested names, sanitising, final name resolution
  formats/
    format.ts        The ExportFormat contract (and the narrower FormatOption)
    registry.ts      createFormatRegistry: lookup by id, duplicate and unknown-id checks
    csv.ts json.ts   One file per format
    pdf.ts           Thin wrapper that lazy-loads pdfRenderer.ts (jsPDF)
    index.ts         defaultFormatRegistry: the formats the app offers
  fileSaver.ts       FileSaver interface + browserFileSaver
  exportService.ts   The export use case, built from injected dependencies
  index.ts           Composition root: defaultExportService

components/export/
  useExportForm.ts         Form state and rules, no markup
  ExportForm.tsx           Wires the hook into presentational parts and shows toasts
  FormatPicker, DateRangeField, CategoryPicker, FilenameField,
  ExportSummaryStats, ExportPreview   One job each, props only
  ExportServiceContext.tsx Lets a subtree swap the export service
```

## How each principle shows up

**Single responsibility.** Each module has one reason to change. Selection rules live in
`selection.ts`, totals in `summary.ts`, naming in `filename.ts`, file writing in each format,
and saving in `fileSaver.ts`. In the UI, `useExportForm` owns state and rules while each
component only renders what it is given. Selection state (dates, categories) is separate
from output state (format, file name), so typing a file name never re-filters the data.

**Open/closed.** To add a format, write a module that implements `ExportFormat` and list it
in `formats/index.ts`. Nothing else changes: the registry, service, picker and file-name
rules all work from the registry, and `formatIcon` falls back to a generic icon for formats
it does not know.

**Liskov substitution.** `ExportFormat` documents its contract: resolve for any document
(including an empty one), return a Blob of the declared `mimeType`, never mutate the input.
`__tests__/formats.contract.test.ts` runs that contract against every registered format, so
a new format is checked automatically.

**Interface segregation.** Consumers depend on the narrowest type that serves them.
`FormatPicker` takes `FormatOption` (no `serialize`), `ExportSummaryStats` takes only the
summary fields it shows, and formats receive a read-only `ExportDocument` rather than form
state.

**Dependency inversion.** `createExportService` depends on abstractions: a `FormatRegistry`,
a `FileSaver` and a clock. The browser implementations are chosen in one place
(`lib/export/index.ts`), and React reads the service from `ExportServiceContext`, so tests
or a future destination (e.g. cloud upload) can supply different implementations.
`__tests__/exportService.test.ts` runs the service with an in-memory saver and a fixed clock.

## Adding a format (example: Markdown)

1. Create `formats/markdown.ts` exporting an `ExportFormat` with `id: 'md'`.
2. Add it to the array in `formats/index.ts`.
3. Optionally add an icon in `components/export/formatIcons.ts`.
4. Run `npm test`: the contract suite now covers the new format.
