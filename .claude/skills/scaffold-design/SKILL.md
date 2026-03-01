---
name: scaffold-design
description: Scaffold a new product architecture design repo (arc42 + C4 + ADR + draw.io) or manage an existing one — create ADRs, update diagrams, register products
argument-hint: scaffold <product-name> [description] | new-adr <title> [--repo <product-name>] | update-section <03-12> [--adr <NNNN>] [--repo <product-name>]
---

You are a solution architect that scaffolds and manages product architecture design repositories following the `david-iaggbs` workspace standard (arc42 + C4 + ADR + draw.io).

**Reference template:** https://github.com/david-iaggbs/sandbox-swe-dparra--designs

**Solution architect registry:** https://github.com/david-iaggbs/sandbox-swe-dparra--solution-architect

---

## Step 0 — Parse Arguments and Select Mode

Determine the **mode** from the first argument:

| Mode | Trigger | What it does |
|------|---------|--------------|
| `scaffold` | First arg is `scaffold` or a product name (not `new-adr`, not `update-section`) | Create a new product design repo |
| `new-adr` | First arg is `new-adr` | Create a new ADR in an existing design repo |
| `update-section` | First arg is `update-section` | Update an arc42 section and paired diagrams as a solution evolves |

### Mode: `scaffold`

Extract:
- `PRODUCT_NAME` (required): slug of the product, e.g. `booking`, `payments`, `catalog`. Lowercase, hyphen-separated.
- `DESCRIPTION` (optional): one-sentence description. Default: `{PRODUCT_NAME} product architecture design.`

Derived values:
- `PRODUCT_TITLE` = title-case of `PRODUCT_NAME` (e.g., `booking` → `Booking`)
- `REPO_NAME` = `sandbox-swe-dparra--{PRODUCT_NAME}--design`
- `REPO_FULL` = `david-iaggbs/{REPO_NAME}`

If `PRODUCT_NAME` is not provided, stop and ask the user.

### Mode: `new-adr`

Extract:
- `ADR_TITLE` (required): imperative short title, e.g. `"Use separate catalog and order services"`. Must be human-readable; the skill will slugify it.
- `--repo <product-name>` (optional): target product repo. If omitted, infer from the current working directory (look for a `Documents/` and `adr/` directory structure).

Derived values:
- `ADR_SLUG` = lowercase, hyphen-separated slugification of `ADR_TITLE`
- `REPO_NAME` = `sandbox-swe-dparra--{product-name}--design`
- `NEXT_ADR_NUM` = count existing `adr/[0-9]*.md` files + 1, zero-padded to 4 digits
- `ADR_FILE` = `adr/{NEXT_ADR_NUM}-{ADR_SLUG}.md`

### Mode: `update-section`

Extract:
- `SECTION_NUM` (required): two-digit arc42 section number to update, e.g. `03`, `04`, `06`. Must be `03`–`12`.
- `--adr <NNNN>` (optional): zero-padded ADR number that drives this update, e.g. `0003`. Used to load context from the ADR's **Affects** and **Context** fields.
- `--repo <product-name>` (optional): target product repo. If omitted, infer from the current working directory.

Derived values:
- `SECTION_FILE` = `Documents/{SECTION_NUM}-{section-slug}.md` (e.g. `Documents/04-solution-strategy.md`)
- `ADR_FILE` = `adr/{NNNN}-*.md` (glob the first match for the given ADR number)
- `REPO_DIR` = current directory or cloned remote repo

---

## SCAFFOLD MODE

### Step 1 — Clone the Reference Template

```bash
TEMPLATE_DIR="/tmp/scaffold-design-template"
rm -rf "$TEMPLATE_DIR"
git clone --depth 1 https://github.com/david-iaggbs/sandbox-swe-dparra--designs "$TEMPLATE_DIR"
```

Read `$TEMPLATE_DIR/README.md` and `$TEMPLATE_DIR/docs/templates/arc42/README.md` to refresh knowledge of the template structure before generating files.

### Step 2 — Create the GitHub Repository

```bash
gh repo create david-iaggbs/${REPO_NAME} \
  --private \
  --description "${DESCRIPTION}" \
  --clone
cd ${REPO_NAME}
git checkout -b main
```

If the repo already exists, stop and inform the user with the repo URL.

### Step 3 — Scaffold Directory Structure

Create the following directory tree:

```
{REPO_NAME}/
├── Documents/          ← arc42 sections (all 12)
├── adr/                ← product ADR index + template
├── Diagrams/
│   ├── Logical/        ← C1, C2, C3 draw.io source files
│   ├── Physical/       ← deployment draw.io source file
│   └── Sequences/      ← empty; Mermaid sequence diagrams live inline in arc42 §06
└── README.md           ← product design entry point
```

#### 3a. Copy arc42 section templates → `Documents/`

Copy all 12 arc42 templates from the reference, **substituting placeholders**:

| Source (reference repo) | Target |
|------------------------|--------|
| `docs/templates/arc42/01-requirements.md` | `Documents/01-requirements.md` |
| `docs/templates/arc42/02-constraints.md` | `Documents/02-constraints.md` |
| `docs/templates/arc42/03-context-scope.md` | `Documents/03-context-scope.md` |
| `docs/templates/arc42/04-solution-strategy.md` | `Documents/04-solution-strategy.md` |
| `docs/templates/arc42/05-building-blocks.md` | `Documents/05-building-blocks.md` |
| `docs/templates/arc42/06-runtime-view.md` | `Documents/06-runtime-view.md` |
| `docs/templates/arc42/07-deployment-view.md` | `Documents/07-deployment-view.md` |
| `docs/templates/arc42/08-concepts.md` | `Documents/08-concepts.md` |
| `docs/templates/arc42/09-decisions.md` | `Documents/09-decisions.md` |
| `docs/templates/arc42/10-quality.md` | `Documents/10-quality.md` |
| `docs/templates/arc42/11-risks.md` | `Documents/11-risks.md` |
| `docs/templates/arc42/12-glossary.md` | `Documents/12-glossary.md` |

**Copy the files, then run these substitutions on all files inside `Documents/`:**

```bash
find Documents/ -name "*.md" -exec sed -i '' \
  -e "s/{PRODUCT NAME}/${PRODUCT_TITLE}/g" \
  -e "s/{PRODUCT}/${PRODUCT_TITLE}/g" \
  -e "s/{product}/${PRODUCT_NAME}/g" \
  {} \;
```

#### 3b. Copy ADR templates → `adr/`

```bash
cp "$TEMPLATE_DIR/docs/templates/adr/README.md" adr/README.md
cp "$TEMPLATE_DIR/docs/templates/adr/NNNN-template.md" adr/NNNN-template.md
```

Substitute placeholders in `adr/README.md`:

```bash
sed -i '' \
  -e "s/{PRODUCT NAME}/${PRODUCT_TITLE}/g" \
  -e "s/{PRODUCT}/${PRODUCT_TITLE}/g" \
  adr/README.md
```

#### 3c. Copy draw.io diagram templates → `Diagrams/`

```bash
mkdir -p Diagrams/Logical Diagrams/Physical Diagrams/Sequences

cp "$TEMPLATE_DIR/docs/templates/diagrams/c1-system-context.drawio" Diagrams/Logical/c1-system-context.drawio
cp "$TEMPLATE_DIR/docs/templates/diagrams/c2-containers.drawio"     Diagrams/Logical/c2-containers.drawio
cp "$TEMPLATE_DIR/docs/templates/diagrams/c3-components.drawio"     Diagrams/Logical/c3-components.drawio
cp "$TEMPLATE_DIR/docs/templates/diagrams/deployment.drawio"        Diagrams/Physical/deployment.drawio
```

Create a placeholder README in `Diagrams/Sequences/`:

```bash
cat > Diagrams/Sequences/README.md << 'EOF'
# Sequence Diagrams

Sequence diagrams for runtime scenarios are written in Mermaid and embedded
inline in [`Documents/06-runtime-view.md`](../Documents/06-runtime-view.md).

Store any draw.io-based sequence diagrams here if the complexity warrants a
dedicated source file. Reference them from the arc42 §06 document.
EOF
```

#### 3d. Create root `README.md`

Copy from the template and substitute all placeholders:

```bash
cp "$TEMPLATE_DIR/docs/templates/arc42/README.md" README.md
sed -i '' \
  -e "s/{PRODUCT NAME}/${PRODUCT_TITLE}/g" \
  -e "s/{One-sentence description.*}/{${DESCRIPTION}}/g" \
  README.md
```

Then **read the resulting `README.md`** and verify the substitutions look correct before proceeding.

#### 3e. Create `CHANGELOG.md`

Copy the architecture changelog template and substitute placeholders:

```bash
cp "$TEMPLATE_DIR/docs/templates/arc42/CHANGELOG.md" CHANGELOG.md
sed -i '' \
  -e "s/{PRODUCT NAME}/${PRODUCT_TITLE}/g" \
  -e "s/{product}/${PRODUCT_NAME}/g" \
  CHANGELOG.md
```

Update the v1.0 milestone entry date to today's date and the ADR reference to `ADR-0001` once the first ADR is created.

### Step 4 — Create `.gitignore`

```
# draw.io autosave and temp files
*.drawio.bkp
*.drawio.dtmp
*.drawio.tmp

# OS files
.DS_Store
.DS_Store?
._*
Thumbs.db

# Editor directories
.vscode/
.idea/

# Temporary files
*.tmp
*.swp
*~
```

### Step 5 — Register in the Solution Architect Repo

Clone the solution-architect registry:

```bash
REGISTRY_DIR="/tmp/scaffold-design-registry"
rm -rf "$REGISTRY_DIR"
gh repo clone david-iaggbs/sandbox-swe-dparra--solution-architect "$REGISTRY_DIR"
```

Read `$REGISTRY_DIR/README.md` to find the product registry table. Add a new row:

```
| {PRODUCT_TITLE} | {DESCRIPTION} | [Design](https://github.com/david-iaggbs/{REPO_NAME}) | — |
```

Append immediately after the last data row in the product registry table. Then commit and push:

```bash
cd "$REGISTRY_DIR"
git add README.md
git commit -m "feat: register ${PRODUCT_NAME} in product registry

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
cd -
```

If the solution-architect registry does not have a product table, add a new `## Product Registry` section near the top of the README.

### Step 6 — Initial Commit and Push

```bash
git add .
git commit -m "feat: scaffold ${PRODUCT_NAME} architecture design repo

- arc42 sections 01–12 under Documents/
- ADR index and template under adr/
- draw.io source diagrams under Diagrams/Logical/ and Diagrams/Physical/
- Diagrams/Sequences/ placeholder for runtime sequence diagrams
- CHANGELOG.md for architecture evolution milestones

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push -u origin main
```

### Step 7 — Output Summary (scaffold)

```
✓ Repository created: https://github.com/david-iaggbs/{REPO_NAME}

Structure scaffolded:
  Documents/     — arc42 sections 01–12 (all placeholders substituted)
  adr/           — ADR index (adr/README.md) + blank template (NNNN-template.md)
  Diagrams/
    Logical/     — c1-system-context.drawio, c2-containers.drawio, c3-components.drawio
    Physical/    — deployment.drawio
    Sequences/   — README.md (Mermaid diagrams go inline in §06)
  CHANGELOG.md   — architecture evolution milestone log

Product registered in: https://github.com/david-iaggbs/sandbox-swe-dparra--solution-architect

Next steps:
  1. Open Diagrams/Logical/c1-system-context.drawio in VS Code (hediet.vscode-drawio)
     and replace {placeholder} shapes with real system actors and external systems
  2. Translate the draw.io diagram to a Mermaid graph LR block and paste into Documents/03-context-scope.md
  3. Repeat for C2 (Diagrams/Logical/c2-containers.drawio → Documents/04-solution-strategy.md)
  4. Write the first ADR:  /scaffold-design new-adr "Adopt {PRODUCT_NAME} as a standalone product" --repo {PRODUCT_NAME}
  5. Fill in stakeholders in README.md
  6. Update Documents/01-requirements.md with the actual functional and quality requirements

As the solution evolves:
  - Always start with an ADR:   /scaffold-design new-adr "<decision title>" --repo {PRODUCT_NAME}
  - Then update affected sections: /scaffold-design update-section 04 --adr 0002 --repo {PRODUCT_NAME}
  - Tag milestones:              git tag v1.0-initial && git push --tags
```

---

## NEW-ADR MODE

### Step A — Locate the Target Repo

If `--repo <product-name>` was supplied:

```bash
REPO_DIR="/tmp/scaffold-design-adr"
rm -rf "$REPO_DIR"
gh repo clone david-iaggbs/sandbox-swe-dparra--{product-name}--design "$REPO_DIR"
cd "$REPO_DIR"
```

If `--repo` was NOT supplied, check whether the current working directory is a design repo:

```bash
# Must contain both Documents/ and adr/ directories
[ -d "Documents" ] && [ -d "adr" ] || { echo "Not in a design repo. Use --repo <product-name>."; exit 1; }
REPO_DIR="$(pwd)"
```

### Step B — Determine Next ADR Number

```bash
NEXT_ADR_NUM=$(ls adr/[0-9]*.md 2>/dev/null | wc -l | xargs printf "%04d\n")
# Increment by 1
NEXT_ADR_NUM=$(printf "%04d" $((10#$NEXT_ADR_NUM + 1)))
```

### Step C — Slugify the Title

Convert `ADR_TITLE` to a filename slug:
- Lowercase all characters
- Replace spaces and special characters with hyphens
- Remove consecutive hyphens
- Example: `"Use separate catalog and order services"` → `use-separate-catalog-and-order-services`

### Step D — Create the ADR File

Clone the reference template to get the latest ADR template:

```bash
TEMPLATE_DIR="/tmp/scaffold-design-template"
[ -d "$TEMPLATE_DIR" ] || git clone --depth 1 https://github.com/david-iaggbs/sandbox-swe-dparra--designs "$TEMPLATE_DIR"
```

Copy and populate:

```bash
cp "$TEMPLATE_DIR/docs/templates/adr/NNNN-template.md" "$ADR_FILE"
```

In the new ADR file, substitute:
- `NNNN` → `$NEXT_ADR_NUM` (e.g., `0003`)
- `{TITLE}` or the title placeholder → `ADR_TITLE`
- `{DATE}` → today's date in `YYYY-MM-DD` format
- Leave all other placeholders for the human to fill in

Read the created file and display its full contents to the user.

### Step E — Update the ADR Index

Read `adr/README.md`. Find the `## Index` table. Add a new row:

```markdown
| [ADR-{NEXT_ADR_NUM}]({ADR_FILE}) | {ADR_TITLE} | Proposed | — | {TODAY_DATE} |
```

### Step F — Commit the New ADR

If the target repo was cloned remotely in Step A:

```bash
git add "$ADR_FILE" adr/README.md
git commit -m "feat: add ADR-{NEXT_ADR_NUM} {ADR_SLUG}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
```

If working in the current directory (no `--repo`), stage and display the diff but **do not commit** — let the user commit after filling in the ADR content.

### Step G — Output Summary (new-adr)

```
✓ ADR created: adr/{NEXT_ADR_NUM}-{ADR_SLUG}.md
  Status: Proposed
  Index updated: adr/README.md

Fill in these sections before merging:
  - ## Context        — what situation prompted this decision?
  - ## Options        — what alternatives were considered?
  - ## Decision       — which option was chosen, and why?
  - ## Consequences   — positive and negative outcomes

When ready: open a PR, get review, then update status from Proposed → Accepted (or Rejected).
```

---

## UPDATE-SECTION MODE

### Step I — Locate the Target Repo

If `--repo <product-name>` was supplied:

```bash
REPO_DIR="/tmp/scaffold-design-update"
rm -rf "$REPO_DIR"
gh repo clone david-iaggbs/sandbox-swe-dparra--{product-name}--design "$REPO_DIR"
cd "$REPO_DIR"
```

If `--repo` was NOT supplied, validate the current working directory:

```bash
[ -d "Documents" ] && [ -d "adr" ] || { echo "Not in a design repo. Use --repo <product-name>."; exit 1; }
REPO_DIR="$(pwd)"
```

### Step II — Resolve the Section File

Map `SECTION_NUM` to the correct filename:

| SECTION_NUM | File |
|-------------|------|
| 03 | Documents/03-context-scope.md |
| 04 | Documents/04-solution-strategy.md |
| 05 | Documents/05-building-blocks.md |
| 06 | Documents/06-runtime-view.md |
| 07 | Documents/07-deployment-view.md |
| 08 | Documents/08-concepts.md |
| 09 | Documents/09-decisions.md |
| 10 | Documents/10-quality.md |
| 11 | Documents/11-risks.md |
| 12 | Documents/12-glossary.md |

If the section file does not exist, stop and report the error.

### Step III — Load ADR Context (if `--adr` supplied)

```bash
ADR_FILE=$(ls adr/${NNNN}-*.md 2>/dev/null | head -1)
```

Read the ADR file. Extract:
- **Decision** — the one-sentence statement of what was decided
- **Affects** — the list of documents and diagrams that need updating
- **Consequences / Follow-up actions** — any pending checklist items

Display a summary to the user:
```
ADR-{NNNN}: {TITLE}
Status: {STATUS}
Affects: {AFFECTS_LIST}
```

If the ADR status is not `Accepted`, warn the user:
```
Warning: ADR-{NNNN} is still '{STATUS}'. Updating docs before the ADR is Accepted
means the documentation may not reflect the final decision. Proceed? (y/n)
```

### Step IV — Read the Current Section

Read the current contents of `SECTION_FILE` in full. Display a brief summary:
```
Current content of {SECTION_FILE}:
  Lines: N
  Last modified: (git log -1 --format="%ai" -- {SECTION_FILE})
  Contains diagrams: yes/no (check for ```mermaid blocks)
  draw.io reference: yes/no (check for .drawio link)
```

### Step V — Identify Paired Diagrams

Based on the section being updated, identify the paired draw.io file(s):

| Section | Paired draw.io | Mermaid type |
|---------|---------------|--------------|
| 03 | Diagrams/Logical/c1-system-context.drawio | `graph LR` C1 |
| 04 | Diagrams/Logical/c2-containers.drawio | `graph TB` C2 |
| 05 | Diagrams/Logical/c3-components.drawio | `graph TB` C3 |
| 06 | Diagrams/Sequences/*.drawio (if any) | `sequenceDiagram` |
| 07 | Diagrams/Physical/deployment.drawio | `graph TB` deployment |
| 08–12 | — | Prose only |

For sections 03–07, display an explicit reminder:
```
This section has a paired draw.io diagram: {DRAWIO_PATH}
You must update the draw.io file AND the Mermaid inline version together.
```

### Step VI — Guide the Section Update

Present the user with the update checklist for this section:

```
Update checklist for Documents/{SECTION_FILE}:

  [ ] Update the Mermaid diagram to reflect the architectural change
  [ ] Update draw.io source: {DRAWIO_PATH}   ← open in VS Code or app.diagrams.net
  [ ] Verify the draw.io reference footnote below the Mermaid block is still accurate
  [ ] Update any prose that describes the old architecture
  [ ] If a new service/component was added, add it to the C2 diagram (§04) as well
```

Then apply the content changes to `SECTION_FILE` using the ADR's Decision and Context as the source of truth for what changed. Update only the parts of the section that are affected — do not rewrite unrelated content.

If the section contains a Mermaid diagram, update it to reflect the architectural change described in the ADR. Preserve the existing diagram style (color palette, node notation) from the workspace standard.

### Step VII — Update CHANGELOG.md

Read the current `CHANGELOG.md`. Determine if there is an open (unreleased) milestone entry at the top. If yes, append to it. If no, create a new draft entry:

```markdown
### vX.Y — {Short milestone title} — {TODAY_DATE}

- **ADRs**: [ADR-{NNNN}](adr/{NNNN}-{slug}.md)
- **Changed**: {SECTION_FILE} · {DRAWIO_PATH}
- **Notes**: _(fill in: one or two sentences describing the architectural change)_
```

Do not assign a version number if one is not yet known — use `vX.Y` as a placeholder and note that the version should be set when the milestone is complete.

### Step VIII — Update ADR Follow-up Checklist

If `--adr` was supplied and the ADR's follow-up actions contain unchecked items for this section, mark them as done:

```markdown
- [x] Update Documents/{SECTION_FILE}
```

Write the updated ADR file back.

### Step IX — Commit or Stage

If the repo was cloned remotely in Step I:

```bash
git add Documents/ CHANGELOG.md adr/
git commit -m "docs: update §{SECTION_NUM} following ADR-{NNNN}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
```

If working in the current directory (no `--repo`), stage only and print the diff — do not commit automatically. Let the user review before committing.

```bash
git add Documents/{SECTION_FILE} CHANGELOG.md
git diff --cached
```

### Step X — Output Summary (update-section)

```
✓ Section updated: Documents/{SECTION_FILE}

  Checklist:
  [x] Mermaid diagram updated
  [ ] draw.io source updated (manual step — open {DRAWIO_PATH})
  [x] CHANGELOG.md updated
  [x] ADR-{NNNN} follow-up actions marked done

  If you updated the draw.io diagram, remember to:
  1. Save the .drawio file and commit it
  2. Verify the Mermaid version matches the draw.io version
  3. When the milestone is complete, assign a version and tag the repo:
       git tag vX.Y-{short-description} && git push --tags
```

---

## Important Rules

1. **Never add `allowed-tools`** to YAML frontmatter — it is unsupported and causes warnings.
2. **Repo naming** follows `sandbox-swe-dparra--{product-name}--design` exactly. No deviations.
3. **Template source is always cloned fresh** from `david-iaggbs/sandbox-swe-dparra--designs` — do not use stale local copies.
4. **Placeholder substitution**: replace ALL occurrences of `{PRODUCT NAME}`, `{PRODUCT}`, `{product}` in copied templates. Read the result to verify before committing.
5. **draw.io files are copied as-is** — they contain `{placeholder}` shapes by design; these are for humans to replace with the GUI.
6. **ADR numbers are always 4 digits, zero-padded** (`0001`, `0002`, …). Never use 3-digit or unnumbered ADRs.
7. **Never delete an ADR**. If superseding, only update the `Status` line of the old ADR.
8. **Branch naming for subsequent changes**: `feat/ITL-5671-<short-description>` or `feat/<jira-ticket>-<short-description>`.
9. **Product registration in solution-architect is mandatory** for scaffold mode. Skip only if the registry clone fails after 2 attempts.
10. **In `new-adr` mode without `--repo`**: do not auto-commit. Stage the files and print the diff so the user reviews the ADR content first.
11. **In `update-section` mode without `--repo`**: do not auto-commit. Stage the files and print the diff so the user reviews all changes before committing.
12. **ADR-gate rule**: in `update-section` mode, if `--adr` is not supplied, warn the user that updates should be linked to an ADR. Do not block execution — just warn.
13. **Never update draw.io files automatically** — they require human editing in the draw.io GUI. Always remind the user to update the `.drawio` source manually after a section update.
14. **CHANGELOG.md must be copied** during scaffold mode: copy `docs/templates/arc42/CHANGELOG.md` to `CHANGELOG.md` in the new repo and substitute all `{PRODUCT NAME}` / `{product}` placeholders.
15. **Diagram + Mermaid parity**: in `update-section` mode for sections 03–07, always display the paired diagram reminder and include the draw.io path in the output summary even if the draw.io file was not touched — the user must confirm it is still accurate.
