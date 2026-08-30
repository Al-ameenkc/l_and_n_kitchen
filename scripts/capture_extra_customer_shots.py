"""Extra customer screenshots: dish detail + wishlist."""

from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "proposal-screenshots"
OUT.mkdir(exist_ok=True)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
        )
        page = ctx.new_page()
        page.goto("http://localhost:3000", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(3500)

        # Open wish list empty/filled via aria-label
        page.locator('button[aria-label="Open wish list"]').click(force=True)
        page.wait_for_timeout(1000)
        page.screenshot(path=str(OUT / "04-customer-wishlist-sheet.png"))
        print("wishlist")

        # Close sheet - click outside or close button
        close = page.locator('button[aria-label*="lose" i], button:has-text("Close")')
        if close.count():
            close.first.click(force=True)
        else:
            page.keyboard.press("Escape")
        page.wait_for_timeout(600)

        # Open dish detail - look for info / name tap areas in HeaderBar or card
        # Many decks open detail from a chevron or title; try double-tap center of swipe surface
        surface = page.locator(".swipe-surface").first
        if surface.count():
            box = surface.bounding_box()
            if box:
                page.mouse.dblclick(box["x"] + box["width"] / 2, box["y"] + box["height"] * 0.35)
                page.wait_for_timeout(1200)
        page.screenshot(path=str(OUT / "03-customer-dish-detail.png"))
        print("detail")

        # If detail didn't open, still keep a nice mid-scroll menu shot
        page.screenshot(path=str(OUT / "01b-customer-menu-mid.png"))

        # Swipe right to add to wishlist (drag)
        surface = page.locator(".swipe-surface").first
        if surface.count():
            box = surface.bounding_box()
            if box:
                sx = box["x"] + box["width"] * 0.5
                sy = box["y"] + box["height"] * 0.5
                page.mouse.move(sx, sy)
                page.mouse.down()
                page.mouse.move(sx + 180, sy, steps=12)
                page.mouse.up()
                page.wait_for_timeout(900)
                page.screenshot(path=str(OUT / "01c-customer-swipe-wish.png"))
                print("swipe wish")

        page.locator('button[aria-label="Open wish list"]').click(force=True)
        page.wait_for_timeout(1000)
        page.screenshot(path=str(OUT / "04b-customer-wishlist-filled.png"))
        print("wishlist filled")

        browser.close()
        print("done")


if __name__ == "__main__":
    main()
