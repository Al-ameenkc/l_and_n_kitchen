"""Capture L&N proposal screenshots — Grill category, 10s image load wait."""

import json
import os
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "proposal-screenshots"
OUT.mkdir(exist_ok=True)

BASE = "http://localhost:3000"
IMAGE_WAIT_MS = 10_000


def load_admin_password() -> str:
    env = os.environ.get("ADMIN_PASSWORD")
    if env:
        return env
    for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
        if line.startswith("ADMIN_PASSWORD="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("ADMIN_PASSWORD not found")


ADMIN_PASSWORD = load_admin_password()


def wait_for_images(page, extra_ms: int = IMAGE_WAIT_MS) -> None:
    page.wait_for_timeout(extra_ms)
    try:
        page.wait_for_function(
            """() => {
                const imgs = Array.from(document.querySelectorAll('img'));
                if (!imgs.length) return true;
                return imgs.every((img) => img.complete && img.naturalHeight > 0);
            }""",
            timeout=20_000,
        )
    except Exception:
        pass


def shot(page, name: str) -> None:
    wait_for_images(page)
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=False)
    print(f"saved {path.name}")


def select_grill_category(page) -> None:
    for sel in (
        '[data-category-id="Grill"]',
        'button[data-category-id="Grill"]',
        'span:has-text("Grill")',
        'button:has-text("Grill")',
    ):
        loc = page.locator(sel)
        if loc.count():
            loc.first.click(force=True)
            page.wait_for_timeout(800)
            wait_for_images(page)
            return
    raise RuntimeError("Could not find Grill category in carousel")


def grill_wishlist_seed() -> str:
    menu = json.loads(urllib.request.urlopen(f"{BASE}/api/menu").read())
    dishes = menu["dishes"] if isinstance(menu, dict) else menu
    grill = [d for d in dishes if "grill" in (d.get("category") or "").lower()][:4]
    if not grill:
        grill = dishes[:3]
    wishlist = [{"id": d["id"], "qty": i + 1} for i, d in enumerate(grill)]
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
    return json.dumps(persist)


def main():
    wishlist_payload = grill_wishlist_seed()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        mobile = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
            user_agent=(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 "
                "Mobile/15E148 Safari/604.1"
            ),
        )
        page = mobile.new_page()
        page.add_init_script(
            f"""
            localStorage.setItem('ln-swipe-hint-v2', '1');
            localStorage.setItem('ln-kitchen-menu', {json.dumps(wishlist_payload)});
            """
        )
        page.goto(BASE, wait_until="domcontentloaded", timeout=120_000)
        wait_for_images(page)

        select_grill_category(page)
        shot(page, "01-customer-menu-home")

        # Search
        search = page.locator('input[placeholder*="earch" i], input[type="search"]')
        if search.count():
            search.first.click(force=True)
            page.wait_for_timeout(500)
            wait_for_images(page)
            shot(page, "02-customer-search")
            page.keyboard.press("Escape")
            page.wait_for_timeout(400)
            select_grill_category(page)

        # Dish detail — tap card centre
        surface = page.locator(".swipe-surface").first
        if surface.count():
            box = surface.bounding_box()
            if box:
                page.mouse.click(box["x"] + box["width"] * 0.5, box["y"] + box["height"] * 0.35)
                page.wait_for_timeout(800)
                wait_for_images(page)
                if page.locator('button:has-text("Back")').count():
                    shot(page, "03-customer-dish-detail")
                    page.locator('button:has-text("Back")').first.click(force=True)
                    page.wait_for_timeout(500)
                    select_grill_category(page)

        # Wish list sheet
        page.locator('button[aria-label="Open wish list"]').click(force=True)
        page.wait_for_timeout(800)
        wait_for_images(page)
        shot(page, "04-customer-wishlist-sheet")

        page.locator('button:has-text("Close")').first.click(force=True)
        page.wait_for_timeout(400)
        select_grill_category(page)
        wait_for_images(page)
        shot(page, "01c-customer-after-swipe")

        page.close()
        mobile.close()

        # Admin
        desk = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
        page = desk.new_page()
        page.goto(f"{BASE}/admin", wait_until="domcontentloaded", timeout=120_000)
        wait_for_images(page)
        shot(page, "05-admin-login")

        page.locator("#admin-password").fill(ADMIN_PASSWORD)
        page.get_by_role("button", name="Sign in").click()
        page.wait_for_timeout(2000)
        wait_for_images(page)

        for label, name in [
            ("Orders", "06-admin-orders"),
            ("Categories", "07-admin-categories"),
            ("Dishes", "08-admin-dishes"),
            ("Waiters", "09-admin-waiters"),
        ]:
            page.get_by_role("button", name=label).click()
            page.wait_for_timeout(1200)
            wait_for_images(page)
            if label == "Dishes":
                for _ in range(8):
                    page.mouse.wheel(0, 700)
                    page.wait_for_timeout(200)
                wait_for_images(page)
                shot(page, "08b-admin-dishes-list")
                page.evaluate("window.scrollTo(0, 0)")
                page.wait_for_timeout(400)
            shot(page, name)

        page.close()
        desk.close()
        browser.close()
        print("done — all screenshots use Grill category + 10s image wait")


if __name__ == "__main__":
    main()
