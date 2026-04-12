from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "icons"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def make_icon(size: int, filename: str) -> None:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background gradient
    c1 = (15, 118, 110)  # teal deep
    c2 = (6, 95, 70)  # emerald dark
    c3 = (15, 118, 160)  # petrol blue
    for y in range(size):
        t = y / (size - 1)
        if t < 0.55:
            u = t / 0.55
            r = lerp(c1[0], c2[0], u)
            g = lerp(c1[1], c2[1], u)
            b = lerp(c1[2], c2[2], u)
        else:
            u = (t - 0.55) / 0.45
            r = lerp(c2[0], c3[0], u)
            g = lerp(c2[1], c3[1], u)
            b = lerp(c2[2], c3[2], u)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    radius = int(size * 0.22)
    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    img.putalpha(mask)
    draw = ImageDraw.Draw(img)

    # Inner highlight border
    stroke = max(2, int(size * 0.018))
    inset = int(size * 0.055)
    draw.rounded_rectangle(
        [inset, inset, size - inset, size - inset],
        radius=int(size * 0.18),
        outline=(255, 255, 255, 45),
        width=stroke,
    )

    # Stylized "S road"
    road_w = max(6, int(size * 0.12))
    p0 = (int(size * 0.68), int(size * 0.20))
    p1 = (int(size * 0.28), int(size * 0.34))
    p2 = (int(size * 0.70), int(size * 0.66))
    p3 = (int(size * 0.32), int(size * 0.82))
    draw.line([p0, p1, p2, p3], fill=(255, 255, 255, 245), width=road_w, joint="curve")

    # Dashed center line
    lane_w = max(2, int(size * 0.018))
    dash = int(size * 0.06)
    gap = int(size * 0.045)
    dashed_points = [p0, p1, p2, p3]
    for i in range(len(dashed_points) - 1):
        x1, y1 = dashed_points[i]
        x2, y2 = dashed_points[i + 1]
        dx, dy = x2 - x1, y2 - y1
        seg_len = max(1, int((dx * dx + dy * dy) ** 0.5))
        n = max(1, seg_len // (dash + gap))
        for j in range(n):
            t0 = (j * (dash + gap)) / seg_len
            t1 = min(1.0, (j * (dash + gap) + dash) / seg_len)
            sx, sy = int(x1 + dx * t0), int(y1 + dy * t0)
            ex, ey = int(x1 + dx * t1), int(y1 + dy * t1)
            draw.line([(sx, sy), (ex, ey)], fill=(15, 95, 95, 255), width=lane_w)

    # Arrow head + accent node
    arrow_size = int(size * 0.08)
    tip = (int(size * 0.31), int(size * 0.82))
    draw.polygon(
        [
            tip,
            (tip[0] + arrow_size, tip[1] - int(arrow_size * 0.35)),
            (tip[0] + int(arrow_size * 0.22), tip[1] - arrow_size),
        ],
        fill=(255, 255, 255, 250),
    )
    dot_r = int(size * 0.045)
    dot_center = (int(size * 0.68), int(size * 0.2))
    draw.ellipse(
        [
            dot_center[0] - dot_r,
            dot_center[1] - dot_r,
            dot_center[0] + dot_r,
            dot_center[1] + dot_r,
        ],
        fill=(251, 191, 36, 255),
    )

    img.save(OUT_DIR / filename, format="PNG")


def main() -> None:
    make_icon(512, "app-icon-512.png")
    make_icon(192, "app-icon-192.png")
    make_icon(180, "apple-touch-icon.png")
    make_icon(1024, "app-icon-1024.png")
    print("Icons generated in public/icons")


if __name__ == "__main__":
    main()
