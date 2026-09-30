import subprocess
import sys
import numpy as np
import soundfile as sf


def run_cli(*args):
    return subprocess.run([sys.executable, "-c", "from voice_killer.cli import main; main()", *map(str,args)],capture_output=True,text=True)


def test_cli_refuses_input_overwrite(tmp_path):
    audio=tmp_path/"input.wav"
    sf.write(audio,np.ones(16000)*.05,16000)
    original=audio.read_bytes()
    result=run_cli(audio,"--enroll",audio,"--output",audio,"--force")
    assert result.returncode==2
    assert "overwrite an input" in result.stderr
    assert audio.read_bytes()==original


def test_cli_refuses_silent_enrollment_before_loading_model(tmp_path):
    mixture=tmp_path/"mix.wav"; enrollment=tmp_path/"enroll.wav"
    sf.write(mixture,np.ones(16000)*.05,16000)
    sf.write(enrollment,np.zeros(16000),16000)
    result=run_cli(mixture,"--enroll",enrollment,"--output",tmp_path/"out.wav")
    assert result.returncode==2
    assert "enrollment" in result.stderr
    assert not (tmp_path/"out.wav").exists()
