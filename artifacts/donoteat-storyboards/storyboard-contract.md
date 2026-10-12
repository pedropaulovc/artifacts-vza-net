# Illustrated storyboard contract

User requests illustrated panels with descriptions directly beneath/beside them, camera movements, visual gags, character actions, FULL dialogue, and sound/music captions. Preserve supporting Markdown story sheets; author `storyboards/<id>.json` for the shared renderer.

## Authored JSON shape

```json
{
  "id": "youtube-id",
  "title": "Exact downloaded metadata title",
  "durationSeconds": 123.4,
  "premise": "Brief story/argument attributed to presenter",
  "coverage": "Actual inspection coverage and limits",
  "panels": [
    {
      "startSeconds": 0,
      "frameNumber": 7,
      "heading": "Setup / turn / payoff",
      "description": "Literal observed image and narrative purpose",
      "camera": "Observed framing/movement/cuts, uncertainty explicit",
      "action": "Observed character/gameplay/on-screen action, or static image",
      "sound": [
        {"startSeconds": 18.2, "text": "Identified effect/music; source and precision explicit"}
      ],
      "visualGag": "Observed gag and connected setup/payoff, or null",
      "notes": "Uncertainty and supporting evidence, or null"
    }
  ]
}
```

## Full dialogue: source-derived, never excerpted

**Do not author `dialogue` or `endSeconds` fields.** Remove them from existing JSON. The renderer reads every word from the complete timestamped `transcripts/<id>.json`, assigning each word exactly once to its panel according to chronological `startSeconds` boundaries. It displays full speech as readable timestamped paragraphs under each image. No excerpt policy, word-count cap, truncation, paraphrase or dropped filler. This preserves complete punchlines and prevents manually copied speech drifting from the transcript. The colophon explains the machine transcription and its limits; reading pages use the plain label **Dialogue**.

Each panel starts with a compact **`.panel-heading` header** containing the numbered title and linked time span, followed by the frame and caption. The full **`.panel-dialogue` Dialogue** block is the figure's immediate next element sibling; description, camera, action, sound/music, visual gag and notes follow it. The heading stays together and avoids a print break before its frame. Each paragraph and word appears once; this display order does not change source-word assignment or derived panel boundaries.

First panel starts at **0**; subsequent starts strictly increase. Each panel runs until the next panel's start, and the last runs until `durationSeconds`. The selected frame and all annotated sound cues must lie inside that effective range. Panel starts are narrative grouping boundaries, not claims of exact shot-cut onset unless verified. Keep every meaningful image and discovered gag; don't alter a genuine cue timestamp merely to fit a panel.

## Reviewed transcript display corrections

Raw `transcripts/<id>.json`, TXT and SRT remain immutable source evidence and retain their source links. Optional reviewed **`transcript-corrections/<id>.json`** applies only explicitly evidenced display corrections. Missing files mean no reviewed corrections, not a legacy fallback; malformed or invalid present files invalidate the storyboard in normal and strict rendering.

Exact schema:

```json
{
  "id": "youtube-id",
  "corrections": [
    {
      "startSeconds": 698.36,
      "endSeconds": 699.2,
      "originalText": " Chucky R. Law,",
      "replacementText": "Tiocfaidh ár lá,",
      "evidence": "Explicit user observation identifying this Irish phrase",
      "provenance": "user-observation"
    }
  ]
}
```

All keys shown are mandatory and no additional keys are accepted. `id` must match the video. All strings must be nonempty, and provenance is exactly `user-observation`. Each correction must uniquely match a contiguous raw word span: start equals the first word's exact `start`, end equals the last word's exact `end`, and `originalText` equals the words' exact concatenation with **no trimming or whitespace normalization**. Intervals must be finite, nonnegative, positive-length, chronological, nonoverlapping and within storyboard duration; source-word spans must also be chronological and nonoverlapping.

Replacement text appears once at the first source-word position, retaining the original span's surrounding whitespace. Reading pages show corrected words without inline correction flags or evidence paragraphs. The colophon's per-video sources link the correction JSON alongside the unchanged raw transcript. All source-word slots and timestamps remain consumed exactly once for the source-word invariant (98051 words across this collection); corrected lexical word counts are reported separately in renderer output and may legitimately differ. No source file is rewritten, and no filler or surrounding speech is omitted.

Corrections must stay within one panel and one source/display paragraph; a span crossing either boundary is invalid in normal and strict rendering. The renderer rejects such spans rather than moving words, changing panels or displaying a replacement early while suppressing its later source slots. The **Dialogue** label and corrected text are identical for reading and search; correction evidence is never indexed.


## Images, narrative and camera/action evidence

`frameNumber` MUST be an actual viewed `frames[].number` in `visual/<id>/index.json`. Renderer crops that tile from the existing sheet. Read ALL indexed sheets. Native rereads: `bun visual-extract.ts still <id> <seconds>`; source video remains available. Movement requires adjacent-frame/source evidence; a still does not establish a pan, tilt or zoom. Static maps, photos and title cards are valid panels, with no invented human action. Distinguish image cuts from camera movement.

Indexed sheet paths are `visual/<id>/sheet-NNNN.jpg` (regular sampling) or `visual/<id>/extra-NNNNNN.jpg` (supplemental frames appended by `visual-extract.ts add`). Both use the same 3×4 tile layout as `layout`; the renderer accepts no other sheet path.

Each assigned video author may register supplemental frames for **their own video only** with `bun visual-extract.ts add <id> <seconds...>`. Inspect the returned images and use the returned frame numbers in dedicated payoff panels. Keep existing frame numbers and original sheets intact; never edit the index manually. Reviewers remain read-only, and no second writer registers frames for that video concurrently.

Select useful key panels across the whole chronological narrative, including all discovered visual-gag setups/payoffs and ending/credits. No fixed panel cap and no dumping every five-second sample. Related setup/payoff panels must explicitly identify their connected gag: never say no gag just because the chosen setup image precedes the comic insert.

## Sound and audiovisual gags

Every panel has `sound`; empty [] means **not annotated**, not silence. ASR/VAD omits non-speech effects. Source listening or explicit user observations can identify cues. Reader captions describe those sounds and their role in the scene; provenance, timing uncertainty and supporting evidence belong in the colophon. Classifier-only and spectrogram-only candidates remain in the colophon-linked working notes, not panel captions. Waveform timing establishes an acoustic event, not its identity. Never invent sounds from an image. Sound effects are separate from full spoken dialogue.

User-confirmed Franklin episode10 gags: recurring Law & Order **dun-dun**, its repetition and the narrator's **every time** reaction; and the **slide-projector/slide-change audio gag** during the lecture setup and sequence. Capture these as connected audiovisual setups/payoffs and later callbacks. The mistaken-identity **Sargon** sequence likewise needs connected setup/correction/reveal captions, not null gag fields on related panels.

Every rendered video includes a concise **Narration** paragraph after its premise and before the panel board. It describes the gravelly, level voice through the contractor/home-addition comparison without claiming an actual age or occupation. The colophon attributes the comparison to commenters relayed by the user, records the original perceived 50 to 60-year-old retiree/contractor persona and the user's unverified approximate age of 20, and makes clear that neither is independently sourced biography. The contrast with memes and urbanist/architecture/history commentary is user-observed. This is a paraphrase, not a fabricated direct quote or comment citation. Individual user-observed French pronunciation gags belong in relevant panel sound annotations, not per-term renderer logic.

User-confirmed Franklin episode 9 sound effect: **11:54.3** identifies the containing utterance/context following the structural critique, not the measured effect onset. The narrator says “Okay, so let's talk about the Rothschilds.” The word “Rothschilds” has reverb/echo mocking the neo-Nazi `(((Rothschilds)))` dogwhistle. Its existing sound cue uses **727.14 s (12:07.14)** as the approximate machine-word anchor, not a measurement of the effect's onset. Record this as a user-observed sound effect in the existing panel `sound` array, not a soundtrack work or classifier hypothesis.

## Mandatory soundtrack sidecars

Every selected completed storyboard requires **`soundtracks/<id>.json`**, including all 24 videos in this collection. The authored storyboard shape above is unchanged. Missing, malformed or semantically invalid soundtrack metadata invalidates that storyboard in both normal and `--strict` rendering; there is no optional-file fallback. `--strict` continues to require every selected storyboard and existing source-range/title/duration checks.

The exact sidecar shape is:

```json
{
  "id": "youtube-id",
  "title": "Exact matching storyboard title",
  "coverage": "Actual credit inspection and fingerprint coverage, sources and limits",
  "tracks": [
    {
      "title": "Evidence-established work title",
      "composer": null,
      "performer": null,
      "identification": "audio-fingerprint",
      "evidence": "Local evidence path, quoted credit or recognition-service response",
      "samples": [
        {
          "startSeconds": 120,
          "endSeconds": 140,
          "evidence": "Local submitted-excerpt path and matching service response"
        }
      ]
    }
  ]
}
```

No additional or missing keys are accepted at any level. All strings must be nonempty; `composer` and `performer` alone may be `null` when unestablished. Composer and performer are distinct roles, never inferred from each other or a famous recording. Sidecar `id` and `title` must equal the storyboard's. Evidence is escaped plaintext, including citations/quotes/service responses; it is never interpreted as HTML, script or a data-supplied URL.

`identification` is exactly **`video-credit`**, **`audio-fingerprint`**, **`audio-reference-match`** or **`user-observation`**. A credit identifies a credited work, not a proven audible occurrence: every `video-credit` track MUST have `samples: []` and unknown timing. Every `audio-fingerprint` or `audio-reference-match` track MUST have at least one evidenced matched excerpt in `samples`; an empty sample list cannot support either identification. Use the method actually exercised, with its acoustic evidence, not a method alias. Do not speculate about a title, composer, performance or timing. Empty `tracks: []` means no works identified by the recorded evidence, **not silence or absence of music**.

`user-observation` records a work identified by an explicit user observation, not a video credit or independent acoustic identification. Cite the user's observation in `evidence`; leave composer and performer `null` unless separately established. Its `samples` MUST be empty: approximate user-provided context belongs in the existing panel `sound` annotation, not submitted matched-excerpt intervals or invented continuous cue boundaries. The colophon's soundtrack evidence labels this provenance **User observation (not independently auditioned)** and explains that exact cue boundaries are not established. Acoustic sample intersection rendering does not add panel music for these tracks; the authored user-observed panel annotation remains visible.

Fingerprint intervals describe the actual submitted recognition-service excerpts containing the matched work (including the existing 12-second samples), **not** track start/end or continuous cue boundaries. Reference-match intervals describe actual same-recording acoustic comparison excerpts, which can be two seconds, not a guessed larger music span. For either method, each sample must have finite numbers with `startSeconds >= 0`, `endSeconds > startSeconds` and `endSeconds <= durationSeconds`; starts must be chronological within each track. Overlap is permitted. Store each actual excerpt window and sample-specific evidence, rather than expanding a match across panels or the full video.

`audio-reference-match` is labelled **“Audio reference match (same-recording acoustic evidence)”**. It combines an evidence-established source work identity/credit with an actual same-recording acoustic match to reference audio; a model genre/title guess is not enough. Evidence identifies the reference and comparison proof, including relevant controls. The Chinese anthem case uses reference video `UctriMuXYS0`, the target video's “March of the Volunteers” credit and the acoustic results in `qa/anthem-reference/results.json`: matched two-second excerpts occur within the independently compared 53–61-second and 1203–1215-second contexts. Those broader contexts are not sample intervals or precise continuous anthem cue boundaries. Composer and performer remain `null` unless separately established; a reference uploader is not inferred to be the performer.

The reading-page **Soundtrack** section precedes the panel board and displays work titles with only established composer and performer credits. Coverage, identification methods, unknown credits/timing and raw evidence appear in the colophon's expandable per-video sources. Panels retain confirmed authored sound/effect annotations; classifier-only candidates and their evidence stay in the colophon-linked working notes. Named music is added under **Sound / music** only for positive intersections of an `audio-fingerprint` or `audio-reference-match` sample `[startSeconds, endSeconds)` with the panel's derived half-open span. A sample crossing several panels appears in each intersecting panel with its full actual window, labelled **Excerpt**, and its work title. The timestamp links to the actual sample start. The colophon explains that these are matched comparison excerpts, not full-panel or continuous music cues. Touching endpoints alone do not count as an intersection. Credited untimed works and user observations receive no guessed sample-based music cue.

This metadata layer leaves panel boundaries, exact SVG tile crops and the onset-based full-transcript word assignment/counting unchanged. Raw sources move to the colophon, while video links use YouTube. Main verifies all 24 mandatory sidecars with the final strict render, adversarial schema/provenance/timing cases, and browser checks at 320/375/414/768px plus print.


## Optional generative audio-model sidecars

`audio-annotations/<id>.json` is separate, optional model evidence linked from the colophon. Absence means no recorded model analysis, never silence or no audio. An invalid present sidecar invalidates its storyboard in both normal and strict rendering, like reviewed corrections. Raw producer files are read-only; model observations do not alter authored JSON, supporting Markdown, full dialogue, user-confirmed gags or the accepted soundtrack catalogue. Neither the model header nor its unreviewed per-panel observations appear on reading pages.

The producer/renderer contract requires:

- `id`: the validated 11-character video ID, matching the storyboard.
- `model`: nonempty string `name`, `revision`, `precision`, `device`. Additional producer audit metadata (GPU name, loader, package versions, encoder dtype and generation settings) is retained in the raw JSON but is not interpreted as HTML or URLs.
- `coverage`: `status` exactly `pending`, `partial` or `complete`; finite positive `sourceDurationSeconds` matching storyboard duration within the existing one-second duration tolerance; `windowSeconds: 40`, `overlapSeconds: 5`; integer nonnegative `processedWindows`, `erroredWindows`, `totalWindows`. The expected schedule starts every 35 seconds and stops at the first excerpt reaching source end: `totalWindows = max(1, ceil((sourceDurationSeconds - 40) / 35) + 1)`.
- `source`: nonempty string `path` (provenance only, never followed), SHA-256 hex `sha256`, positive integer `frames` and `sampleRate` whose ratio matches source duration within one sample. Root `prompt` is a nonempty string; `resumeIdentity` is an object containing SHA-256 hex `promptSha256`. The nested `resumeIdentity.promptSha256` is the canonical prompt hash location; no root-hash fallback or alternate-shape alias is supported.
- `windows`: chronological unique positive source-bounded excerpts, each with integer `windowIndex`, finite nonnegative `startSeconds`/`endSeconds` matching its scheduled excerpt, `status` exactly `valid` or `error`, SHA-256 hex `inputSha256`, positive integer `samples`/`sampleRate` consistent with its interval within two samples, and finite nonnegative `elapsedSeconds`.
- Valid windows require nonempty string `rawResponse`, nonnegative integer `inputTokens` and `outputTokens`, and `events` (possibly empty). Each event requires nonempty string `description` and `evidence`, and `kind` exactly `music`, `sound-effect`, `vocal-delivery`, `speech-correction` or `audio-gag-candidate`.
- Error windows require `rawResponse` as a string or `null` when generation failed, an `error` object with nonempty string `type`/`message` and string `traceback`; they **omit `events`**. Token counts may be omitted if generation failed before creating them, but must be nonnegative integers whenever present. Invalid output is not equivalent to a successful empty event list. Additional producer audit fields and `coverage.unionProof` are inert evidence; displayed coverage is recomputed from actual validated intervals rather than trusting a producer boolean.

`processedWindows` must equal the actual count of valid windows; `erroredWindows` must equal the actual error count. Pending cannot have completed valid windows. Complete requires **all expected windows valid and the valid-window union covering the entire source without gaps**, starting at zero and reaching source end. Partial/pending remain explicitly incomplete even if some windows succeed; failed excerpts and their errors are disclosed separately. No-event windows generate no panel sound caption and do not establish silence.

Each video's expandable colophon sources include escaped model/revision/precision/device provenance, literal coverage status, actual valid/expected/failed counts, recomputed union duration and a raw JSON link built only from the validated video ID. Source paths, event evidence and model/raw response strings never become data-supplied links or executable markup.

The colophon explains that the model can miss or misclassify brief effects, including known TV stings, and that user-confirmed annotations take precedence. Paired calibration evidence is `qa/audio-llm/calibration/trials/ef6026fba6f0455d87fd1059b2ed37f1/paired-report.json`, with semantic review alongside it; the properly bounded 42 to 52-second and 35 to 75-second follow-ups are `qa/audio-llm/calibration/trials/6fa192191a1d47a1b6224691ddf5bb98/follow-up-report.json`. V1 emitted routine false speech corrections; controlled same-input V2 trials suppressed ordinary-speech noise and described orchestral music, but did not reliably identify the known Law & Order stings, even in those bounded follow-ups. This supports a specific brief-effect limitation, not a claim that the model cannot hear audio or can perfectly detect gags. Evaluation ground truth and controls remain separate from the generation prompt.

The two completed V1 video analyses are preserved as archive history; canonical V2 processing starts pending and becomes partial/complete only according to actual new valid coverage. The full scheduled V2 pass retains 40-second windows with five-second overlap across all 1293 windows/all 24 videos: these calibration excerpts do not change the canonical schema or scheduled coverage, and are not substitutes for the full pass. Existing source dialogue, source-word consumption, user corrections, user-confirmed gags and accepted soundtrack annotations remain unchanged.

The completed V2 run is recorded in `qa/audio-llm/manifest.json`: all 24 videos, 1293/1293 valid windows, zero failed windows and gap-free unions covering all 44922.7470625 seconds of decoded source audio. Model revision is `ae9e1690543ffd5c0221dc27f79834d0294cba00`, BF16 on the RTX 3090; canonical prompt SHA-256 is `a4076e3bb69a8df7867edb8b9276b86752b0fd3a6dcfcd0abd7ef7e3f0b023be`. Full input processing is not proof that every effect, gag or musical work was detected correctly.

Unreviewed model events remain in the raw linked audio sidecars and are not appended to panel **Sound / music**. Their coarse excerpt windows retain their full bounds and evidence; they are not exact effect starts, continuous cue boundaries or full-panel claims. Named work/genre guesses remain candidates; they never become composer/performer catalogue identifications or replacement dialogue. Existing authored sounds and acoustic-match excerpt boundaries are unchanged.

Main independently reviews this layer and runs the real strict render, adversarial sidecar/correction fixtures and browser/print smoke checks; renderer authors do not run mid-flight tests, builds, rendering or formatters.

## Main-page collection search

The main index exposes a labelled native `type="search"` field, **“Search transcripts”**, with help explaining full-dialogue and title/series/episode-label/video-ID search. Metadata remains HTML-escaped in each card's `data-search` attribute. The renderer also emits **`search-index.json`**, a static root array of `{id, title, series, label, panels: [{number, startSeconds, text}]}` records for validated rendered entries only. Each panel's full `text` comes from the same corrected display `views[].paragraphs[].words[].text` as the Dialogue renderer, joined in paragraph order without dropping words. Correction evidence and superseded raw ASR spellings are not indexed. Panel numbers/timestamps and source-word assignments remain unchanged. Publication rejects an index at or above 25 MB rather than truncating it.

The inline script fetches the JSON once and retains its normalized contents in memory. While loading, the input accepts a queued query, all videos remain visible, and a polite live status states that transcript search is loading. Once ready, the current query applies. HTTP, JSON, malformed-entry or missing-rendered-video failures display an explicit load error and reload-to-retry instruction, disable the field and leave all videos visible, with no fake zero-results state or misleading metadata-only fallback. No JavaScript leaves a disabled input, visible explanation and the full collection.

Metadata, full panel dialogue and queries share one normalization contract: Unicode NFKD decomposition, lowercase conversion, removal of combining accent marks, `&` expansion to `and`, removal of straight/curly apostrophes, and conversion of other punctuation/whitespace to trimmed single spaces. Thus **“Law and Order”** matches **“Law & Order”**, and accented or punctuation-varied searches remain useful. All normalized query terms must occur within the same full panel passage, or within the video's combined metadata; they cannot be scattered across different panels to create a false passage match. Empty/whitespace-only queries show every video without passage results. Native clear and Escape restore the collection; Escape retains input focus.

Matching videos show expandable **“X matching dialogue passages”** lists containing every matching panel, with no silent cap. Each passage has a timestamped `storyboards/<id>.html#panel-N` link and an approximately 220-character, word-boundary excerpt centered around the first matching term, preserving original display text. Excerpt location is found against original word offsets, not by applying normalized offsets to unnormalized text. DOM nodes and `textContent` render excerpts, queries never become HTML, and link IDs come from the validated collection. A polite live status reports visible/total videos and matching dialogue passage counts; metadata-only video matches correctly contribute zero dialogue passages.

An explicit no-results message appears only after the index is ready and no videos match. Cards, empty series groups and their table-of-contents links hide/restore together, with explicit `[hidden]` CSS overriding grid/flex display rules. Only populated groups receive initial TOC links. The search input inherits existing typography, palette and focus-ring tokens and fits narrow screens; search controls do not print. Its generated published dependency is `search-index.json`: no backend, framework, package or separate JavaScript asset. Empty-query status reports a plain video count, without production-progress or readiness copy.

## Reading pages and colophon

The main page's H1 and HTML title are exactly **donoteat01 illustrated storyboards**. Its lede gives brief reading/search instructions. The main page and every valid video page link **Colophon** in their footer; generated `colophon.html` links back to `index.html` and uses the same `doc()` wrapper, tokens and stylesheet.

Reading pages retain duration, panel count, normal previous/next/all navigation, premise and confirmed annotations. The numbered panel heading stays above the frame, and the plain **Dialogue** block is the frame's immediate next sibling. Figure captions show the useful timestamp only. Frames and source-video links open the corresponding YouTube video; no public page links a local `.mkv`. Coverage, frame/sheet coordinates, source-word or token accounting, model progress and raw evidence are absent from reading-page chrome.

Empty optional Sound / music, Visual gag and Notes rows are omitted rather than asserting silence or repeating inspection status. An empty transcribed span keeps the `.panel-dialogue` container immediately after the frame but omits its empty field; this does not establish that no speech occurred.

The colophon explains the downloaded 24-video collection (12h28m43s), Whisper large-v3 transcription, AI-assistant review of sampled frames/contact sheets and user corrections. It does not imply continuous human viewing or verification of every gag. It records the local Qwen2.5-Omni-7B audio pass on the RTX 3090, its 40-second excerpts with five-second overlap, all 24 videos and 1293 valid windows, and zero processing errors. Completion describes input processing, not exhaustive or correct detection of every gag.

Music identification explains credit-based work names and partial Shazam coverage: 371 of 501 planned base samples were attempted, with 370 HTTP-successful requests and one HTTP 429 failure that stopped recognition. HTTP success does not mean a work was identified. The Chinese anthem's exact reference is `UctriMuXYS0`, linked by the "March of the Volunteers" credit in source `8LysiXf-DJU`. Independent acoustic matches identify the same recording in two source videos: `8LysiXf-DJU` within 53 to 61 seconds, and `LdeirDrinWk` within 1203 to 1215 seconds. The second is a same-recording match, not a separate credit. Matched two-second excerpts and broader context remain distinct; unknown composers/performers and untimed credits remain unknown.

The well-diagram music in Franklin episode 6 (`5MrkfLP25Rg`) is C418's recording of **Minecraft**, from **Minecraft - Volume Alpha**, confirmed against the artist-hosted reference at `https://c418.bandcamp.com/track/minecraft`. The curated per-video colophon link is `qa/artesian-music/canonical-proof.json`. Cached and fresh Shazam requests returned unmatched HTTP 200 responses; this is an acoustic-reference identification, not a fingerprint match. Official composer credit establishes Daniel Rosenfeld (C418); no distinct performer is established. Reference audio, source WAVs and raw primary HTML remain local; only curated JSON evidence is published.

Expandable per-video sources contain current authored board JSON, supporting story sheet, raw transcripts, reviewed correction/audio/soundtrack sidecars, visual index and all indexed sheet links. Available QA resources and per-video coverage/evidence are centralized here. Root `process-notes.json` preserves original working prose and is linked once as **Original working notes**. Publishing must copy generated `colophon.html`, `process-notes.json` and all linked existing evidence resources alongside `search-index.json`; no new package dependency is required.

Public colophon resources include curated coverage/proof records, canonical data and source credits, not private operational logs, checkpoints or download-state archives.

## Completion and honesty

Finish both supporting Markdown and storyboard JSON, inspect all indexed sheets, report sheet/frame counts and targeted rereads. Historical assertions are attributed to presenter. Sampling is not continuous viewing and may miss brief overlays/gags; state those limits in the colophon and preserve specific uncertainty where it changes a panel's meaning. Sound provenance and machine speech evidence remain reachable in the colophon. Shared renderer performs schema/timing validation and source-word coverage checks; main verifies actual browser layout.

## Supplemental brief-insert review

`bun brief-inserts.ts [--workers 2] [--hwaccel cpu|cuda] [id ...]` generates separate `qa/brief/<id>/` evidence without editing original visual indices or authored boards. CPU decoding is the default. Explicit CUDA applies to fresh cut scans and candidate-image extraction; command failures are reported, not retried on CPU. Decoder choice is recorded in signatures/provenance. No IDs selects every video in `selection.json`. It checkpoints 120-second scan chunks, candidate images and sheets; rerunning resumes completed work. After a hard kill, remove only the affected empty `qa/brief/<id>/.lock` directory.

Candidate JPEGs are decoded in groups of **missing** requests whose neighboring gaps are ≤4 seconds and total span is ≤120 seconds, not one FFmpeg process per image. Actual emitted PTS map to every covered request; nearby requests sharing one source frame retain separate candidate paths/entries. Per-image atomic markers preserve resumability, while successful groups remove temporary JPEGs/filter scripts. Candidate rules and counts are unchanged; there is no group candidate cap. Resume with the same command, for example `bun brief-inserts.ts --hwaccel cuda --workers 2 --reuse-manifest qa/brief/reuse.json --allow-reuse-width`.

Fresh scans use normalized source PTS, 240px scene detection and score ≥0.15. Candidates come from neighboring qualifying cuts 0.15–4 seconds apart with no original indexed frame strictly between, plus qualifying cuts without an indexed frame within one second after. Pair candidates are sampled inside the interval; duplicate requested times merge. There is no arbitrary candidate cap and no automatic gag classification.

`qa/brief/<id>/index.json` records actual sampled timestamps, individual candidate images, sheet paths and scan provenance. `qa/brief/summary.json` contains per-video counts, paths and errors for the requested run. Review the timestamped contact sheets, then register **only confirmed novel gags or meaningful visual inserts** using `bun visual-extract.ts add <id> <seconds>` before referencing their frame numbers in storyboards.

For completion-only progress, run `bun pipeline-monitor.ts --brief`. It reports each selected video's candidate/sheet counts once and exits when every selected index is complete. It reads evidence JSON only; no video decoding occurs.

To avoid repeating completed peer scans, pass `--reuse-manifest qa/brief/reuse.json --allow-reuse-width`. Manifest entries are `{ "video-id": { "path": "/absolute/metadata.txt", "width": 320, "threshold": 0.1, "complete": true, "normalized": false } }`. Default logs contain full-source FFmpeg `metadata=print` records with both `pts_time` and `lavfi.scene_score`. Full-source bare timestamps are supported with `"format": "times"`; raw selected-frame showinfo uses `"format": "showinfo"`. These scoreless formats explicitly persist `score: null` and `scoreLowerBound` from the known capture threshold, and analyze **all** captured cuts at that lower threshold (for example .12), rather than falsely asserting an exact score ≥.15. The effective analysis threshold and uncertainty are recorded in provenance/sampling. All reuse requires full completed logs, never still-running files. Reused source PTS are normalized against the first decoded frame. Widths other than 240 require explicit opt-in and are recorded per video: score ≥0.15 at a recorded width is **not** claimed equivalent to score ≥0.15 at 240px.

This supplements sparse evidence, not continuous viewing. Gradual fades, small overlays and inserts without qualifying cuts can still be missed; audio/narration-cue rereads remain essential.
