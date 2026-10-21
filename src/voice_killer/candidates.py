"""Reference-voice candidates: sherpa-onnx diarization, keep only spans where exactly one speaker talks.

Add-on for the web UI; the remove/extract/convert flow never imports this.
"""
import numpy as np
from . import engine

DIR = engine.ROOT / "models" / "diarize"
SEG = DIR / "sherpa-onnx-pyannote-segmentation-3-0" / "model.onnx"
EMB = DIR / "emb.onnx"
MARGIN = 0.3  # seconds dropped on both sides of an overlap
MIN_LEN = 2.0  # engine needs >= 1 s of voice; shorter pieces are poor references
MAX_LEN = 10.0
MINOR_TOTAL = 5.0  # a voice with less solo speech than this is probably noise or an outlier; the UI folds it
AUTO_THRESHOLD = 0.7  # 0.5 split one speaker in two on a user recording; 0.9 merged both jobs-2007 speakers. ponytail: untuned between
PER_SPEAKER = 5
SR = 16000


def available():
    return SEG.is_file() and EMB.is_file()


def _diarizer(num_speakers=0):
    import sherpa_onnx as so
    cfg = so.OfflineSpeakerDiarizationConfig(
        segmentation=so.OfflineSpeakerSegmentationModelConfig(pyannote=so.OfflineSpeakerSegmentationPyannoteModelConfig(model=str(SEG)), num_threads=4),
        embedding=so.SpeakerEmbeddingExtractorConfig(model=str(EMB), num_threads=4),
        clustering=so.FastClusteringConfig(num_clusters=num_speakers or -1, threshold=AUTO_THRESHOLD),
    )
    return so.OfflineSpeakerDiarization(cfg)


def solo_spans(segments, margin=MARGIN, min_len=MIN_LEN):
    """segments: [(start, end, speaker)] -> (solo [(start, end, speaker)], overlaps [(start, end)])."""
    cuts = sorted({t for s, e, _ in segments for t in (s, e)})
    solo, over = [], []
    for a, b in zip(cuts, cuts[1:]):
        who = {k for s, e, k in segments if s <= a and e >= b}
        if len(who) > 1:
            over.append([a, b])
        elif who:
            solo.append([a, b, next(iter(who))])
    merged = []  # adjacent overlap pieces become one band
    for o in over:
        if merged and o[0] - merged[-1][1] < 1e-6:
            merged[-1][1] = o[1]
        else:
            merged.append(o)
    out = []
    for a, b, k in solo:
        pieces = [(a, b)]
        for os, oe in merged:  # cut the margin-grown overlap out of every solo piece
            pieces = [p for s, e in pieces for p in ((s, min(e, os - margin)), (max(s, oe + margin), e))]
        out += [[s, e, k] for s, e in pieces if e - s > 1e-6]
    joined = []  # re-join pieces split only by a segment boundary of the same speaker
    for s, e, k in sorted(out):
        if joined and joined[-1][2] == k and s - joined[-1][1] < 1e-6:
            joined[-1][1] = e
        else:
            joined.append([s, e, k])
    return [j for j in joined if j[1] - j[0] >= min_len], [tuple(m) for m in merged]


def find(x, offset=0.0, num_speakers=0):
    """x: 16 kHz mono float32. Times in the result are shifted by offset (seconds). num_speakers 0 = automatic."""
    res = _diarizer(num_speakers).process(x.astype(np.float32)).sort_by_start_time()
    solo, over = solo_spans([(r.start, r.end, r.speaker) for r in res])
    by, total = {}, {}
    for s, e, k in solo:
        total[k] = round(total.get(k, 0) + e - s, 2)
        if e - s > MAX_LEN:  # keep the middle: the edges are where turns start and end
            s, e = (s + e - MAX_LEN) / 2, (s + e + MAX_LEN) / 2
        by.setdefault(k, []).append((s, e))
    speakers = []
    for k, spans in by.items():
        spans.sort(key=lambda p: p[0] - p[1])
        speakers.append({"total": total[k], "is_minor": total[k] < MINOR_TOTAL, "candidates": [{"start": round(s + offset, 2), "end": round(e + offset, 2)} for s, e in spans[:PER_SPEAKER]]})
    speakers.sort(key=lambda p: -p["total"])
    for i, sp in enumerate(speakers, 1):
        sp["id"] = i
    return {"speakers": speakers, "overlaps": [{"start": round(s + offset, 2), "end": round(e + offset, 2)} for s, e in over]}
