#!/usr/bin/env python3
"""Generate real-package + plated-food compositions for the recipe index.

The existing editorial photos are PORTRAIT images. Several already include the
pack in their lower half, so fitting them inside the narrow website cards (and
placing another pack on top) produces cropped/duplicated packaging. In the
production build, crop the FOOD-ONLY upper area and pair it with the original
catalog package, without recoloring/recreating the package artwork.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

WIDTH, HEIGHT = 1200, 720

# Rectangle coordinates are fractions of the original portrait photograph.
# These isolate the food from the package printed into three source photographs.
RECIPES = {
    "brochetas-carne-papas-rejilla-chimichurri": {
        "dish": "editorial/customer-potatoes-rejilla.webp",
        "crop": (0.14, 0.045, 0.995, 0.447),
        "pack": "catalog/cutout/papas-rejilla-clean.png",
    },
    "carne-plancha-papas-onduladas-salsa-ajo": {
        "dish": "editorial/customer-potatoes-onduladas.webp",
        "crop": (0.15, 0.020, 0.995, 0.605),
        "pack": "catalog/cutout/papas-ondulado-premium.webp",
    },
    "pollo-hierbas-aros-cebolla-ensalada-repollo": {
        "dish": "editorial/recipe-onion-chicken-plate.webp",
        "crop": (0.14, 0.035, 0.995, 0.735),
        "pack": "catalog/cutout/aros-cebolla.webp",
    },
    "waffles-iceman-franui-frutos-rojos": {
        "dish": "editorial/recipe-waffles-franui-clean.webp",
        "crop": (0.18, 0.030, 0.995, 0.695),
        "pack": "catalog/waffle.webp",  # Authentic BLACK, HORIZONTAL carton.
        "box": True,
    },
    "bowl-salmon-teriyaki-edamame-mayonesa-picante": {
        "dish": "editorial/customer-salmon-edamame.webp",
        "crop": (0.28, 0.020, 0.995, 0.365),
        "pack": "catalog/cutout/edamame-grano.webp",
    },
}


def food_crop(image: Image.Image, fractions: tuple[float, ...]) -> Image.Image:
    x1, y1, x2, y2 = fractions
    l, t, r, b = (
        round(x1 * image.width), round(y1 * image.height),
        round(x2 * image.width), round(y2 * image.height)
    )
    return image.crop((l, t, r, b))


def trim_pack(im: Image.Image, is_box: bool) -> Image.Image:
    """Crop transparent or empty outside margins, NEVER trim printed packaging."""
    im = im.convert("RGBA")
    if is_box:
        return im
    alpha = im.getchannel("A")
    if alpha.getextrema()[0] < 250:
        bounds = alpha.point(lambda v: 255 if v > 12 else 0).getbbox()
        if bounds:
            return im.crop(bounds)
    # Some catalog assets have a flat white background rather than real alpha.
    # Trim only fully white OUTSIDE pixels; never erase white lower packaging.
    from PIL import ImageChops
    light = Image.new("RGB", im.size, "white")
    diff = ImageChops.difference(im.convert("RGB"), light)
    bounds = diff.point(lambda v: 255 if v > 14 else 0).getbbox()
    return im.crop(bounds) if bounds else im


def compose(asset_dir: Path, slug: str, item: dict) -> None:
    source = asset_dir / item["dish"]
    package = asset_dir / item["pack"]
    if not source.is_file() or not package.is_file():
        raise FileNotFoundError(f"Recipe {slug}: missing {source if not source.is_file() else package}")

    canvas = Image.new("RGBA", (WIDTH, HEIGHT), "#eef4f7")
    draw = ImageDraw.Draw(canvas)
    # A quiet neutral studio backdrop and a clearly defined photographic area.
    divider = 405 if item.get("box") else 380
    draw.rectangle((0, 0, divider, HEIGHT), fill="#e9f2f6")
    draw.line((divider, 34, divider, HEIGHT - 34), fill="#dce9ef", width=2)
    x0, y0, x1, y1 = divider + 16, 25, WIDTH - 23, HEIGHT - 25
    dst_size = (x1 - x0, y1 - y0)

    with Image.open(source) as food_source:
        food = food_crop(food_source.convert("RGB"), item["crop"])
        food = ImageOps.fit(food, dst_size, method=Image.Resampling.LANCZOS, centering=(0.52, 0.47))
        mask = Image.new("L", dst_size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, dst_size[0]-1, dst_size[1]-1), radius=28, fill=255)
        canvas.paste(food.convert("RGBA"), (x0, y0), mask)

    with Image.open(package) as img:
        pack = trim_pack(img, item.get("box", False))
        # The waffle is a wide black carton; the other packages are tall / broad bags.
        if item.get("box"):
            max_w, max_h = divider - 40, 260
        else:
            max_w, max_h = divider - 46, 505
        pack.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
        px = (divider - pack.width) // 2
        py = (HEIGHT - pack.height) // 2 + (40 if item.get("box") else 45)
        # Subtle soft shadow beneath the intact product artwork.
        from PIL import ImageFilter
        shadow = Image.new("RGBA", (pack.width + 44, pack.height + 36))
        alpha = pack.getchannel("A").filter(ImageFilter.GaussianBlur(10))
        soft = Image.new("RGBA", pack.size, (26, 43, 60, 38))
        shadow.paste(soft, (22, 9), alpha)
        shadow = shadow.filter(ImageFilter.GaussianBlur(7))
        canvas.alpha_composite(shadow, (max(0, px-22), max(0, py-9)))
        canvas.alpha_composite(pack, (px, py))

    target = asset_dir / "editorial" / f"recipe-card-{slug}.webp"
    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(target, "WEBP", quality=83, method=6)


def build_cards(asset_dir: Path) -> int:
    for slug, details in RECIPES.items():
        compose(asset_dir, slug, details)
    return len(RECIPES)
