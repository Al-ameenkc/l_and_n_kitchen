"""Generate QR code for the L&N Kitchen menu URL."""

from pathlib import Path

import qrcode
from qrcode.constants import ERROR_CORRECT_H

URL = "https://l-and-n-kitchen.vercel.app/"
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "qrcodes"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_PNG = OUT_DIR / "ln-kitchen-menu-qr.png"
OUT_SVG = OUT_DIR / "ln-kitchen-menu-qr.svg"


def main() -> None:
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,
        box_size=12,
        border=4,
    )
    qr.add_data(URL)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    img.save(OUT_PNG)
    print(f"PNG: {OUT_PNG}")

    try:
        from qrcode.image.svg import SvgPathImage

        svg_qr = qrcode.QRCode(image_factory=SvgPathImage)
        svg_qr.add_data(URL)
        svg_qr.make(fit=True)
        svg_qr.make_image().save(OUT_SVG)
        print(f"SVG: {OUT_SVG}")
    except Exception as e:
        print(f"SVG skipped: {e}")

    print(f"URL: {URL}")


if __name__ == "__main__":
    main()
