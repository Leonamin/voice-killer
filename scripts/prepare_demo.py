"""Prepare the exact research source; audio stays in ignored data/."""
from pathlib import Path
import json
import subprocess
import sys
from voice_killer.cli import sha256
root = Path(__file__).resolve().parents[1]
source = root / "data/source/iphone-2007.wav"
source.parent.mkdir(parents=True, exist_ok=True)
url = "https://www.youtube.com/watch?v=MnrJzXM7a6o"
if not source.exists():
    subprocess.run([sys.executable, "-m", "yt_dlp", "--no-playlist", "-f", "ba", "-x",
                    "--audio-format", "wav", "--write-info-json", "-o",
                    str(source.with_suffix(".%(ext)s")), url], check=True)
enroll = root / "data/jobs-enroll.wav"
if not enroll.exists():
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-n", "-ss", "12.4", "-i",
                    str(source), "-t", "7", "-ar", "16000", "-ac", "1", str(enroll)], check=True)
manifest = {"url": url, "source_sha256": sha256(source), "enrollment_range_seconds": [12.4, 19.4],
            "enrollment_sha256": sha256(enroll), "note": "Public upload of 2007 Macworld iPhone introduction excerpt; not full keynote."}
(root / "data/source-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(source)
