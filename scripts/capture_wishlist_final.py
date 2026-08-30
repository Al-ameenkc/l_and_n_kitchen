"""Capture wishlist sheet with seeded localStorage + forced open."""

import json
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "proposal-screenshots"
OUT.mkdir(exist_ok=True)

menu = json.loads(urllib.request.urlopen("http://localhost:3000/api/menu").read())
dishes = menu["dishes"] if isinstance(menu, dict) else menu
sample = dishes[:4]
wishlist = [{"id": d["id"], "qty": i + 1} for i, d in enumerate(sample)]

persist = {
    "state": {
        "wishlist": wishlist,
        "trash": [],
        "activeShareId": None,
        "activeOrderId": None,
        "customerToken": None,
        "lockedItems": [],
        "orderStatus": None,
        "orderSnapshotItems": [],
    },
    "version": 3,
}
payload = json.dumps(persist)


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
        page.add_init_script(
            f"""
            localStorage.setItem('ln-kitchen-menu', {json.dumps(payload)});
            """
        )
        page.goto("http://localhost:3000", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(5000)

        # Close dish detail if tap/open happened
        back = page.locator('button:has-text("Back")')
        if back.count():
            back.first.click(force=True)
            page.wait_for_timeout(600)

        # Prefer heart button (always opens sheet)
        heart = page.locator('button[aria-label="Open wish list"]')
        if heart.count():
            heart.first.click(force=True)
        else:
            page.get_by_text("My Wish List", exact=False).first.click(force=True)
        page.wait_for_timeout(2000)

        # Confirm sheet
        has_close = page.locator('button:has-text("Close")').count() > 0
        print("sheet_open", has_close)
        page.screenshot(path=str(OUT / "04-customer-wishlist-sheet.png"), full_page=False)
        print("saved wishlist")

        # Also keep a clean home shot without sheet
        if has_close:
            page.locator('button:has-text("Close")').first.click(force=True)
            page.wait_for_timeout(600)
        page.screenshot(path=str(OUT / "01-customer-menu-home.png"))
        print("saved home")

        # Dish detail: open first card name area carefully via store detail? Click info
        # Use programmatic: find and click dish image then Back from detail after screenshot
        # Open detail by setting - click center upper of card with force after ensuring no overlay
        page.locator('button[aria-label="Open wish list"]').click(force=True)
        page.wait_for_timeout(400)
        page.locator('button:has-text("Close")').first.click(force=True)
        page.wait_for_timeout(400)

        # Click dish title text on card
        page.get_by_text(sample[0]["name"], exact=False).first.click(force=True)
        page.wait_for_timeout(1500)
        if page.locator('button:has-text("Back")').count():
            page.screenshot(path=str(OUT / "03-customer-dish-detail.png"))
            print("saved detail")

        browser.close()


if __name__ == "__main__":
    main()
