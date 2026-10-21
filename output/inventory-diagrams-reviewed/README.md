# FAJUTAGANA - finalized JAPZ Inventory diagrams

Open `FAJUTAGANA_17_DIAGRAMS_Updated.docx` for the revised academic document. It contains all 17 diagrams, the original captions and updated descriptions, with one figure section per page. The user's header/footer, Arial typography, A4 margins, title, indents and description formatting are preserved.

Figure 1 uses the **new supplied GitDiagram architecture**, verified against the Inventory implementation. The old architecture in the original Word document is replaced. The more detailed verified Mermaid source is in `mermaid/01-System-Architecture-Verified.mmd` and the main workspace's `INVENTORY_ARCHITECTURE.md`.

## Files

- `images/01.png` through `17.png`: high-resolution, Word-ready diagram images. Revised figures are generally 2,700-3,000 pixels wide; Figure 7 retains the original 1,800-pixel image because it did not require a visual correction.
- `svg/`: scalable vector exports for all 17 diagrams.
- `editable/`: 17 individual diagrams.net/draw.io sources, one combined 17-tab source, and the exact machine-readable diagram model.
- `mermaid/`: verified source for the new architecture.
- `REVIEW_NOTES.md`: individual review decisions, corrections, code/test references and modeling limitations.
- `VERIFICATION.json`: final structural, preservation and rendering checks.

Open `.drawio` files with diagrams.net; all diagram shapes and labels are editable. The combined file contains one tab per diagram. SVGs can be used at larger sizes without pixelation. The diagram-model JSON retains explicit shapes, labels, paths and coordinates for reproducible editing.

## Figure order

1. System Architecture
2. Class
3. Component
4. Deployment
5. Object
6. Package
7. Composite Structure
8. Profile
9. Data Flow (DFD)
10. Use Case
11. Activity
12. Sequence
13. State Machine
14. Communication
15. Interaction Overview
16. Timing
17. Requirement (SysML)

The object values and timing scale are illustrative. The UML profile is a documentation convention. Deployment describes the main project's configured local environment. Source and existing tests were reviewed; this documentation task did not rerun the application tests or alter application functionality.

The Word document was exported by Microsoft Word and every final PDF-rendered page was visually inspected using the Windows PDF renderer. Internal page images, original reference files and authoring/QA scripts are excluded from the delivery archive.
