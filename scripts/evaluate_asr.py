"""Same recognizer/settings for A/B samples; transcripts are a proxy, not human scores."""
from pathlib import Path
import json
import numpy as np
from faster_whisper import WhisperModel
from voice_killer.cli import read_audio

root=Path(__file__).resolve().parents[1]
model=WhisperModel("base.en",device="cpu",compute_type="int8",download_root=str(root/"models/whisper"),cpu_threads=4)
rows={}
files=[("reveal_original",root/"outputs/reveal-mask.original.wav",0,None),
       ("reveal_filtered",root/"outputs/reveal-final.wav",0,None),
       ("stream_filtered",root/"outputs/stream-v2/filtered.wav",0,None)]
for start in [250,420,580]:
    files.extend([(f"long_{start}_original",root/"data/source/iphone-2007.wav",start,20),
                  (f"long_{start}_filtered",root/"outputs/iphone-2007-final.wav",start,20)])
for name,path,start,duration in files:
    waveform,_=read_audio(path,start,duration)
    segments,_=model.transcribe(waveform,beam_size=3,language="en",condition_on_previous_text=False)
    rows[name]=[{"start":s.start,"end":s.end,"text":s.text} for s in segments]
    print(name, rows[name],flush=True)
(root/"outputs/final-v2-asr.json").write_text(json.dumps({"model":"base.en","beam_size":3,"condition_on_previous_text":False,
    "warning":"ASR hallucinations occur on suppressed audio; not a human intelligibility test.","results":rows},indent=2)+"\n")
