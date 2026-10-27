"""Génère un beat trap original (808 + snare + hi-hats, 140 bpm) -> music/trap_beat.mp3 (libre de droits)."""
import math, random, struct, wave, subprocess
SR, BPM = 44100, 140
step = 60 / BPM / 4              # double-croche
N = 16 * 8                       # 8 mesures
buf = [0.0] * int(SR * step * N + SR)
def add(t, samples):
    i = int(t * SR)
    for k, v in enumerate(samples):
        if i + k < len(buf): buf[i + k] += v
def kick(f0=110, d=0.6):
    return [math.sin(2*math.pi*(45 + (f0-45)*math.exp(-t*18))*t*1.0) * math.exp(-t*5) * 0.9
            for t in (k/SR for k in range(int(d*SR)))]
def snare():
    return [(random.uniform(-1,1)*0.5 + math.sin(2*math.pi*190*t)*0.4) * math.exp(-t*20)
            for t in (k/SR for k in range(int(0.2*SR)))]
def hat(v=0.18, d=0.04):
    return [random.uniform(-1,1)*v*math.exp(-t*90) for t in (k/SR for k in range(int(d*SR)))]
random.seed(7)
kicks = {0, 7, 10}   # motif trap par mesure de 16 pas
notes = [55, 55, 49, 62]  # basse 808 (Hz) par mesure
for bar in range(8):
    for s in range(16):
        t = (bar*16 + s) * step
        if s in kicks: add(t, kick())
        if s == 8: add(t, snare())
        add(t, hat(0.22 if s % 4 == 0 else 0.12))
        if s in (14, 15) and bar % 2: add(t, hat(0.15)); add(t + step/2, hat(0.15))
    f = notes[bar % 4]
    add(bar*16*step, [math.sin(2*math.pi*f*t)*math.exp(-t*1.2)*0.5 for t in (k/SR for k in range(int(3.4*SR)))])
m = max(abs(x) for x in buf) or 1
with wave.open("/tmp/beat.wav", "w") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, x/m*1.1))*32000)) for x in buf))
subprocess.run(["ffmpeg","-y","-v","error","-i","/tmp/beat.wav","-ac","2","-b:a","192k","music/trap_beat.mp3"], check=True)
print("music/trap_beat.mp3")
