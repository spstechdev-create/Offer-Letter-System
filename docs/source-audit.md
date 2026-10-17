# Legacy source reconciliation

The supplied files define the first catalogue and letter templates. They are historical source data, not a verification of current university fees or policy. No student records, staff accounts/passwords or generated PDFs have been imported.

## Catalogue seed

Run `node scripts/extract-catalogue.mjs` from this application directory to rebuild `data/programmes.json` and `data/catalogue-audit.json`. The script reads only `faculties`, `local_programs` and `international_programs` INSERT sections from the 2 January 2025 SQL dump and the isolated `programDetails` object in the standalone HTML. It does not execute SQL or browser submission code.

The seed preserves separate category/attendance offerings rather than guessing a single universal price:

| Source | Offerings |
| --- | ---: |
| SQL local programmes | 104 |
| SQL international programmes | 100 |
| HTML-only FAIX programme, two categories/two attendance options | 4 |
| Total | 208 |
| Active, no detected cross-source conflict | 177 |
| Inactive, needs catalogue administrator review | 31 |

SQL names, fees and duration are preserved as the baseline, with original table/id in each row's `source`. Malay and English rows are paired using source order, faculty id and the four local-only Doctor of Engineering entries; the bilingual Electronic/Electrical mismatch is explicitly quarantined. Rows absent from HTML remain available from the structured SQL source. Normalization is limited to case, punctuation, Electronic/Electronics, Systems/System and the HTML's stray `MQA/` token; no fee is silently chosen where the sources disagree.

### Concrete disagreements

| Programme / faculty | SQL | Standalone HTML | Treatment |
| --- | --- | --- | --- |
| IPTK Doctor of Philosophy | FT 3-8, PT 4-8 years | FT 2-4, PT 3-7 years | 4 category/mode rows inactive |
| FTKEK MSc Electronic Engineering | Malay title says Electrical; English says Electronic | English says Electronic | 4 bilingual rows inactive |
| FTKM Master of Mechanical Engineering | Coursework | Research | 4 category/mode rows inactive |
| FTMK Doctor of Information Technology | Research | Mixed mode | 2 category rows inactive |
| FPTT local MBA, both specializations | RM16,520 | RM15,020 | 4 local rows inactive |
| FTKE international Industrial Power | RM10,448 | RM15,545 | 1 row inactive |
| FTKE international Mechatronic Engineering coursework | RM10,448 | RM14,710 | 2 attendance rows inactive |
| FTKE international Electrical Engineering coursework | RM9,320 | RM14,710 | 2 attendance rows inactive |
| FTKEK international Computer Engineering coursework | RM8,710 | RM14,710 | 2 attendance rows inactive |
| IPTK international Technical Communication | RM36,568 | RM17,876 | 2 attendance rows inactive |
| FAIX MAIX | Absent | Local RM25,110 FT / RM25,730 PT; international RM43,410 FT / RM44,030 PT; durations 1.5 / 2.5 years | 4 rows inactive pending faculty/title/mode review |

FAIX is labelled `C & ODL`, but the HTML explicitly rejects ODL selection for it. Other ODL options frequently contain the literal duration `ODL`, while Open Access is exposed in the dropdown without corresponding concrete durations. These are not usable offering rules and are not fabricated into selectable entries.

The HTML is missing `submitregistration.php`, referenced image directories, authentication and record persistence. Agent name/faculty/code, event and event date are useful form fields; trusted ownership and access must come from the authenticated account rather than submitted hidden fields.

## Conditional offer content

The two PHP registration handlers supply standard Malay/local and English/international conditional letter wording: faculty, programme, study type, attendance, duration, fee, online admission instructions and one-year validity. The implementation retains those concepts in version `sps-conditional-v1`; wording is lightly corrected for readability, not presented as a pixel-identical historical form.

`internWeb/generate_offer.php` supplies the FTMK-specific template, including Master's coursework/research CGPA thresholds of 2.75/3.00 and a full offer only after application approval. These are preserved under `ftmk-conditional-v1`. Its old hardcoded intake `2025/2026` and named contact officers are not silently rolled forward; a selected intake/contact must be saved explicitly in a new letter snapshot. The supplied signatory is preserved as legacy source configuration, not a claim about the current officeholder.

`src/lib/pdf.ts` generates an A4 PDF from a saved `LetterSnapshot` only. It never queries the programme catalogue, uses a current staff profile, writes a PDF file or uploads bytes. On-demand view and download can share its returned bytes. The snapshot must include programme/faculty names, exact total fee, duration, structure, attendance, student identity/address/contact details, issue time, reference, signatory and template version. Optional intake, admission URL, conditions, FTMK contacts and signature asset are also snapshot values.

Template text and branding assets are versioned. Existing versions must remain available and unchanged after issue; a future policy/branding change requires a new version. A correction creates a new saved letter snapshot rather than mutating the original. Unknown template or branding versions fail closed. Long names/addresses/programme titles wrap and paginate; the signatory is kept together. The bundled Noto Sans font supports Latin, Greek and Cyrillic. Unsupported scripts receive a clear error requesting Latin passport spelling rather than disappearing into missing-glyph squares.

PDF implementation reference: [pdf-lib official documentation](https://pdf-lib.js.org/) (font embedding, custom fontkit integration, image embedding and byte output). Noto fonts are from [the Noto project](https://github.com/notofonts/noto-fonts) with the bundled SIL Open Font License. Versioned asset provenance is in `public/branding/v1/README.md`.

## Backend review acceptance checks

Independent static review identified the following cases during implementation. These are the checks handed to the integrating developer; their presence here is not a claim that a route remains vulnerable after integration fixes.

| Check | Required behaviour |
| --- | --- |
| Duplicate identity outside an agent's record scope | A new application must not expose the existing student's canonical name/contact/address through the newly owned application. Reject linking outside scope or keep the new application's submitted details separate. |
| Duplicate identity inside permitted scope | The application screen, first letter and corrected letter must agree about which submitted/canonical values are authoritative. Do not silently keep old student values while issuing a letter with different submitted values. |
| Overview-only permission | Return scoped aggregate counts only. Removing `records.view` must also remove student PII from the bootstrap response, even when `overview.view` remains granted. |
| Two concurrent corrected-letter requests | Both successful versions must have distinct version numbers. A lock plus `MAX(version)+1` in one statement is insufficient if a waiting statement's snapshot cannot see the other transaction's inserted letter. An atomic per-application counter or whole-operation uniqueness retry is needed. |
| Archive-only request | Accept `{archived: true}` without requiring name/contact fields. Omitted `archived` in an information correction must preserve existing archive state. |
| Correction audit | Save who changed the record, when, and the actual previous/new corrected fields; a constant list of field names alone does not explain what changed. |
| FTMK template choice | Restrict legacy Master's criteria to an applicable FTMK Master's offering, or explicitly supply reviewed replacement conditions in the saved snapshot. Do not apply those criteria globally to all faculties or doctorates. |
| Unsupported characters | Surface `LetterTextError` as a useful validation response before committing a student/application, rather than a generic server error or missing-glyph PDF. |
| Serverless packaging | Include `public/branding/v1/**` in output tracing so fonts/images remain available to on-demand PDF routes. |

The concurrent snapshot observation follows [PostgreSQL's Read Committed documentation](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-READ-COMMITTED): waiting updates can see the latest version of their target row while ordinary reads retain the command's earlier snapshot. This makes a separate atomic counter safer than reading a maximum from another table after taking a lock.

The letter snapshot already covers the required immutable display values. Additional full-body text is not necessary if every issued template implementation and branding version is retained unchanged; saving resolved `conditions`, contacts and admission URL is preferable whenever those are configurable. Agent/event attribution belongs to the application, and need only be duplicated into a letter snapshot if a future letter prints it.

Visual QA used fictitious examples: standard Malay and English plus FTMK English rendered on one A4 page; extreme name/address/programme lengths flowed to two pages with the signatory kept together. Missing-glyph and unsupported-template rejections were checked. Temporary QA PDFs and rendered images were removed; the runtime generator returns bytes only.
