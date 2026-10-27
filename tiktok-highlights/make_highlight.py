"""Assemble clips/*.mp4 + meme + musique en vidéo TikTok 1080x1920.
Usage: python3 make_highlight.py [musique.mp3] [--duree 8]
"""
import glob, subprocess, sys, os, tempfile

args = [a for a in sys.argv[1:] if not a.startswith("--")]
music = args[0] if args else (sorted(glob.glob("music/*.mp3") + glob.glob("music/*.m4a")) or [None])[0]
clips = sorted(glob.glob("clips/*.mp4") + glob.glob("clips/*.mov"))
meme = "memes/exemple_meme.png"
SEG = float(sys.argv[sys.argv.index("--duree") + 1]) if "--duree" in sys.argv else 8
if not clips:
    sys.exit("Aucun clip dans clips/ — ajoute tes extraits .mp4")

tmp = tempfile.mkdtemp()
parts = []
for i, c in enumerate(clips):
    out = f"{tmp}/p{i}.mp4"
    # 9:16 recadré + léger zoom punch + flash blanc à l'impact (milieu du clip)
    vf = ("scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
          f"zoompan=z='if(between(on,{int(SEG*15)},{int(SEG*15)+8}),1.15,1)':d=1:s=1080x1920:fps=30,"
          f"fade=t=in:st={SEG/2}:d=0.1:color=white,fade=t=out:st={SEG/2+0.1}:d=0.15:color=white")
    subprocess.run(["ffmpeg","-y","-v","error","-t",str(SEG),"-i",c,"-an","-vf",vf,
                    "-r","30","-pix_fmt","yuv420p",out], check=True)
    parts.append(out)

lst = f"{tmp}/list.txt"
open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
joined = f"{tmp}/joined.mp4"
subprocess.run(["ffmpeg","-y","-v","error","-f","concat","-safe","0","-i",lst,"-c","copy",joined], check=True)

cmd = ["ffmpeg","-y","-v","error","-i",joined]
fc = "[0:v]null[v]"
if os.path.exists(meme):  # meme en bandeau sur les 2 premières secondes
    cmd += ["-i", meme]
    fc = "[1:v]scale=1080:-1[m];[0:v][m]overlay=0:0:enable='lt(t,2)'[v]"
if music:
    cmd += ["-i", music]
    ai = 2 if os.path.exists(meme) else 1
    cmd += ["-filter_complex", fc, "-map","[v]","-map",f"{ai}:a",
            "-af","afade=t=out:st=%f:d=1" % (SEG*len(clips)-1), "-shortest"]
else:
    cmd += ["-filter_complex", fc, "-map","[v]"]
cmd += ["-c:v","libx264","-preset","fast","-crf","20","-c:a","aac","output/highlight_tiktok.mp4"]
subprocess.run(cmd, check=True)
print("→ output/highlight_tiktok.mp4")
