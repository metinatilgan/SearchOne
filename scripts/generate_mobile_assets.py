import math
import os
import struct
import sys
import zlib

from PIL import Image


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSET_DIR = os.path.join(ROOT, "mobile", "assets")
DEFAULT_SOURCE_IMAGES = [
    os.path.join(ASSET_DIR, "source-icon.png"),
    "/Users/metinmacos/Downloads/SearchOne.png",
]


def write_png(path, width, height, pixel_fn):
    raw_rows = []
    for y in range(height):
      row = bytearray([0])
      for x in range(width):
          row.extend(pixel_fn(x, y, width, height))
      raw_rows.append(bytes(row))

    def chunk(kind, data):
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    png = bytearray(b"\x89PNG\r\n\x1a\n")
    png.extend(chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)))
    png.extend(chunk(b"IDAT", zlib.compress(b"".join(raw_rows), 9)))
    png.extend(chunk(b"IEND", b""))

    with open(path, "wb") as file:
        file.write(png)


def lerp(a, b, t):
    return int(a + (b - a) * t)


def icon_pixel(x, y, width, height):
    cx = width / 2
    cy = height / 2
    dx = x - cx
    dy = y - cy
    dist = math.sqrt(dx * dx + dy * dy) / (width / 2)
    t = min(1, max(0, (x + y) / (width + height)))

    bg = (
        lerp(12, 2, t),
        lerp(91, 124, t),
        lerp(76, 102, t),
        255,
    )

    grid = (x % 96 < 3) or (y % 96 < 3)
    if grid and dist < 1.18:
        bg = (min(bg[0] + 16, 255), min(bg[1] + 28, 255), min(bg[2] + 24, 255), 255)

    mark_outer = 250 < x < 774 and 258 < y < 766
    mark_inner = 344 < x < 680 and 352 < y < 672
    horizontal = 470 < y < 556 and 344 < x < 680
    vertical = 470 < x < 556 and 352 < y < 672

    if mark_outer and not mark_inner:
        return (255, 253, 247, 255)
    if horizontal or vertical:
        return (255, 253, 247, 255)
    if 650 < x < 738 and 650 < y < 738:
        if abs((x - 694) - (y - 694)) < 32:
            return (200, 116, 43, 255)

    return bg


def splash_pixel(x, y, width, height):
    base = (246, 243, 234, 255)
    grid = (x % 88 < 2) or (y % 88 < 2)
    if grid:
        base = (232, 239, 233, 255)

    cx = width / 2
    cy = height / 2
    size = min(width, height) * 0.28
    if abs(x - cx) < size and abs(y - cy) < size:
        local_x = int((x - (cx - size)) / (size * 2) * 1024)
        local_y = int((y - (cy - size)) / (size * 2) * 1024)
        return icon_pixel(local_x, local_y, 1024, 1024)

    return base


def main():
    os.makedirs(ASSET_DIR, exist_ok=True)

    source_image = sys.argv[1] if len(sys.argv) > 1 else first_existing_source()
    if os.path.exists(source_image):
        generate_from_source(source_image)
        return

    write_png(os.path.join(ASSET_DIR, "icon.png"), 1024, 1024, icon_pixel)
    write_png(os.path.join(ASSET_DIR, "adaptive-icon.png"), 1024, 1024, icon_pixel)
    write_png(os.path.join(ASSET_DIR, "splash-icon.png"), 1242, 2688, splash_pixel)


def generate_from_source(source_image):
    image = Image.open(source_image).convert("RGBA")
    square = center_crop_square(image)
    icon = flatten(square).resize((1024, 1024), Image.Resampling.LANCZOS)

    icon.save(os.path.join(ASSET_DIR, "icon.png"), "PNG", optimize=True)
    icon.save(os.path.join(ASSET_DIR, "adaptive-icon.png"), "PNG", optimize=True)

    splash = Image.new("RGB", (1242, 2688), "#061b4b")
    splash_icon = icon.resize((940, 940), Image.Resampling.LANCZOS)
    splash.paste(splash_icon, ((1242 - 940) // 2, (2688 - 940) // 2))
    splash.save(os.path.join(ASSET_DIR, "splash-icon.png"), "PNG", optimize=True)


def first_existing_source():
    for source_image in DEFAULT_SOURCE_IMAGES:
        if os.path.exists(source_image):
            return source_image
    return DEFAULT_SOURCE_IMAGES[0]


def center_crop_square(image):
    width, height = image.size
    size = min(width, height)
    left = (width - size) // 2
    top = (height - size) // 2
    return image.crop((left, top, left + size, top + size))


def flatten(image):
    background = Image.new("RGB", image.size, "#061b4b")
    background.paste(image, mask=image.getchannel("A"))
    return background


if __name__ == "__main__":
    main()
