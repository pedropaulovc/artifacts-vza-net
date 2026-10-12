# Local GPU speech transcription

## Launch

From this workspace:

```sh
.venv/bin/python transcribe.py --watch
```

This waits for the entire `selection.json` list, transcribes final merged files as they arrive, and exits successfully when all selected videos have complete outputs. Without `--watch`, it processes currently available media and exits nonzero if any selected video remains unfinished. Only `videos/<id>/<id>.mkv` is eligible: split format files, partial downloads, and captions are not inputs. A final MKV must be at least ten seconds old.

The existing `.venv` was created with `uv` using Python 3.14.3. Recreate the environment if needed:

```sh
uv venv .venv
uv pip install --python .venv/bin/python -r requirements-transcription.txt
```

Requirements: NVIDIA GPU/driver, `ffprobe` on PATH, free disk for model and outputs, and internet access on first launch to download Whisper `large-v3` into `.cache/whisper`. Installed CUDA 12 cuBLAS, cuDNN 9 and CUDA runtime libraries live in the venv; the script re-executes Python with their library paths before importing CTranslate2. No system CUDA toolkit installation is required. Observed GPU: RTX 3090, 24 GiB VRAM; approximately 5.2 GiB already occupied during setup. The installed package import/GPU inference has not been smoke-tested by the workflow author.

Defaults are `large-v3`, CUDA float16, batch size 8, beam size 5, English language, voice activity detection and word timestamps. Reduce `--batch-size` if other GPU users cause insufficient VRAM. Run one process per output directory; a filesystem lock prevents overlapping writers.

## Outputs and checkpoint behavior

For each ID:

- `transcripts/<id>.json`: full timestamped segment and word data, title/URL, language, media and decoded-audio durations, engine version/model/settings, original-media fingerprint, source info JSON reference when available, and explicit speech-transcription provenance. `complete: true` is written only after the entire segment iterator has finished.
- `transcripts/<id>.srt`: numbered timestamped subtitles.
- `transcripts/<id>.txt`: speech text in chronological order.
- `transcripts/<id>.partial.json`: diagnostic incomplete speech results, checkpointed approximately every 30 seconds of processing; never represented as a finished transcript.
- `transcripts/checkpoint.json` and `transcripts/transcribe.log`: per-video states, exceptions and processing positions.

Writes use temporary files and atomic replacement. Final JSON is the completion marker and is committed after SRT/TXT. Restart skips completed videos only when media fingerprint and transcription settings still match, and regenerates SRT/TXT from their final JSON. An interrupted or failed **current video restarts from the beginning**, intentionally avoiding chunk-boundary clipping, overlapping words or falsely marking a partial transcript complete. Previous completed videos are not retranscribed. Existing partial files are diagnostics, not resumable model state.

Input always begins at zero, including videos whose original watch URL contains a timestamp. No time limit, extract range, segment cap or URL timestamp is applied. The pipeline checks positive container duration and an audio stream, compares downloaded metadata duration when available, and checks full decoded-audio duration against container duration. Silence can produce no speech segments; the speech endpoint is not treated as the video endpoint. VAD can miss speech and Whisper can hallucinate or mishear: these are genuine ASR outputs, not manually verified quotations. Captions are not substituted or used in this workflow.

Failures retain diagnostic partial output and log a traceback. Watch mode retries failed videos with a 60-second backoff, at most three attempts per launch, then exits nonzero with unfinished IDs. A subsequent launch resets attempt counts. Missing files in watch mode wait indefinitely for acquisition. Ctrl-C during transcription saves partial diagnostics and exits 130; an external kill can lose the latest partial interval, but never commits an unfinished final JSON.
