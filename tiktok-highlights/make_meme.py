"""Génère un meme foot 1080x1920 (format TikTok). Usage: python3 make_meme.py"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
img = Image.new("RGB", (W, H), (20, 120, 40))
d = ImageDraw.Draw(img)
for y in range(0, H, 240):  # bandes de pelouse
    d.rectangle([0, y, W, y + 120], fill=(26, 140, 48))
d.ellipse([W//2-180, H//2-180, W//2+180, H//2+180], outline="white", width=8)
d.line([0, H//2, W, H//2], fill="white", width=8)

def font(size):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",):
        try: return ImageFont.truetype(p, size)
        except OSError: pass
    return ImageFont.load_default()

def caption(text, y):
    f = font(76)
    d.text((W//2, y), text, font=f, anchor="mm", fill="white",
           stroke_width=10, stroke_fill="black", align="center")

caption("LE GARDIEN\nQUAND IL VOIT\nLE TIR ARRIVER", 330)
d.rectangle([140, 700, W-140, 1250], outline="white", width=6)
d.text((W//2, 975), "[ TON EXTRAIT\nVIDÉO ICI ]", font=font(80), anchor="mm",
       fill="white", align="center")
caption("MOI : « J'AI LA MAIN »\nLE BALLON : VITESSE MAX", 1520)
d.text((W//2, 1780), "@tonpseudo  •  #foot #highlights", font=font(46),
       anchor="mm", fill="white", stroke_width=4, stroke_fill="black")
img.save("memes/exemple_meme.png")
print("memes/exemple_meme.png")
