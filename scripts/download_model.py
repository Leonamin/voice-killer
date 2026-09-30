"""Download only the official REAL-TSE public checkpoint bundle."""
from pathlib import Path
import hashlib
import zipfile
import gdown

root = Path(__file__).resolve().parents[1]
archive = root / "models/real-tse.zip"
archive.parent.mkdir(exist_ok=True)
if not archive.exists():
    gdown.download(id="1M4UqK2A2EeHmQ0pCevYqBgaYn3RvklgC", output=str(archive))
expected_path = root / "model-provenance.json"
if expected_path.exists():
    import json
    expected = json.loads(expected_path.read_text())["archive_sha256"]
    h = hashlib.sha256()
    with archive.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    if h.hexdigest() != expected:
        raise SystemExit("Checkpoint archive hash mismatch; inspect before using")
with zipfile.ZipFile(archive) as z:
    target = root / "models/real-tse"
    for item in z.infolist():
        p = Path(item.filename)
        if p.is_absolute() or ".." in p.parts:
            raise SystemExit("Unsafe archive member")
    for item in z.infolist():
        if not (target / item.filename).exists():
            z.extract(item, target)
print(root / "models/real-tse/spk_emb_100")
