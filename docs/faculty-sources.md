# Official UTeM faculty and institute registry sources

Verified on **17 October 2026** against official UTeM corporate, School of Graduate Studies and individual faculty websites. This research updates institutional display names only; it does not update programme academic titles, fees, durations or mode rules.

`data/faculties.json` contains nine entries: seven current faculties, the currently listed ITK institute, and the retained legacy IPTK identity. Names exclude the code in parentheses because `code` is stored separately. Casing and `dan`/`and` are normalized for readable display; words are otherwise preserved from the selected official source.

JSON `id` values are stable source identifiers based on initial codes. The application database may generate its own immutable UUID; seed/backfill should resolve the source's initial `code` to that UUID. Do not recompute an existing database id when an administrator later edits a code.

## Verified mapping and evidence

| Code | Malay name | English name selected | Official evidence |
| --- | --- | --- | --- |
| FTKE | Fakulti Teknologi dan Kejuruteraan Elektrik | Faculty of Electrical Technology and Engineering | [Faculty homepage, both languages and code](https://ftke.utem.edu.my/en/) |
| FTKEK | Fakulti Teknologi dan Kejuruteraan Elektronik dan Komputer | Faculty of Electronic and Computer Technology and Engineering | [Dean's Welcome Note, bilingual sign-off/contact footer](https://ftkek.utem.edu.my/menu-1/dean-s-welcome-note.html), updated 18 November 2025 |
| FTKM | Fakulti Teknologi dan Kejuruteraan Mekanikal | Faculty of Mechanical Technology and Engineering | [Faculty homepage, English introduction and Malay contact footer](https://ftkm.utem.edu.my/) |
| FTKIP | Fakulti Teknologi dan Kejuruteraan Industri dan Pembuatan | Faculty of Industrial and Manufacturing Technology and Engineering | [Faculty contact footer, Malay/code](https://ftkip.utem.edu.my/); [English corporate directory](https://www.utem.edu.my/en/corporate-info/faculties-department-centres.html) |
| FTMK | Fakulti Teknologi Maklumat dan Komunikasi | Faculty of Information and Communication Technology | [Malay corporate directory](https://www.utem.edu.my/ms/info-korporat/fakulti-dan-pusat-tanggungjawab.html); [faculty Dean's Foreword](https://ftmk.utem.edu.my/web/index.php/deans-foreword/), marked updated September 2026 |
| FPTT | Fakulti Pengurusan Teknologi dan Teknousahawanan | Faculty of Technology Management and Technopreneurship | [Faculty About page, English heading and Malay contact footer](https://fptt.utem.edu.my/home/about-us-fptt/about-fptt.html) |
| FAIX | Fakulti Kecerdasan Buatan dan Keselamatan Siber | Faculty of Artificial Intelligence and Cyber Security | [Faculty homepage, English name/code](https://faix.utem.edu.my/en/); [Malay corporate directory](https://www.utem.edu.my/ms/info-korporat/fakulti-dan-pusat-tanggungjawab.html) |
| IPTK | Institut Pengurusan Teknologi dan Keusahawanan | Institute of Technology Management and Entrepreneurship | [Institute homepage still branded IPTK](https://iptk.utem.edu.my/en/); [UTeM Malay homepage still lists the legacy Malay name/code](https://www.utem.edu.my/ms/) |
| ITK | Institut Teknologi Kelestarian | Institute of Sustainability Technology | [Malay corporate directory](https://www.utem.edu.my/ms/info-korporat/fakulti-dan-pusat-tanggungjawab.html); [English corporate directory](https://www.utem.edu.my/en/corporate-info/faculties-department-centres.html) |

## Official-source disagreements and decisions

The [SPS Postgraduate Programmes 2026 page](https://sps.utem.edu.my/programme/accreditation/postgraduate-programs.html) keeps its faculty list in an inline JavaScript `const D` array. A text-only crawl displays zero counters because it does not run the page script. Reading the live page source confirms eight groups: the seven faculties above and an institute group. That is consistent with seven faculties plus one institute; the retained legacy IPTK record is not counted as an additional current faculty.

- **FTKEK English:** its faculty Dean's note uses singular *Electronic* followed by *Computer Technology and Engineering*. The corporate English directory uses plural *Electronics*. The SPS page instead orders the words as *Electronic and Computer Engineering Technology*. The seed follows the faculty's own explicit sign-off and records the variants in `notes`. The Malay name/code agree across those sources.
- **FTMK English:** the corporate English directory uses plural *Communications*. The faculty's own Dean's Foreword, marked updated September 2026, and the SPS dataset use singular *Communication*. The seed follows the faculty source. The Malay spelling is corroborated by the corporate directory and [UTeM Malay academic page](https://www.utem.edu.my/ms/akademik.html).
- **ITK English:** corporate English uses *Sustainability Technology*, while SPS uses *Sustainable Technology*. The seed follows the bilingual corporate directory: the Malay label is *Institut Teknologi Kelestarian* and the code is ITK.
- **IPTK/ITK identity:** the corporate ms/en directories label ITK but link to `iptk.utem.edu.my`, whose current accessible homepage still labels itself IPTK and describes the older management/entrepreneurship institute. The main Malay UTeM homepage also still lists IPTK. These sources do not establish an effective rename date or transfer of each academic programme. Both registry records remain active with explicit notes. Existing IPTK programmes retain IPTK ownership; no offering is silently reassigned to ITK, no old letter is rewritten, and no institute is automatically retired.

## Integration boundaries

An active institutional registry record means it is available for administration and selection when an approved offering exists. It does not certify every legacy programme row. In particular, confirming FAIX's faculty name does not resolve the legacy MAIX fee/mode discrepancies already documented in the catalogue audit. ITK is added with no fabricated programme offerings.

Future faculty code/name edits must use immutable faculty ids for relationships and authorization. New letters copy the selected full faculty name into their issuance snapshot; existing snapshots retain the original value. Never backfill historical letter text from these current labels.
