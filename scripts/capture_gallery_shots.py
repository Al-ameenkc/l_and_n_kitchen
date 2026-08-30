"""Capture cleaner gallery shots for proposal."""

from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "proposal-screenshots"
OUT.mkdir(exist_ok=True)

ADMIN_PASSWORD = None
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    if line.startswith("ADMIN_PASSWORD="):
        ADMIN_PASSWORD = line.split("=", 1)[1].strip()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Customer
        mobile = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
        )
        page = mobile.new_page()
        page.goto("http://localhost:3000", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(3500)
        page.screenshot(path=str(OUT / "01-customer-menu-home.png"))

        # Swipe right to wish
        surface = page.locator(".swipe-surface").first
        box = surface.bounding_box()
        if box:
            sx = box["x"] + box["width"] * 0.5
            sy = box["y"] + box["height"] * 0.55
            page.mouse.move(sx, sy)
            page.mouse.down()
            page.mouse.move(sx + 220, sy, steps=16)
            page.mouse.up()
            page.wait_for_timeout(1000)
        page.screenshot(path=str(OUT / "01c-customer-after-swipe.png"))

        page.locator('button[aria-label="Open wish list"]').click(force=True)
        page.wait_for_timeout(1200)
        page.screenshot(path=str(OUT / "04-customer-wishlist-sheet.png"))

        # Close and open detail via Add path from card - use "Add to wish list" from detail
        page.keyboard.press("Escape")
        page.wait_for_timeout(400)
        # Click dish name area often opens detail - try Info in header of card
        # From MenuApp, detail opens from CardStack tap - use force on dish title text
        title = page.get_by_text("GOLDEN YAM", exact=False)
        if title.count() == 0:
            # any dish name
            pass
        else:
            # If wishlist still open, escape again
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)

        # Open detail: many UIs use a details button; try pressing center-upper of card after closing sheet
        if box:
            page.mouse.click(box["x"] + box["width"] * 0.5, box["y"] + box["height"] * 0.22)
            page.wait_for_timeout(1000)
        # If we see Back button, detail is open
        if page.locator('button:has-text("Back")').count():
            page.screenshot(path=str(OUT / "03-customer-dish-detail.png"))
        page.close()
        mobile.close()

        # Admin
        desk = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
        page = desk.new_page()
        page.goto("http://localhost:3000/admin", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(800)
        page.screenshot(path=str(OUT / "05-admin-login.png"))
        page.locator("#admin-password").fill(ADMIN_PASSWORD)
        page.locator('button:has-text("Sign in")').click()
        page.wait_for_timeout(2800)

        for label, name in [
            ("Orders", "06-admin-orders"),
            ("Categories", "07-admin-categories"),
            ("Dishes", "08-admin-dishes"),
            ("Waiters", "09-admin-waiters"),
        ]:
            page.locator(f'button:has-text("{label}")').first.click()
            page.wait_for_timeout(1200)
            if label == "Dishes":
                # scroll to dish list
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                page.wait_for_timeout(600)
                page.screenshot(path=str(OUT / "08b-admin-dishes-list.png"))
                page.evaluate("window.scrollTo(0, 0)")
                page.wait_for_timeout(400)
            page.screenshot(path=str(OUT / f"{name}.png"))

        browser.close()
        print("done")


if __name__ == "__main__":
    main()
