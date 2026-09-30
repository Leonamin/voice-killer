"""Feed a file at wall-clock speed through the raw PCM streaming interface."""
from pathlib import Path
import json
import os
import subprocess
import sys
import threading
import time
import numpy as np
import soundfile as sf
from voice_killer.cli import read_audio

root=Path(__file__).resolve().parents[1]
out=root/"outputs/stream-v2"
out.mkdir(parents=True,exist_ok=True)
source,_=read_audio(root/"data/source/iphone-2007.wav",132,70)
sf.write(out/"original.wav",source,16000,subtype="FLOAT")
command=[sys.executable,"-c","from voice_killer.stream import main; main()",
         "--enroll",str(root/"data/jobs-enroll.wav"),"--report",str(out/"report.json")]
process=subprocess.Popen(command,cwd=root,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
# Wait for the ready message so model startup is not mistaken for stream latency.
while True:
    line=process.stderr.readline()
    if not line:
        raise RuntimeError("stream failed before readiness")
    print(line.decode().strip(),flush=True)
    if line.startswith(b"READY:"):
        break
chunks=[]
def read_output():
    while True:
        data=process.stdout.read(16000*2*4)
        if not data: break
        chunks.append(data)
reader=threading.Thread(target=read_output)
reader.start()
started=time.perf_counter()
for offset in range(0,len(source),32000):
    block=source[offset:offset+32000]
    # Samples become available only at the end of their two-second capture block.
    deadline=started+(offset+len(block))/16000
    time.sleep(max(0,deadline-time.perf_counter()))
    process.stdin.write(block.astype("<f4").tobytes())
    process.stdin.flush()
process.stdin.close()
reader.join()
code=process.wait()
if code: raise RuntimeError(process.stderr.read().decode())
y=np.frombuffer(b"".join(chunks),dtype="<f4")
assert len(y)==len(source) and np.isfinite(y).all()
sf.write(out/"filtered.wav",y,16000,subtype="FLOAT")
report=json.loads((out/"report.json").read_text())
report["driver_wall_seconds"]=time.perf_counter()-started
report["driver"]= "real-time-paced file -> stdin PCM -> streaming filter -> stdout PCM"
(out/"report.json").write_text(json.dumps(report,indent=2)+"\n")
print("stream finished",report["driver_wall_seconds"],flush=True)
