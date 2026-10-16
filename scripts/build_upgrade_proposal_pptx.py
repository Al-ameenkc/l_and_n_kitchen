"""Build L&N Kitchen digital ordering & waiter system upgrade proposal PPTX."""

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

BG = RGBColor(0x0A, 0x0A, 0x0B)
CARD = RGBColor(0x14, 0x14, 0x16)
GREEN = RGBColor(0x16, 0xA3, 0x4A)
GREEN_SOFT = RGBColor(0x4A, 0xDE, 0x80)
WHITE = RGBColor(0xFA, 0xFA, 0xFA)
MUTED = RGBColor(0xA1, 0xA1, 0xAA)
LINE = RGBColor(0x27, 0x27, 0x2A)
AMBER = RGBColor(0xFB, 0xBF, 0x24)

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "proposal-screenshots"
OUT = ROOT / "L_and_N_Menu_Website_Upgrade_Proposal.pptx"

CURRENT_URL = "menu.landnkitchen.com"
PROPOSED_URL = "l-and-n-kitchen.vercel.app"


def set_run(run, text, size=18, bold=False, color=WHITE, font="Calibri"):
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = font


def add_bg(slide, prs):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = BG
    shape.line.fill.background()


def add_accent_bar(slide, prs):
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.08))
    bar.fill.solid()
    bar.fill.fore_color.rgb = GREEN
    bar.line.fill.background()


def add_footer(slide, prs, page, total):
    box = slide.shapes.add_textbox(
        Inches(0.6), prs.slide_height - Inches(0.45), Inches(12), Inches(0.3)
    )
    set_run(
        box.text_frame.paragraphs[0].add_run(),
        f"L&N Kitchen  ·  Digital Ordering & Waiter System Upgrade  ·  {page}/{total}",
        10,
        False,
        MUTED,
    )


def title_block(slide, title, subtitle=None, y=Inches(0.32)):
    box = slide.shapes.add_textbox(Inches(0.55), y, Inches(12.2), Inches(0.5))
    set_run(box.text_frame.paragraphs[0].add_run(), title, 26, True, WHITE)
    if subtitle:
        sub = slide.shapes.add_textbox(Inches(0.55), y + Inches(0.45), Inches(12.2), Inches(0.55))
        tf = sub.text_frame
        tf.word_wrap = True
        set_run(tf.paragraphs[0].add_run(), subtitle, 13, False, MUTED)


def bullet_slide(slide, items, top=Inches(1.15), size=14, width=Inches(12)):
    box = slide.shapes.add_textbox(Inches(0.65), top, width, Inches(5.8))
    tf = box.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(8)
        set_run(p.add_run(), f"•  {item}", size, False, WHITE)


def card(slide, x, y, w, h, title, body_lines, accent=False, title_color=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = CARD
    shape.line.color.rgb = GREEN if accent else LINE
    shape.line.width = Pt(1.5 if accent else 1)
    shape.adjustments[0] = 0.08
    tbox = slide.shapes.add_textbox(x + Inches(0.2), y + Inches(0.18), w - Inches(0.4), Inches(0.35))
    set_run(
        tbox.text_frame.paragraphs[0].add_run(),
        title,
        13,
        True,
        title_color or (GREEN_SOFT if accent else WHITE),
    )
    bbox = slide.shapes.add_textbox(x + Inches(0.2), y + Inches(0.52), w - Inches(0.4), h - Inches(0.65))
    tf = bbox.text_frame
    tf.word_wrap = True
    for i, line in enumerate(body_lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(4)
        set_run(p.add_run(), line, 11, False, MUTED)


def add_image_fit(slide, path: Path, x, y, w, h):
    if not path.exists():
        miss = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
        miss.fill.solid()
        miss.fill.fore_color.rgb = CARD
        miss.line.color.rgb = LINE
        t = slide.shapes.add_textbox(x + Inches(0.2), y + Inches(0.3), w - Inches(0.4), Inches(0.5))
        set_run(t.text_frame.paragraphs[0].add_run(), f"Missing: {path.name}", 12, False, MUTED)
        return
    pic = slide.shapes.add_picture(str(path), x, y, width=w)
    if pic.height > h:
        ratio = h / pic.height
        pic.width = int(pic.width * ratio)
        pic.height = h
        pic.left = int(x + (w - pic.width) / 2)
        pic.top = y
    else:
        pic.top = int(y + (h - pic.height) / 2)
        pic.left = int(x + (w - pic.width) / 2)


def labeled_shot(slide, path, x, y, w, h, label):
    add_image_fit(slide, path, x, y, w, h - Inches(0.35))
    lab = slide.shapes.add_textbox(x, y + h - Inches(0.32), w, Inches(0.3))
    p = lab.text_frame.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    set_run(p.add_run(), label, 11, True, MUTED)


def comparison_table(slide, rows):
    """rows: list of (area, current, proposed)"""
    headers = ["Feature area", f"Current ({CURRENT_URL})", f"Upgraded ({PROPOSED_URL})"]
    col_x = [Inches(0.55), Inches(4.35), Inches(8.15)]
    col_w = [Inches(3.65), Inches(3.65), Inches(4.6)]
    y0 = Inches(1.12)
    row_h = Inches(0.72)

    for i, label in enumerate(headers):
        box = slide.shapes.add_textbox(col_x[i], y0, col_w[i], Inches(0.35))
        set_run(box.text_frame.paragraphs[0].add_run(), label, 11, True, GREEN_SOFT)

    for ri, (area, current, proposed) in enumerate(rows):
        y = y0 + Inches(0.42) + ri * row_h
        bg = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), y, Inches(12.3), row_h - Inches(0.06)
        )
        bg.fill.solid()
        bg.fill.fore_color.rgb = CARD
        bg.line.color.rgb = LINE
        bg.adjustments[0] = 0.1

        for i, text in enumerate([area, current, proposed]):
            box = slide.shapes.add_textbox(col_x[i], y + Inches(0.1), col_w[i] - Inches(0.1), row_h - Inches(0.15))
            tf = box.text_frame
            tf.word_wrap = True
            color = GREEN_SOFT if i == 2 else MUTED
            set_run(tf.paragraphs[0].add_run(), text, 10, i == 0, WHITE if i == 0 else color)


def lifecycle_slide(slide):
    title_block(slide, "Live order lifecycle", "Every guest order moves through clear, trackable statuses")
    stages = [
        ("New", "Guest wishlist submitted\nvia QR sync", False),
        ("Accepted", "Waiter / kitchen\nconfirms order", False),
        ("Paid", "Settlement recorded;\nguest session resets", True),
        ("Completed", "Order fulfilled;\nmetrics updated", False),
    ]
    for i, (name, desc, accent) in enumerate(stages):
        x = Inches(0.55 + i * 3.15)
        card(slide, x, Inches(1.35), Inches(2.95), Inches(2.2), name, [desc], accent=accent)
        if i < len(stages) - 1:
            arrow = slide.shapes.add_textbox(x + Inches(2.95), Inches(2.0), Inches(0.25), Inches(0.3))
            set_run(arrow.text_frame.paragraphs[0].add_run(), "→", 18, True, GREEN_SOFT)


def access_routes_slide(slide):
    title_block(slide, "Who uses what — website access", "Simple URLs for guests, floor staff, and management")
    routes = [
        (
            "Guest menu",
            f"https://{PROPOSED_URL}/",
            [
                "Scan table QR on phone",
                "Swipe, search, build wishlist",
                "Share session QR with waiter",
                "Track order + digital receipt",
            ],
            True,
        ),
        (
            "Waiter /order",
            f"https://{PROPOSED_URL}/order",
            [
                "Enter Staff ID",
                "Scan guest wishlist QR",
                "Capture table / lounge",
                "Assign to admin (one-shot)",
            ],
            False,
        ),
        (
            "Admin /admin",
            f"https://{PROPOSED_URL}/admin",
            [
                "Secure password login",
                "Live orders dashboard",
                "Accept · Mark paid · Cancel",
                "Menu, categories, waiters CMS",
            ],
            False,
        ),
    ]
    for i, (title, url, lines, accent) in enumerate(routes):
        x = Inches(0.55 + i * 4.2)
        card(slide, x, Inches(1.2), Inches(4.0), Inches(5.2), title, [url, ""] + lines, accent=accent)


def build():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]
    slides = []

    # 1 Cover
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    set_run(
        s.shapes.add_textbox(Inches(0.9), Inches(1.85), Inches(11), Inches(0.4)).text_frame.paragraphs[0].add_run(),
        "L&N KITCHEN",
        18,
        True,
        GREEN_SOFT,
    )
    main = s.shapes.add_textbox(Inches(0.9), Inches(2.3), Inches(11.5), Inches(1.6))
    set_run(
        main.text_frame.paragraphs[0].add_run(),
        "Proposal for Digital Ordering\n& Waiter System Upgrade",
        38,
        True,
        WHITE,
    )
    set_run(
        s.shapes.add_textbox(Inches(0.9), Inches(4.15), Inches(11), Inches(1.0)).text_frame.paragraphs[0].add_run(),
        "Seamless guest ordering · waiter floor workflow · live tracking · digital receipts\n"
        f"Preview: {PROPOSED_URL}  ·  Fixed investment ₦1,850,000",
        15,
        False,
        MUTED,
    )
    set_run(
        s.shapes.add_textbox(Inches(0.9), Inches(6.35), Inches(10), Inches(0.3)).text_frame.paragraphs[0].add_run(),
        "Prepared for L&N Kitchen leadership  ·  August 2026",
        12,
        False,
        MUTED,
    )
    slides.append(s)

    # 2 Executive summary
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(
        s,
        "Executive summary",
        "Elevate dining and operational efficiency with an end-to-end digital workflow",
    )
    bullet_slide(
        s,
        [
            f"Current menu at {CURRENT_URL} is a static catalog — browse, cart, and manual staff coordination.",
            f"The upgraded platform at {PROPOSED_URL} is a real-time, interactive workflow already previewable today.",
            "Bridges customer convenience and staff efficiency across every touchpoint.",
            "From mobile swipe browsing and wishlist QR sharing → waiter assignment → kitchen tracking → paid receipt.",
            "Goal: fewer order mistakes, faster table turns, and a user-friendly experience guests remember.",
        ],
        top=Inches(1.25),
        size=15,
    )
    slides.append(s)

    # 3 Feature comparison
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "Core platform pillars — before & after")
    comparison_table(
        s,
        [
            (
                "Customer experience",
                "Static catalog browsing with manual cart actions.",
                "Mobile swipe deck, wishlist, search, dish detail, order history & QR sharing.",
            ),
            (
                "Ordering mechanism",
                "Manual, uncoordinated staff messaging.",
                "Guest QR scanned by waiter — instant floor sync to admin.",
            ),
            (
                "Order management",
                "No live status after placement.",
                "Real-time lifecycle: New → Accepted → Paid → Completed.",
            ),
            (
                "Staff workflow",
                "No dedicated waiter assignment.",
                "Staff ID login, table tagging, one-shot assign to kitchen.",
            ),
            (
                "Live sync & protection",
                "No sync after order starts.",
                "Supabase realtime + locked-item rules protect guest selections.",
            ),
        ],
    )
    slides.append(s)

    # 4 Customer journey screenshots
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(
        s,
        "1 · Seamless customer mobile experience",
        "Fast, touch-friendly UI — scan QR at the table and start browsing instantly",
    )
    labeled_shot(s, SHOTS / "01-customer-menu-home.png", Inches(0.4), Inches(1.12), Inches(3.85), Inches(5.75), "Swipe menu")
    labeled_shot(s, SHOTS / "02-customer-search.png", Inches(4.45), Inches(1.12), Inches(3.85), Inches(5.75), "Search dishes")
    labeled_shot(s, SHOTS / "03-customer-dish-detail.png", Inches(8.5), Inches(1.12), Inches(3.85), Inches(5.75), "Dish detail")
    slides.append(s)

    # 5 Customer ordering details
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "Guest ordering — simple, no signup required")
    card(
        s,
        Inches(0.55),
        Inches(1.15),
        Inches(6.0),
        Inches(5.4),
        "What guests do",
        [
            "Swipe right to wishlist · left to skip — guided onboarding on first visit",
            "Build a wishlist session without creating an account",
            "View pricing (₦), ingredients, allergens, prep time & calories",
            "Place order → receive shareable QR for the waiter",
            "Order more items or start a new order; full order history on device",
            "Live updates when staff accept or adjust the order",
            "Digital order summary + QR receipt after submission",
        ],
        accent=True,
    )
    labeled_shot(
        s,
        SHOTS / "04b-customer-wishlist-filled.png",
        Inches(6.85),
        Inches(1.15),
        Inches(3.2),
        Inches(5.4),
        "Wishlist ready",
    )
    labeled_shot(
        s,
        SHOTS / "01c-customer-swipe-wish.png",
        Inches(10.2),
        Inches(1.15),
        Inches(2.6),
        Inches(5.4),
        "Swipe to add",
    )
    slides.append(s)

    # 6 Waiter workflow
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(
        s,
        "2 · Waiter order taking & assignment",
        "Dedicated /order interface — Staff ID, QR scan, table capture",
    )
    card(
        s,
        Inches(0.55),
        Inches(1.15),
        Inches(5.8),
        Inches(5.4),
        "Floor workflow",
        [
            "Waiter opens /order and enters Staff ID (photo + name lookup)",
            "Scan guest wishlist QR directly from the customer's phone",
            "Order populates instantly — no re-typing dishes",
            "Capture table number or lounge area",
            "Add items, change quantities, note special requests table-side",
            "Assign to admin once — locked after first assign to prevent errors",
            "Download order image for kitchen pass if needed",
        ],
        accent=True,
    )
    labeled_desktop = labeled_shot
    labeled_desktop(s, SHOTS / "09-admin-waiters.png", Inches(6.6), Inches(1.15), Inches(6.1), Inches(5.4), "Waiter profiles in admin")
    slides.append(s)

    # 7 Admin orders
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(
        s,
        "3 · Real-time order tracking & management",
        "Central admin command center — live status, locked items, mark paid",
    )
    labeled_shot(s, SHOTS / "05-admin-login.png", Inches(0.4), Inches(1.12), Inches(5.8), Inches(5.75), "Secure admin login")
    labeled_shot(s, SHOTS / "06-admin-orders.png", Inches(6.5), Inches(1.12), Inches(6.4), Inches(5.75), "Live orders dashboard")
    slides.append(s)

    # 8 Order lifecycle
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    lifecycle_slide(s)
    bullet_slide(
        s,
        [
            "Locked items: original guest picks are preserved — staff can add but guests cannot remove locked lines",
            "Admin can accept, mark paid, cancel, adjust quantities, and add dishes from the live menu",
            "When marked paid, guest session resets cleanly for the next round of ordering",
            "Every change syncs back to the guest phone via Supabase order-shares",
        ],
        top=Inches(3.85),
        size=13,
    )
    slides.append(s)

    # 9 Menu CMS
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "4 · Menu & inventory control", "Instant availability toggles · dynamic CRUD · cloud image storage")
    labeled_shot(s, SHOTS / "07-admin-categories.png", Inches(0.4), Inches(1.12), Inches(4.1), Inches(5.6), "Categories")
    dishes = SHOTS / "08b-admin-dishes-list.png"
    if not dishes.exists():
        dishes = SHOTS / "08-admin-dishes.png"
    labeled_shot(s, dishes, Inches(4.65), Inches(1.12), Inches(4.1), Inches(5.6), "Dishes CMS")
    card(
        s,
        Inches(9.0),
        Inches(1.12),
        Inches(3.85),
        Inches(5.6),
        "Staff controls",
        [
            "Hide out-of-stock items in one tap",
            "Add / edit categories & dishes",
            "Upload hi-res images to Supabase Storage",
            "Manage waiter Staff IDs & photos",
            "Search, filter, paginate dish list",
            "Role-ready for future kitchen display",
        ],
        accent=True,
    )
    slides.append(s)

    # 10 User-friendly experience
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "User-friendly experience upgrades", "Designed for real guests and busy floor staff")
    ux_cards = [
        ("Guided onboarding", ["Search spotlight walkthrough", "Swipe tutorial on first visit", "Skips automatically once guest has ordered"]),
        ("Order clarity", ["My Orders history with QR per visit", "Order more vs new order buttons", "Clear locked-item messaging"]),
        ("Staff speed", ["One-scan QR handoff", "No duplicate assign", "Visual status badges on every order"]),
        ("Receipt & proof", ["Centered order summary QR", "Share ID for waiter lookup", "Paid status closes the loop"]),
    ]
    for i, (title, lines) in enumerate(ux_cards):
        col, row = i % 2, i // 2
        card(s, Inches(0.55 + col * 6.4), Inches(1.15 + row * 2.85), Inches(6.1), Inches(2.6), title, lines, accent=(i == 0))
    slides.append(s)

    # 11 Website access
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    access_routes_slide(s)
    slides.append(s)

    # 12 Tech stack
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "System architecture & tech stack")
    stack = [
        ("Frontend", "Next.js App Router + Tailwind CSS — fast, mobile-first, desktop preview frame"),
        ("Database", "Supabase PostgreSQL — orders, dishes, categories, waiters"),
        ("Realtime & storage", "Supabase Realtime + Buckets (menu-images, order-shares)"),
        ("Security", "HMAC-signed admin session cookie (ln_admin_session) · encrypted staff auth"),
        ("Deploy", "Vercel edge hosting — instant QR-ready public URL"),
    ]
    for i, (title, body) in enumerate(stack):
        card(s, Inches(0.55), Inches(1.15 + i * 1.12), Inches(12.2), Inches(0.98), title, [body], accent=(i == 0))
    slides.append(s)

    # 13 Cost breakdown
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(
        s,
        "Investment — ₦1,850,000",
        "Fixed package covering guest UX, waiter workflow, admin ops, and launch support",
    )
    rows = [
        ("Guest ordering UX (swipe, wishlist, QR, onboarding, receipts)", "₦380,000", "21%"),
        ("Waiter /order flow (Staff ID, scan, assign, table capture)", "₦320,000", "17%"),
        ("Admin live orders, lifecycle, locked items & sync", "₦420,000", "23%"),
        ("Menu & waiter CMS + Supabase storage integration", "₦280,000", "15%"),
        ("QA, floor pilot, staff training & 30-day support", "₦250,000", "14%"),
        ("Contingency & deployment buffer", "₦200,000", "10%"),
    ]
    for i, label in enumerate(["Workstream", "Amount (NGN)", "Share"]):
        xs = [Inches(0.6), Inches(8.2), Inches(11.0)]
        ws = [Inches(7.4), Inches(2.6), Inches(1.6)]
        box = s.shapes.add_textbox(xs[i], Inches(1.12), ws[i], Inches(0.3))
        set_run(box.text_frame.paragraphs[0].add_run(), label, 12, True, GREEN_SOFT)

    for ri, (a, b, c) in enumerate(rows):
        y = Inches(1.48 + ri * 0.62)
        bg = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), y, Inches(12.2), Inches(0.55))
        bg.fill.solid()
        bg.fill.fore_color.rgb = CARD
        bg.line.color.rgb = LINE
        bg.adjustments[0] = 0.12
        for i, text in enumerate([a, b, c]):
            xs = [Inches(0.75), Inches(8.2), Inches(11.0)]
            ws = [Inches(7.2), Inches(2.6), Inches(1.6)]
            box = s.shapes.add_textbox(xs[i], y + Inches(0.12), ws[i], Inches(0.35))
            p = box.text_frame.paragraphs[0]
            if i > 0:
                p.alignment = PP_ALIGN.RIGHT if i == 1 else PP_ALIGN.CENTER
            set_run(p.add_run(), text, 12, i == 0, WHITE if i == 0 else MUTED)

    total_y = Inches(5.35)
    tot = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), total_y, Inches(12.2), Inches(0.85))
    tot.fill.solid()
    tot.fill.fore_color.rgb = GREEN
    tot.line.fill.background()
    tot.adjustments[0] = 0.1
    t1 = s.shapes.add_textbox(Inches(0.85), total_y + Inches(0.22), Inches(6), Inches(0.45))
    set_run(t1.text_frame.paragraphs[0].add_run(), "TOTAL PACKAGE", 16, True, WHITE)
    t2 = s.shapes.add_textbox(Inches(7.5), total_y + Inches(0.18), Inches(4.8), Inches(0.5))
    p = t2.text_frame.paragraphs[0]
    p.alignment = PP_ALIGN.RIGHT
    set_run(p.add_run(), "₦1,850,000", 26, True, WHITE)
    slides.append(s)

    # 14 Outcomes
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "Expected business outcomes")
    outcomes = [
        ("Seamless guest orders", "QR → wishlist → waiter scan — no verbal back-and-forth or order slips"),
        ("Faster table service", "Waiters spend seconds, not minutes, capturing an order"),
        ("Fewer kitchen errors", "Locked guest items + live admin edits = one source of truth"),
        ("Clear payment loop", "Mark paid resets guest session; totals always match admin"),
        ("Happier staff", "Simple Staff ID login and visual order board"),
        ("Operational insight", "Status history, bestsellers, and peak-hour visibility"),
    ]
    for i, (title, body) in enumerate(outcomes):
        col, row = i % 3, i // 3
        card(s, Inches(0.55 + col * 4.2), Inches(1.2 + row * 2.55), Inches(4.0), Inches(2.3), title, [body], accent=(i % 2 == 0))
    slides.append(s)

    # 15 Next steps
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "Recommended next steps")
    steps = [
        ("1", "Approve scope", "Confirm ₦1,850,000 package and go-live target date"),
        ("2", "Floor pilot", "Print table QR codes · train waiters on /order scan flow"),
        ("3", "Menu migration", "Import categories, dishes, and waiter profiles into Supabase"),
        ("4", "Launch", "Switch primary QR from catalog site to upgraded workflow"),
    ]
    for i, (num, title, body) in enumerate(steps):
        y = Inches(1.25 + i * 1.2)
        circle = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.7), y + Inches(0.15), Inches(0.55), Inches(0.55))
        circle.fill.solid()
        circle.fill.fore_color.rgb = GREEN
        circle.line.fill.background()
        nbox = s.shapes.add_textbox(Inches(0.7), y + Inches(0.25), Inches(0.55), Inches(0.4))
        np_ = nbox.text_frame.paragraphs[0]
        np_.alignment = PP_ALIGN.CENTER
        set_run(np_.add_run(), num, 16, True, WHITE)
        tbox = s.shapes.add_textbox(Inches(1.5), y, Inches(10.5), Inches(1.0))
        set_run(tbox.text_frame.paragraphs[0].add_run(), title, 18, True, WHITE)
        set_run(tbox.text_frame.add_paragraph().add_run(), body, 14, False, MUTED)
    slides.append(s)

    # 16 Close
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    set_run(
        s.shapes.add_textbox(Inches(0.9), Inches(2.2), Inches(11), Inches(0.4)).text_frame.paragraphs[0].add_run(),
        "L&N KITCHEN",
        16,
        True,
        GREEN_SOFT,
    )
    set_run(
        s.shapes.add_textbox(Inches(0.9), Inches(2.7), Inches(11.5), Inches(1.3)).text_frame.paragraphs[0].add_run(),
        "From swipe to served —\na digital workflow guests and staff will love.",
        30,
        True,
        WHITE,
    )
    set_run(
        s.shapes.add_textbox(Inches(0.9), Inches(4.45), Inches(11), Inches(0.7)).text_frame.paragraphs[0].add_run(),
        f"Preview today: {PROPOSED_URL}  ·  ₦1,850,000 fixed  ·  Ready to deploy on approval",
        15,
        False,
        MUTED,
    )
    slides.append(s)

    total = len(slides)
    for i, slide in enumerate(slides):
        if i not in (0, total - 1):
            add_footer(slide, prs, i + 1, total)

    prs.save(OUT)
    print(f"Wrote {OUT}")
    print(f"Slides: {total}")


if __name__ == "__main__":
    build()
