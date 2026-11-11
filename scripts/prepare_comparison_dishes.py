"""Remove the pale matte left by the original prepared-dish cutout export.

Only the alpha mask is edited; the photographed plate and food are not retouched.
Run from the repository root with Pillow installed.
"""

from pathlib import Path
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1] / "assets" / "catalog"
MATTED_DISHES = (
    "aros-de-cebolla",
    "helado-paila-guanabana",
    "helado-paila-naranjilla",
    "helado-paila-naranjilla-hierbabuena",
    "papa-steak",
    "papas-air-fryer",
    "smoothie-green",
    "smoothie-orange",
    "waffle-glaseado",
)


def save_webp(image: Image.Image, path: Path) -> None:
    image.save(path, "WEBP", quality=88, method=6, exact=True)


for slug in MATTED_DISHES:
    source = ROOT / "prepared-cutout" / f"{slug}.png"
    image = Image.open(source).convert("RGBA")
    # In these nine exports, the matte was encoded at 18–234 alpha while the
    # photographed object has 255 alpha. A tiny blur softens only the cut edge.
    alpha = image.getchannel("A").point(lambda value: 255 if value >= 250 else 0)
    image.putalpha(alpha.filter(ImageFilter.GaussianBlur(0.7)))
    save_webp(image, source.with_suffix(".webp"))
    for width in (320, 640, 960):
        height = round(image.height * width / image.width)
        resized = image.resize((width, height), Image.Resampling.LANCZOS)
        save_webp(resized, ROOT / "responsive" / f"prepared-cutout-{slug}-{width}.webp")
    print(f"Prepared {slug}")
