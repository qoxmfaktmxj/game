# Issue tracker: Local Markdown

Issues and specs live in `.scratch/`. No external issue is created automatically.

- One feature per directory: `.scratch/<feature>/`.
- The specification is `spec.md`; tickets are `issues/NN-<slug>.md`, numbered from 01.
- Each ticket records its title, `Status:`, `Label:`, acceptance criteria, and verification results. Labels follow `triage-labels.md`.
- Update the same ticket as work progresses. Append discussion under `## Comments`.
- Publishing to the tracker means creating the corresponding Markdown file. Fetching a ticket means reading it.
- Wayfinding uses `map.md` plus individual tickets. Record dependencies as `Blocked by: NN, NN`; claim a ticket before working and mark resolved after recording evidence.
