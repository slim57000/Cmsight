"""Highlights foot TikTok : clips/*.mp4|mov + memes vidéo (memes/*.mp4) + musique.
Effets par extrait : accélération -> ralenti à l'impact, punch zoom + shake, split RGB,
flash blanc, vignette, texte, meme vidéo (avec son) en incrustation.
Usage: python3 make_highlight.py [musique.mp3] [--duree 8] [--meme 2] [--texte "GOAL"]
"""
import glob, subprocess, sys, os, tempfile

def opt(n, d):
    return sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
args = [a for i, a in enumerate(sys.argv[1:], 1)
        if not a.startswith("--") and not sys.argv[i-1].startswith("--")]
music = args[0] if args else next(iter(sorted(glob.glob("music/*.mp3") + glob.glob("music/*.m4a"))), None)
find = lambda d: sorted(glob.glob(f"{d}/*.mp4") + glob.glob(f"{d}/*.mov"))
clips, memes = find("clips"), find("memes")
INTRO = opt("--intro", None)          # vidéo d'ouverture (ex. memes/malcolm.mov), jouée en entier au début
memes = [m for m in memes if m != INTRO]
MD = float(opt("--meme", 2))
TEXTES = opt("--texte", "ILS ONT PAS COMPRIS,LE GARDIEN : 404,SALE,CA SENT LE BUT,RESPECT").split(",")
if not clips: sys.exit("Aucun clip dans clips/ — ajoute tes extraits (.mp4/.mov)")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def run(cmd): subprocess.run(["ffmpeg", "-y", "-v", "error"] + cmd, check=True)

SLOW, SP = 0.8, 2.8                      # durée source ralentie, facteur de ralenti
import array, json

def probe_dur(c):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", c],
                       capture_output=True, text=True, check=True)
    return float(json.loads(r.stdout)["format"]["duration"])

def impact_time(c, seg):
    """Instant le plus bruyant (foule) -> impact ; milieu si pas d'audio."""
    p = subprocess.run(["ffmpeg", "-v", "error", "-t", str(seg), "-i", c, "-vn", "-ac", "1", "-ar", "8000",
                        "-f", "s16le", "-"], capture_output=True)
    a = array.array("h"); a.frombytes(p.stdout[:len(p.stdout)//2*2])
    w = 4000  # fenêtres de 0.5 s
    if len(a) < 4 * w: return seg / 2
    e = [sum(abs(x) for x in a[i:i+w]) for i in range(0, len(a) - w, w // 2)]
    t = e.index(max(e)) * 0.25
    return min(max(t, 1.5), seg - SLOW - 1.5)

def video_chain(T, TS, SEG, TXT):
    f0, f1 = int(T * 30), int(TS * 30)
    return (f"split[bg0][fg0];"
            f"[bg0]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5,eq=brightness=-0.15[bg];"
            f"[fg0]scale=-2:1400,crop=1080:1400[fg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30,"
            f"split=3[a][b][c];"
            f"[a]trim=0:{T},setpts=PTS-STARTPTS[a1];"
            f"[b]trim={T}:{T+SLOW},setpts=(PTS-STARTPTS)*{SP}[b1];"
            f"[c]trim={T+SLOW}:{SEG},setpts=PTS-STARTPTS[c1];"
            f"[a1][b1][c1]concat=n=3:v=1:a=0,"
            f"zoompan=z='if(between(on,{f0},{f1}),1+0.35*(on-{f0})/{f1-f0},1.04)':"
            f"x='iw/2-iw/zoom/2+if(between(on,{f0},{f1}),sin(on*2.7)*14,0)':"
            f"y='ih/2-ih/zoom/2+if(between(on,{f0},{f1}),cos(on*3.1)*14,0)':d=1:s=1080x1920:fps=30,"
            f"rgbashift=rh=10:bh=-10:enable='between(t,{T},{TS})',"
            f"eq=contrast=1.12:saturation=1.3,vignette=PI/4,"
            f"drawbox=x=0:y=0:w=iw:h=ih:color=white@0.85:t=fill:enable='between(t,{TS},{TS+0.12})',"
            f"drawtext=fontfile={FONT}:text='{TXT}':fontsize=110:fontcolor=white:borderw=12:bordercolor=black:"
            f"x=(w-tw)/2:y=330+sin(t*20)*8:enable='between(t,{T},{TS+0.8})'")

tmp = tempfile.mkdtemp()
parts = []
for i, c in enumerate(clips):
    out = f"{tmp}/p{i}.mp4"
    SEG = min(probe_dur(c), float(opt("--duree", 10)))
    T = impact_time(c, SEG); TS = T + SLOW * SP; DUR = SEG - SLOW + SLOW * SP
    print(f"{os.path.basename(c)}: impact à {T:.1f}s")
    enc = ["-t", f"{DUR}", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "44100", out]
    sil = ["-f", "lavfi", "-t", f"{DUR}", "-i", "anullsrc=r=44100:cl=stereo"]
    vc = video_chain(T, TS, SEG, TEXTES[i % len(TEXTES)])
    if memes:
        m = memes[i % len(memes)]
        fc = (f"[0:v]{vc}[b];[1:v]scale=760:-2,setpts=PTS-STARTPTS+{TS}/TB[mv];"
              f"[b][mv]overlay=(W-w)/2:H-h-260:enable='between(t,{TS},{TS+MD})':eof_action=pass[v]")
        try:   # avec le son du meme
            run(["-t", f"{SEG}", "-i", c, "-t", f"{MD}", "-i", m, "-filter_complex",
                 fc + f";[1:a]atrim=0:{MD},asetpts=PTS-STARTPTS,adelay={int(TS*1000)}|{int(TS*1000)},apad=whole_dur={DUR}[a]",
                 "-map", "[v]", "-map", "[a]"] + enc)
        except subprocess.CalledProcessError:  # meme sans audio
            run(["-t", f"{SEG}", "-i", c, "-t", f"{MD}", "-i", m] + sil +
                ["-filter_complex", fc, "-map", "[v]", "-map", "2:a"] + enc)
    else:
        run(["-t", f"{SEG}", "-i", c] + sil + ["-filter_complex", f"[0:v]{vc}[v]", "-map", "[v]", "-map", "1:a"] + enc)
    parts.append(out)

if INTRO:
    out = f"{tmp}/intro.mp4"
    run(["-i", INTRO, "-filter_complex",
         "[0:v]split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5[bg];"
         "[b]scale=1080:1920:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30[v]",
         "-map", "[v]", "-map", "0:a?", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "44100", "-ac", "2", out])
    parts.insert(0, out)

lst = f"{tmp}/list.txt"
open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
joined = f"{tmp}/joined.mp4"
run(["-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", joined])

os.makedirs("output", exist_ok=True)
final = "output/highlight_tiktok.mp4"
if music:
    tot = sum(float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",p],capture_output=True,text=True).stdout) for p in parts)
    run(["-i", joined, "-stream_loop", "-1", "-i", music, "-filter_complex",
         f"[1:a]volume=0.6,afade=t=out:st={tot-1}:d=1[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[a]",
         "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-shortest", final])
else:
    run(["-i", joined, "-c", "copy", final])
print("→", final)
