import numpy as np
import soundfile as sf
from fastapi.testclient import TestClient
from voice_killer import web


def post(tmp_path, **form):
    p = tmp_path / "a.wav"
    sf.write(p, np.random.default_rng(0).normal(0, .1, 32000).astype(np.float32), 16000)
    with p.open("rb") as f:
        return TestClient(web.app).post("/api/process", files={"audio": ("a.wav", f)}, data={"start": 0, "ref_start": 0, "ref_end": 2, **form})


def test_end_out_of_range_is_400(tmp_path):
    r = post(tmp_path, end=99, mode="remove")
    assert r.status_code == 400 and "처리" in r.json()["detail"]


def test_convert_bad_steps_is_400(tmp_path):
    r = post(tmp_path, end=2, mode="convert", steps=7)
    assert r.status_code == 400 and "steps" in r.json()["detail"]


def test_ws_invalid_enroll_seconds_sends_error():
    with TestClient(web.app).websocket_connect("/ws/stream") as ws:
        ws.send_text('{"enroll_seconds": 0}')
        assert "error" in ws.receive_json()


def test_candidates_range_is_400(tmp_path, monkeypatch):
    monkeypatch.setattr(web.candidates, "available", lambda: True)
    p = tmp_path / "a.wav"
    sf.write(p, np.zeros(16000, np.float32), 16000)
    with p.open("rb") as f:
        r = TestClient(web.app).post("/api/candidates", files={"audio": ("a.wav", f)}, data={"start": 0, "end": 99})
    assert r.status_code == 400
