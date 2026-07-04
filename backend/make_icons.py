from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

icons_dir = Path("app/static/icons")
icons_dir.mkdir(parents=True, exist_ok=True)

def create_icon(size: int):
    img = Image.new("RGBA", (size, size), (7, 11, 22, 255))

    gradient = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(gradient)

    for y in range(size):
        ratio = y / size
        r = int(34 + (139 - 34) * ratio)
        g = int(211 + (92 - 211) * ratio)
        b = int(238 + (246 - 238) * ratio)
        gdraw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    margin = int(size * 0.08)
    radius = int(size * 0.22)

    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill=255
    )

    img = Image.alpha_composite(
        img,
        Image.composite(
            gradient,
            Image.new("RGBA", (size, size), (0, 0, 0, 0)),
            mask
        )
    )

    draw = ImageDraw.Draw(img)
    center = size // 2

    dark_radius = int(size * 0.27)
    draw.ellipse(
        [
            center - dark_radius,
            center - dark_radius,
            center + dark_radius,
            center + dark_radius
        ],
        fill=(7, 11, 22, 255)
    )

    orb_radius = int(size * 0.18)
    draw.ellipse(
        [
            center - orb_radius,
            center - orb_radius,
            center + orb_radius,
            center + orb_radius
        ],
        fill=(56, 189, 248, 255)
    )

    text = "AI"

    try:
        font = ImageFont.truetype("arialbd.ttf", int(size * 0.13))
    except:
        font = ImageFont.load_default()

    text_box = draw.textbbox((0, 0), text, font=font)
    text_w = text_box[2] - text_box[0]
    text_h = text_box[3] - text_box[1]

    draw.text(
        (center - text_w / 2, center - text_h / 2 - int(size * 0.01)),
        text,
        fill=(7, 11, 22, 255),
        font=font
    )

    output_path = icons_dir / f"icon-{size}.png"
    img.save(output_path)
    print(f"Created {output_path}")

create_icon(192)
create_icon(512)
