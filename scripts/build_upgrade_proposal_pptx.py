"""Build L&N Kitchen upgrade proposal PPTX with live screenshots + cost breakdown."""

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

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "proposal-screenshots"
OUT = ROOT / "L_and_N_Menu_Website_Upgrade_Proposal.pptx"


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
        Inches(0.6), prs.slide_height - Inches(0.45), Inches(9), Inches(0.3)
    )
    run = box.text_frame.paragraphs[0].add_run()
    set_run(run, f"L&N Kitchen  ·  Menu Website Upgrade Proposal  ·  {page}/{total}", 10, False, MUTED)


def title_block(slide, title, subtitle=None, y=Inches(0.32)):
    box = slide.shapes.add_textbox(Inches(0.55), y, Inches(12.2), Inches(0.5))
    set_run(box.text_frame.paragraphs[0].add_run(), title, 26, True, WHITE)
    if subtitle:
        sub = slide.shapes.add_textbox(Inches(0.55), y + Inches(0.45), Inches(12.2), Inches(0.35))
        set_run(sub.text_frame.paragraphs[0].add_run(), subtitle, 13, False, MUTED)


def bullet_slide(slide, items, top=Inches(1.15), size=15):
    box = slide.shapes.add_textbox(Inches(0.65), top, Inches(12), Inches(5.5))
    tf = box.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(9)
        set_run(p.add_run(), f"•  {item}", size, False, WHITE)


def card(slide, x, y, w, h, title, body_lines, accent=False):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = CARD
    shape.line.color.rgb = GREEN if accent else LINE
    shape.line.width = Pt(1.5 if accent else 1)
    shape.adjustments[0] = 0.08
    tbox = slide.shapes.add_textbox(x + Inches(0.2), y + Inches(0.18), w - Inches(0.4), Inches(0.35))
    set_run(tbox.text_frame.paragraphs[0].add_run(), title, 14, True, GREEN_SOFT if accent else WHITE)
    bbox = slide.shapes.add_textbox(x + Inches(0.2), y + Inches(0.55), w - Inches(0.4), h - Inches(0.7))
    tf = bbox.text_frame
    tf.word_wrap = True
    for i, line in enumerate(body_lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(4)
        set_run(p.add_run(), line, 12, False, MUTED)


def add_image_fit(slide, path: Path, x, y, w, h):
    if not path.exists():
        miss = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
        miss.fill.solid()
        miss.fill.fore_color.rgb = CARD
        miss.line.color.rgb = LINE
        t = slide.shapes.add_textbox(x + Inches(0.2), y + Inches(0.3), w - Inches(0.4), Inches(0.5))
        set_run(t.text_frame.paragraphs[0].add_run(), f"Missing: {path.name}", 12, False, MUTED)
        return
    # letterbox into box preserving aspect via picture then leave margins by choosing max fit
    pic = slide.shapes.add_picture(str(path), x, y, width=w)
    # if too tall, rescale by height
    if pic.height > h:
        ratio = h / pic.height
        pic.width = int(pic.width * ratio)
        pic.height = h
        pic.left = int(x + (w - pic.width) / 2)
        pic.top = y
    else:
        pic.top = int(y + (h - pic.height) / 2)
        pic.left = int(x + (w - pic.width) / 2)


def labeled_phone(slide, path, x, y, w, h, label):
    add_image_fit(slide, path, x, y, w, h - Inches(0.35))
    lab = slide.shapes.add_textbox(x, y + h - Inches(0.32), w, Inches(0.3))
    p = lab.text_frame.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    set_run(p.add_run(), label, 11, True, MUTED)


def labeled_desktop(slide, path, x, y, w, h, label):
    add_image_fit(slide, path, x, y, w, h - Inches(0.35))
    lab = slide.shapes.add_textbox(x, y + h - Inches(0.32), w, Inches(0.3))
    p = lab.text_frame.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    set_run(p.add_run(), label, 11, True, MUTED)


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
        s.shapes.add_textbox(Inches(0.9), Inches(2.0), Inches(11), Inches(0.4)).text_frame.paragraphs[0].add_run(),
        "L&N KITCHEN",
        18,
        True,
        GREEN_SOFT,
    )
    main = s.shapes.add_textbox(Inches(0.9), Inches(2.45), Inches(11.5), Inches(1.5))
    set_run(main.text_frame.paragraphs[0].add_run(), "Menu Website\nUpgrade Proposal", 42, True, WHITE)
    set_run(
        s.shapes.add_textbox(Inches(0.9), Inches(4.3), Inches(10.5), Inches(0.9)).text_frame.paragraphs[0].add_run(),
        "Live Grill category screenshots · phased roadmap · fixed investment of ₦1,850,000",
        16,
        False,
        MUTED,
    )
    set_run(
        s.shapes.add_textbox(Inches(0.9), Inches(6.4), Inches(10), Inches(0.3)).text_frame.paragraphs[0].add_run(),
        "Prepared for L&N Kitchen leadership  ·  August 2026",
        12,
        False,
        MUTED,
    )
    slides.append(s)

    # 2 Agenda
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "Agenda")
    bullet_slide(
        s,
        [
            "Live product walkthrough — customer (mobile, Grill category) & admin dashboard",
            "Where we are today and the upgrade opportunity",
            "Proposed vision and upgrade pillars",
            "Phased delivery roadmap",
            "Fixed cost breakdown — ₦1,850,000",
            "Expected outcomes and recommended next steps",
        ],
    )
    slides.append(s)

    # 3 Customer screenshots
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "Customer experience (mobile)", "Grill category · swipe deck, dish detail, wish list")
    labeled_phone(s, SHOTS / "01-customer-menu-home.png", Inches(0.45), Inches(1.15), Inches(3.9), Inches(5.7), "Swipe menu — Grill")
    labeled_phone(s, SHOTS / "03-customer-dish-detail.png", Inches(4.7), Inches(1.15), Inches(3.9), Inches(5.7), "Dish detail")
    labeled_phone(s, SHOTS / "04-customer-wishlist-sheet.png", Inches(8.95), Inches(1.15), Inches(3.9), Inches(5.7), "Wish list")
    slides.append(s)

    # 4 Admin login + orders
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "Admin — login & live orders", "Secure sign-in and live order control with Mark paid")
    labeled_desktop(s, SHOTS / "05-admin-login.png", Inches(0.45), Inches(1.15), Inches(5.9), Inches(5.6), "Admin login")
    labeled_desktop(s, SHOTS / "06-admin-orders.png", Inches(6.7), Inches(1.15), Inches(6.1), Inches(5.6), "Orders dashboard")
    slides.append(s)

    # 5 Admin CMS
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "Admin — menu & staff CMS", "Categories, dishes, and waiter profiles")
    labeled_desktop(s, SHOTS / "07-admin-categories.png", Inches(0.4), Inches(1.15), Inches(4.1), Inches(5.6), "Categories")
    dishes = SHOTS / "08b-admin-dishes-list.png"
    if not dishes.exists():
        dishes = SHOTS / "08-admin-dishes.png"
    labeled_desktop(s, dishes, Inches(4.65), Inches(1.15), Inches(4.1), Inches(5.6), "Dishes")
    labeled_desktop(s, SHOTS / "09-admin-waiters.png", Inches(8.9), Inches(1.15), Inches(4.1), Inches(5.6), "Waiters")
    slides.append(s)

    # 6 Current state
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "Current state", "Already live in the L&N Kitchen system")
    card(
        s,
        Inches(0.55),
        Inches(1.2),
        Inches(4.0),
        Inches(5.3),
        "Guest menu",
        [
            "Mobile swipe card deck",
            "Category carousel & search",
            "Wish list + trash restore",
            "Dish detail & allergens",
            "QR share for waiter pickup",
            "Live sync after assign",
            "Session reset after payment",
        ],
        accent=True,
    )
    card(
        s,
        Inches(4.8),
        Inches(1.2),
        Inches(4.0),
        Inches(5.3),
        "Floor operations",
        [
            "Waiter scans guest QR",
            "Table / lounge capture",
            "Assign to admin (one-shot)",
            "Order image download",
            "Staff ID waiter profiles",
        ],
    )
    card(
        s,
        Inches(9.05),
        Inches(1.2),
        Inches(3.7),
        Inches(5.3),
        "Admin control",
        [
            "Orders dashboard",
            "Accept / mark paid",
            "Edit live order items",
            "Categories & dishes CMS",
            "Availability toggles",
            "Waiter management",
        ],
    )
    slides.append(s)

    # 7 Opportunity + vision
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "Opportunity & vision")
    bullet_slide(
        s,
        [
            "Turn the in-venue phone menu into a branded L&N web destination",
            "Reduce paper / chat-order mistakes with one source of truth",
            "Give kitchen and lounge shared live status from guest → paid",
            "Use order data for bestsellers, peak hours, and staff insight",
            "North star: digital hospitality that feels as curated as the food",
        ],
        top=Inches(1.2),
    )
    slides.append(s)

    # 8 Pillars
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "Upgrade pillars")
    pillars = [
        ("01  Brand & web", ["Public landing + menu site", "SEO / share previews", "Desktop-friendly browse", "Story & atmosphere"]),
        ("02  Guest journey", ["Table join via QR", "Multi-guest shared order", "Status timeline", "Receipts & feedback"]),
        ("03  Ops excellence", ["Kitchen display (KDS)", "Printer / alerts", "Shift reports", "Role permissions"]),
        ("04  Growth", ["Promos & set menus", "VIP / lounge packages", "Analytics dashboard", "Loyalty hooks"]),
    ]
    for i, (title, lines) in enumerate(pillars):
        card(s, Inches(0.5 + i * 3.2), Inches(1.2), Inches(3.05), Inches(5.3), title, lines, accent=(i == 0))
    slides.append(s)

    # 9 Roadmap
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "Phased roadmap", "Everything below is covered by the ₦1,850,000 package")
    phases = [
        ("Phase 1 — Polish", "Weeks 1–3", ["Public brand landing", "Desktop menu browse", "Status UX clarity", "Analytics basics"]),
        ("Phase 2 — Shared dining", "Weeks 4–7", ["Multi-guest table order", "Guest status timeline", "Waiter alerts", "Dietary filters"]),
        ("Phase 3 — Kitchen", "Weeks 8–12", ["Kitchen display", "Print / notify hooks", "Roles & audit", "Shift reports"]),
        ("Phase 4 — Growth", "Weeks 12–14", ["Promos & set menus", "VIP packages", "Loyalty hooks", "SEO polish"]),
    ]
    for i, (title, timing, lines) in enumerate(phases):
        x = Inches(0.5 + i * 3.2)
        shape = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(1.2), Inches(3.05), Inches(5.3))
        shape.fill.solid()
        shape.fill.fore_color.rgb = CARD
        shape.line.color.rgb = GREEN if i == 0 else LINE
        shape.adjustments[0] = 0.08
        tbox = s.shapes.add_textbox(x + Inches(0.18), Inches(1.35), Inches(2.7), Inches(0.7))
        set_run(tbox.text_frame.paragraphs[0].add_run(), title, 13, True, WHITE)
        set_run(tbox.text_frame.add_paragraph().add_run(), timing, 11, False, GREEN_SOFT)
        bbox = s.shapes.add_textbox(x + Inches(0.18), Inches(2.2), Inches(2.7), Inches(4.0))
        tf = bbox.text_frame
        for j, line in enumerate(lines):
            p = tf.paragraphs[0] if j == 0 else tf.add_paragraph()
            p.space_after = Pt(8)
            set_run(p.add_run(), f"• {line}", 12, False, MUTED)
    slides.append(s)

    # 10 COST BREAKDOWN — ₦1,850,000
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(
        s,
        "Cost breakdown — ₦1,850,000",
        "Fixed package investment (One Million, Eight Hundred and Fifty Thousand Naira)",
    )

    rows = [
        ("UX / UI design & brand landing page", "₦300,000", "16%"),
        ("Public website + desktop menu browse", "₦350,000", "19%"),
        ("Guest journey upgrades (shared order, status, filters)", "₦400,000", "22%"),
        ("Waiter & kitchen ops (KDS, alerts, roles, reports)", "₦450,000", "24%"),
        ("Analytics, staff training & 30-day support", "₦200,000", "11%"),
        ("Project contingency & QA buffer", "₦150,000", "8%"),
    ]

    # header
    for i, label in enumerate(["Workstream", "Amount (NGN)", "Share"]):
        xs = [Inches(0.6), Inches(8.2), Inches(11.0)]
        ws = [Inches(7.4), Inches(2.6), Inches(1.6)]
        box = s.shapes.add_textbox(xs[i], Inches(1.15), ws[i], Inches(0.3))
        set_run(box.text_frame.paragraphs[0].add_run(), label, 12, True, GREEN_SOFT)

    for ri, (a, b, c) in enumerate(rows):
        y = Inches(1.5 + ri * 0.62)
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
            set_run(p.add_run(), text, 13, i == 0, WHITE if i == 0 else MUTED)

    # total bar
    total_y = Inches(5.4)
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

    note = s.shapes.add_textbox(Inches(0.6), Inches(6.4), Inches(12), Inches(0.4))
    set_run(
        note.text_frame.paragraphs[0].add_run(),
        "Includes delivery of Phases 1–4 in the roadmap. Hosting / domain billed separately if not already covered.",
        11,
        False,
        MUTED,
    )
    slides.append(s)

    # 11 Payment schedule (optional helpful)
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "Suggested payment schedule", "Tied to delivery milestones within ₦1,850,000")
    schedule = [
        ("On kickoff", "40%", "₦740,000", "Brand assets collected, Phase 1 starts"),
        ("Phase 1–2 demo", "30%", "₦555,000", "Public site + shared dining live"),
        ("Phase 3–4 handoff", "30%", "₦555,000", "Kitchen ops + growth features + training"),
    ]
    for i, (when, pct, amt, why) in enumerate(schedule):
        card(
            s,
            Inches(0.55 + i * 4.2),
            Inches(1.3),
            Inches(4.0),
            Inches(4.6),
            f"{when}  ·  {pct}",
            [amt, "", why],
            accent=(i == 0),
        )
    slides.append(s)

    # 12 Outcomes
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "Expected business outcomes")
    outcomes = [
        ("Faster turns", "Clearer orders and paid resets reduce dead time between guests"),
        ("Fewer errors", "One digital source of truth vs handwritten or chat tickets"),
        ("Higher attach", "Upsell-ready UI for VIP, sides, and set experiences"),
        ("Brand lift", "A website that feels like L&N — not a generic PDF menu"),
        ("Staff clarity", "Waiters and admin share the same live order state"),
        ("Insight", "Know what sells, when, and which tables convert wish lists"),
    ]
    for i, (title, body) in enumerate(outcomes):
        col, row = i % 3, i // 3
        card(s, Inches(0.55 + col * 4.2), Inches(1.25 + row * 2.6), Inches(4.0), Inches(2.35), title, [body], accent=(i % 2 == 0))
    slides.append(s)

    # 13 Next steps
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    title_block(s, "Recommended next steps")
    steps = [
        ("1", "Approve package", "Confirm ₦1,850,000 scope and preferred payment schedule"),
        ("2", "Brand workshop", "Logo, photos, hours, location, VIP / lounge story"),
        ("3", "Kick off Phase 1", "Public site + desktop browse — first visible upgrade"),
        ("4", "Pilot on floor", "Train waiters; capture friction notes for Phase 2–3"),
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

    # 14 Close
    s = prs.slides.add_slide(blank)
    add_bg(s, prs)
    add_accent_bar(s, prs)
    set_run(
        s.shapes.add_textbox(Inches(0.9), Inches(2.3), Inches(11), Inches(0.4)).text_frame.paragraphs[0].add_run(),
        "L&N KITCHEN",
        16,
        True,
        GREEN_SOFT,
    )
    set_run(
        s.shapes.add_textbox(Inches(0.9), Inches(2.8), Inches(11.5), Inches(1.2)).text_frame.paragraphs[0].add_run(),
        "Let’s make the menu feel like\nthe oasis guests already love.",
        30,
        True,
        WHITE,
    )
    set_run(
        s.shapes.add_textbox(Inches(0.9), Inches(4.5), Inches(11), Inches(0.6)).text_frame.paragraphs[0].add_run(),
        "Fixed investment: ₦1,850,000  ·  Phases 1–4 included  ·  Ready to kick off on approval",
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
    print("Screens used:")
    for name in [
        "01-customer-menu-home.png",
        "03-customer-dish-detail.png",
        "04-customer-wishlist-sheet.png",
        "05-admin-login.png",
        "06-admin-orders.png",
        "07-admin-categories.png",
        "08-admin-dishes.png",
        "08b-admin-dishes-list.png",
        "09-admin-waiters.png",
    ]:
        p = SHOTS / name
        print(f"  {'OK' if p.exists() else 'MISSING'}  {name}")


if __name__ == "__main__":
    build()
