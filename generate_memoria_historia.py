from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

root = Path(r'c:\projetos rafa ia\App BibliaKids\bibliakids\memoria\historia')

levels = {
    'facil': ['Noé', 'Arca', 'Davi', 'Jonas', 'Criança'],
    'medio': ['Noé', 'Arca', 'Davi', 'Jonas', 'Moisés', 'Mar Vermelho', 'Jó', 'Rute', 'Sansão', 'José'],
    'dificil': ['Noé', 'Arca', 'Davi', 'Jonas', 'Moisés', 'Mar Vermelho', 'Jó', 'Rute', 'Sansão', 'José', 'Salomão', 'Abel', 'Elias', 'Pedro', 'Paulo'],
}

palettes = [
    ('#0f172a', '#1d4ed8', '#fbbf24'),
    ('#0b1120', '#0ea5e9', '#f59e0b'),
    ('#111827', '#22c55e', '#f8fafc'),
    ('#1f2937', '#f97316', '#fde68a'),
    ('#0f172a', '#8b5cf6', '#fbbf24'),
    ('#0b1120', '#f59e0b', '#fef3c7'),
    ('#111827', '#10b981', '#d1fae5'),
    ('#1f2937', '#ef4444', '#fef2f2'),
    ('#0f172a', '#06b6d4', '#cffafe'),
    ('#111827', '#a78bfa', '#f5f3ff'),
]

try:
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 44)
    font_big = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 74)
    font_small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 32)
except Exception:
    font = ImageFont.load_default()
    font_big = ImageFont.load_default()
    font_small = ImageFont.load_default()


def draw_background(draw, dark, mid, accent):
    for y in range(1024):
        t = y / 1024
        r = int(int(dark[1:3], 16) + (int(mid[1:3], 16) - int(dark[1:3], 16)) * t)
        g = int(int(dark[3:5], 16) + (int(mid[3:5], 16) - int(dark[3:5], 16)) * t)
        b = int(int(dark[5:7], 16) + (int(mid[5:7], 16) - int(dark[5:7], 16)) * t)
        draw.line((0, y, 1024, y), fill=(r, g, b))

    # light rays
    cx, cy = 512, 180
    for angle in range(0, 360, 22):
        rad = angle * 3.14159 / 180
        x1 = cx + 150 * __import__('math').cos(rad)
        y1 = cy + 150 * __import__('math').sin(rad)
        x2 = cx + 520 * __import__('math').cos(rad)
        y2 = cy + 520 * __import__('math').sin(rad)
        draw.line((x1, y1, x2, y2), fill=(255, 233, 150), width=12)
    draw.ellipse((360, 60, 660, 360), fill=(255, 221, 118), outline=(255, 242, 180), width=8)


def draw_scene(draw, title, idx):
    # ground/rocks
    draw.rectangle((0, 790, 1024, 1024), fill=(96, 83, 58))
    for i in range(20):
        x = i * 60
        draw.ellipse((x, 740, x + 80, 890), fill=(110, 102, 82))

    # large stylized character at center
    draw.rounded_rectangle((350, 415, 670, 860), radius=44, fill=(247, 240, 229), outline=(115, 90, 72), width=5)
    draw.ellipse((360, 260, 660, 430), fill=(185, 125, 82), outline=(88, 62, 45), width=5)
    draw.arc((420, 280, 600, 340), 170, 360, fill=(70, 45, 26), width=5)
    draw.line((445, 355, 485, 330), fill=(65, 45, 26), width=5)
    draw.line((580, 355, 540, 330), fill=(65, 45, 26), width=5)
    draw.polygon([(285, 445), (745, 445), (785, 850), (245, 850)], fill=(27, 96, 180), outline=(12, 55, 120), width=6)
    draw.polygon([(430, 445), (590, 445), (610, 820), (410, 820)], fill=(247, 240, 229), outline=(170, 160, 145), width=4)

    # two lions on left/right
    lion_left = [(120, 620), (260, 620), (320, 860), (80, 860)]
    lion_right = [(740, 620), (900, 620), (960, 860), (680, 860)]
    draw.ellipse((90, 520, 320, 780), fill=(224, 176, 75), outline=(141, 92, 32), width=5)
    draw.ellipse((700, 520, 930, 780), fill=(224, 176, 75), outline=(141, 92, 32), width=5)
    draw.ellipse((130, 570, 170, 620), fill=(0, 0, 0))
    draw.ellipse((240, 570, 280, 620), fill=(0, 0, 0))
    draw.ellipse((780, 570, 820, 620), fill=(0, 0, 0))
    draw.ellipse((890, 570, 930, 620), fill=(0, 0, 0))
    draw.arc((160, 610, 250, 660), 200, 360, fill=(70, 45, 26), width=4)
    draw.arc((780, 610, 870, 660), 200, 360, fill=(70, 45, 26), width=4)

    # text
    draw.text((150, 60), 'MEMÓRIA BÍBLICA', fill=(255, 255, 255), font=font_small, stroke_width=2, stroke_fill=(34, 45, 58))
    draw.rounded_rectangle((50, 60, 150, 110), radius=15, fill=(255, 255, 255, 180))
    draw.text((100, 82), str(idx), fill=(15, 23, 42), font=font_small, anchor='mm')

    title_text = title.upper()
    bbox = draw.textbbox((0, 0), title_text, font=font_big)
    text_width = bbox[2] - bbox[0]
    draw.text(((1024 - text_width) / 2, 900), title_text, fill=(255, 255, 255), font=font_big, stroke_width=3, stroke_fill=(20, 32, 50))


for level, labels in levels.items():
    folder = root / level
    folder.mkdir(parents=True, exist_ok=True)
    for idx, title in enumerate(labels, start=1):
        img = Image.new('RGB', (1024, 1024), '#0f172a')
        draw = ImageDraw.Draw(img)
        dark, mid, accent = palettes[(idx - 1) % len(palettes)]
        draw_background(draw, dark, mid, accent)
        draw_scene(draw, title, idx)
        img.save(folder / f'{idx}.jpg', quality=95)
        print(f'gerado {folder / f"{idx}.jpg"}')

print('OK')
