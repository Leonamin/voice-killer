"""Seed-VC worker: run by .venv-seedvc/bin/python. stdin JSON lines in, stdout JSON lines out, READY on stderr."""
import argparse, glob, json, os, sys, tempfile, time
reply = sys.stdout
sys.stdout = sys.stderr  # stdout is reserved for replies; library prints go to stderr
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "vendor", "seed-vc")
os.chdir(root); sys.path.insert(0, root)
import torch
torch.set_num_threads(8)
import inference as inf

parts = inf.load_models(argparse.Namespace(fp16=False, f0_condition=False, checkpoint=None, config=None))
inf.load_models = lambda args: parts  # ponytail: inference.main reloads models per call; patch it to reuse
print("READY", file=sys.stderr, flush=True)
for line in sys.stdin:
    try:
        q = json.loads(line)
        t = time.time()
        with tempfile.TemporaryDirectory() as d:
            inf.main(argparse.Namespace(source=q["source"], target=q["reference"], output=d, diffusion_steps=int(q["steps"]), length_adjust=1.0,
                     inference_cfg_rate=0.7, f0_condition=False, auto_f0_adjust=False, semi_tone_shift=0, fp16=False, checkpoint=None, config=None))
            os.replace(glob.glob(d + "/*.wav")[0], q["output"])
        msg = {"ok": True, "seconds": time.time() - t}
    except Exception as e:
        msg = {"ok": False, "error": f"{type(e).__name__}: {e}"}
    reply.write(json.dumps(msg) + "\n"); reply.flush()
