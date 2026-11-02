"""Draws the demo page's past-work covers (public/demo/work-N.jpg) in the site's font (Noto Kufi Arabic) and
makes a short H.264 clip of each (public/demo/work-N.mp4): a slow zoom on its cover. Run: python3 scripts/demo-works.py"""
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "demo"
BOLD = str(ROOT / "assets/fonts/NotoKufiArabic-Bold.ttf")
REG = str(ROOT / "assets/fonts/NotoKufiArabic-Regular.ttf")
W, H = 540, 960

WORKS = [
    ("تجربة قهوة نجد", "Najd Coffee review", (175, 129, 96), (65, 38, 21)),
    ("رحلتي مع سفرات", "Trip with Safarat", (87, 169, 227), (13, 70, 123)),
    ("جوال بلس الجديد", "Jawal Plus unboxing", (152, 123, 233), (46, 23, 114)),
    ("عطر الشتاء", "Winter scent", (212, 173, 96), (90, 63, 16)),
    ("تمرين الصباح", "Morning workout", (234, 147, 94), (136, 42, 6)),
    ("تمور الواحة في رمضان", "Ramadan dates", (124, 188, 110), (28, 70, 32)),
]
CAPTION = "مثال لعمل سابق · صفحة تجريبية"


def gradient(top, bottom):
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        for x in range(W):
            t = min(1, max(0, (y / H) * 0.8 + (x / W) * 0.2))
            px[x, y] = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
    return img


def wrap(draw, text, font, width):
    words, lines, line = text.split(), [], ""
    for w in words:
        test = f"{line} {w}".strip()
        if draw.textlength(test, font=font, direction="rtl", language="ar") <= width or not line:
            line = test
        else:
            lines.append(line)
            line = w
    return lines + [line]


def cover(title, sub, top, bottom):
    img = gradient(top, bottom).convert("RGBA")
    deco = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(deco)
    d.ellipse((-110, -110, 290, 290), fill=(255, 255, 255, 46))
    d.ellipse((320, 260, 720, 660), fill=(0, 0, 0, 38))
    img = Image.alpha_composite(img, deco.filter(ImageFilter.GaussianBlur(2)))
    # Soft dark band at the bottom so the text reads on every colour.
    shade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for y in range(H // 2, H):
        sd.line([(0, y), (W, y)], fill=(0, 0, 0, int(110 * (y - H / 2) / (H / 2))))
    img = Image.alpha_composite(img, shade)
    draw = ImageDraw.Draw(img)
    big, small, tiny = ImageFont.truetype(BOLD, 50), ImageFont.truetype(BOLD, 24), ImageFont.truetype(REG, 18)
    lines = wrap(draw, title, big, W - 112)
    y = H - 145 - len(lines) * 74
    for line in lines:
        draw.text((W - 56, y), line, font=big, fill="white", anchor="ra", direction="rtl", language="ar")
        y += 74
    draw.text((56, H - 112), sub, font=small, fill=(255, 255, 255, 230), anchor="la")
    draw.text((W - 56, H - 66), CAPTION, font=tiny, fill=(255, 255, 255, 190), anchor="ra", direction="rtl", language="ar")
    return img.convert("RGB")


for i, (title, sub, top, bottom) in enumerate(WORKS, start=1):
    jpg = OUT / f"work-{i}.jpg"
    cover(title, sub, top, bottom).save(jpg, quality=86)
    # 5 s portrait clip: slow zoom on the cover, H.264 + yuv420p for Safari/iOS, no sound.
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-loop", "1", "-i", str(jpg), "-t", "5", "-r", "30",
        "-vf", "scale=1080:1920,zoompan=z='min(zoom+0.0008,1.08)':d=150:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=540x960:fps=30",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "30", "-preset", "slow", "-movflags", "+faststart", "-an",
        str(OUT / f"work-{i}.mp4"),
    ], check=True)
    print("ok", jpg.name)
