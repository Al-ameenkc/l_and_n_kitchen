"""Patch the existing L&N proposal PPTX in place.

This script preserves the current slide deck and only:
- updates the investment figures to ₦6,800,000
- adds two waiter-calling-device slides
- refreshes footer page counts after the new slides are inserted
"""

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

from build_upgrade_proposal_pptx import (
    BG,
    CARD,
    GREEN,
    GREEN_SOFT,
    LINE,
    MUTED,
    WHITE,
    add_accent_bar,
    add_bg,
    add_footer,
    add_image_fit,
    bullet_slide,
    card,
    set_run,
    title_block,
)

ROOT = Path(__file__).resolve().parents[1]
PPTX = ROOT / "L_and_N_Menu_Website_Upgrade_Proposal.pptx"
CALL_DEVICE_IMAGE = (
    Path.home()
    / ".cursor"
    / "projects"
    / "c-Users-abdul-Desktop-LandN"
    / "assets"
    / "c__Users_abdul_Desktop_LandN_waiter_calling_device.jpg"
)


def iter_text_shapes(slide):
    for shape in slide.shapes:
        if hasattr(shape, "text_frame"):
            yield shape


def replace_in_runs(prs: Presentation, old: str, new: str) -> None:
    for slide in prs.slides:
        for shape in iter_text_shapes(slide):
            for paragraph in shape.text_frame.paragraphs:
                for run in paragraph.runs:
                    if old in run.text:
                        run.text = run.text.replace(old, new)


def set_text(shape, text: str, size: int, bold: bool, color, align=None) -> None:
    text_frame = shape.text_frame
    text_frame.clear()
    paragraph = text_frame.paragraphs[0]
    if align is not None:
        paragraph.alignment = align
    set_run(paragraph.add_run(), text, size=size, bold=bold, color=color)


def add_cost_row(slide, y, label: str, amount: str, share: str) -> None:
    bg = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), y, Inches(12.2), Inches(0.55)
    )
    bg.fill.solid()
    bg.fill.fore_color.rgb = CARD
    bg.line.color.rgb = LINE
    bg.adjustments[0] = 0.12

    label_box = slide.shapes.add_textbox(Inches(0.75), y + Inches(0.12), Inches(7.2), Inches(0.35))
    set_text(label_box, label, 12, True, WHITE)

    amount_box = slide.shapes.add_textbox(Inches(8.2), y + Inches(0.12), Inches(2.6), Inches(0.35))
    set_text(amount_box, amount, 12, False, MUTED, PP_ALIGN.RIGHT)

    share_box = slide.shapes.add_textbox(Inches(11.0), y + Inches(0.12), Inches(1.6), Inches(0.35))
    set_text(share_box, share, 12, False, MUTED, PP_ALIGN.CENTER)


def move_slide(prs: Presentation, old_index: int, new_index: int) -> None:
    slides = prs.slides._sldIdLst
    slide = slides[old_index]
    slides.remove(slide)
    slides.insert(new_index, slide)


def find_slide_by_text(prs: Presentation, needle: str):
    for slide in prs.slides:
        for shape in iter_text_shapes(slide):
            if needle in shape.text:
                return slide
    raise ValueError(f"Could not find slide containing {needle!r}")


def update_cost_slide(prs: Presentation) -> None:
    slide = find_slide_by_text(prs, "Investment")

    replacements = {
        "Investment ₦1,850,000": ("Investment — ₦6,800,000", 26, True, WHITE, None),
        "Fixed package covering guest UX, waiter workflow, admin ops, and launch support": (
            "Expanded package covering software delivery, waiter calling hardware, deployment, and launch support",
            13,
            False,
            MUTED,
            None,
        ),
        "Guest ordering UX (swipe, wishlist, QR, onboarding, receipts)": (
            "Guest ordering UX (swipe, wishlist, QR, onboarding, receipts)",
            12,
            True,
            WHITE,
            None,
        ),
        "₦380,000": ("₦950,000", 12, False, MUTED, PP_ALIGN.RIGHT),
        "21%": ("14%", 12, False, MUTED, PP_ALIGN.CENTER),
        "Waiter /order flow (Staff ID, scan, assign, table capture)": (
            "Waiter /order flow (Staff ID, scan, assign, table capture)",
            12,
            True,
            WHITE,
            None,
        ),
        "₦320,000": ("₦750,000", 12, False, MUTED, PP_ALIGN.RIGHT),
        "17%": ("11%", 12, False, MUTED, PP_ALIGN.CENTER),
        "Admin live orders, lifecycle, locked items & sync": (
            "Admin live orders, lifecycle, locked items & sync",
            12,
            True,
            WHITE,
            None,
        ),
        "₦420,000": ("₦900,000", 12, False, MUTED, PP_ALIGN.RIGHT),
        "23%": ("13%", 12, False, MUTED, PP_ALIGN.CENTER),
        "Menu & waiter CMS + database storage integration": (
            "Menu & waiter CMS + database storage integration",
            12,
            True,
            WHITE,
            None,
        ),
        "₦280,000": ("₦600,000", 12, False, MUTED, PP_ALIGN.RIGHT),
        "15%": ("9%", 12, False, MUTED, PP_ALIGN.CENTER),
        "QA, floor pilot, staff training & 30-day support": (
            "QA, floor pilot, staff training & 30-day support",
            12,
            True,
            WHITE,
            None,
        ),
        "₦250,000": ("₦650,000", 12, False, MUTED, PP_ALIGN.RIGHT),
        "14%": ("10%", 12, False, MUTED, PP_ALIGN.CENTER),
        "Contingency & deployment buffer": (
            "Waiter calling system package (main receiver, 10 watches, 50 table buttons)",
            12,
            True,
            WHITE,
            None,
        ),
        "₦200,000": ("₦1,950,000", 12, False, MUTED, PP_ALIGN.RIGHT),
        "10%": ("29%", 12, False, MUTED, PP_ALIGN.CENTER),
        "₦1,850,000": ("₦6,800,000", 26, True, WHITE, PP_ALIGN.RIGHT),
    }

    for shape in iter_text_shapes(slide):
        text = shape.text.strip()
        if text in replacements:
            new_text, size, bold, color, align = replacements[text]
            set_text(shape, new_text, size, bold, color, align)

    # Move the total bar down to make room for one extra row.
    total_bg = None
    total_label = None
    total_amount = None
    for shape in slide.shapes:
        if hasattr(shape, "text") and shape.text.strip() == "TOTAL PACKAGE":
            total_label = shape
        elif hasattr(shape, "text") and shape.text.strip() == "₦6,800,000":
            total_amount = shape
        elif shape.top == 4892040 and shape.height == 777240:
            total_bg = shape

    offset = Inches(0.62)
    if total_bg is not None:
        total_bg.top = total_bg.top + offset
    if total_label is not None:
        total_label.top = total_label.top + offset
    if total_amount is not None:
        total_amount.top = total_amount.top + offset

    add_cost_row(
        slide,
        Inches(4.96),
        "Deployment, on-site setup & go-live rollout",
        "₦1,000,000",
        "14%",
    )


def add_calling_device_slides(prs: Presentation) -> None:
    blank = prs.slide_layouts[6]

    slide = prs.slides.add_slide(blank)
    add_bg(slide, prs)
    add_accent_bar(slide, prs)
    title_block(
        slide,
        "Waiter calling button package",
        "Hardware support layer for faster response at each table alongside the digital ordering website",
    )
    add_image_fit(slide, CALL_DEVICE_IMAGE, Inches(0.55), Inches(1.3), Inches(4.75), Inches(4.95))
    card(
        slide,
        Inches(5.6),
        Inches(1.25),
        Inches(7.1),
        Inches(2.3),
        "Package included",
        [
            "1 main waiter calling control device / receiver setup",
            "10 waiter watches for instant staff alerts",
            "50 wireless table buttons for guest call points",
            "Each table or lounge point gets its own button ID for quick identification",
        ],
        accent=True,
    )
    card(
        slide,
        Inches(5.6),
        Inches(3.9),
        Inches(7.1),
        Inches(2.2),
        "Operational value",
        [
            "Guests can call staff without shouting or waiting to catch attention",
            "The same table can request order help, payment, or assistance in seconds",
            "Works well with the website: browse digitally, then call staff exactly when needed",
        ],
        accent=False,
    )
    move_slide(prs, len(prs.slides) - 1, 6)

    slide = prs.slides.add_slide(blank)
    add_bg(slide, prs)
    add_accent_bar(slide, prs)
    title_block(
        slide,
        "How the waiter calling system works",
        "Simple button-to-watch workflow designed for busy restaurant service",
    )
    bullet_slide(
        slide,
        [
            "Each table is assigned one wireless button, so staff can immediately tell where the request is coming from.",
            "When a guest presses the button, the mapped table number is pushed instantly to the waiter watch.",
            "The button can support common actions such as Call, Order, Pay, and Cancel depending on the configured unit.",
            "Waiters wearing the 10 watches receive the alert anywhere on the floor and respond faster.",
            "This reduces hand waving, missed calls, and delays during rush periods.",
            "The call-button system complements the website by covering moments where the guest needs a person immediately.",
        ],
        top=Inches(1.35),
        size=15,
    )
    highlight = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.7), Inches(5.55), Inches(12.0), Inches(0.7)
    )
    highlight.fill.solid()
    highlight.fill.fore_color.rgb = GREEN
    highlight.line.fill.background()
    highlight.adjustments[0] = 0.1
    text_box = slide.shapes.add_textbox(Inches(0.95), Inches(5.72), Inches(11.5), Inches(0.35))
    set_text(
        text_box,
        "Recommended rollout: one button per table / service point, linked to waiter watches for immediate response.",
        14,
        True,
        WHITE,
        PP_ALIGN.CENTER,
    )
    move_slide(prs, len(prs.slides) - 1, 7)


def refresh_footers(prs: Presentation) -> None:
    total = len(prs.slides)
    footer_prefix = "L&N Kitchen  ·  Digital Ordering & Waiter System Upgrade"

    for i, slide in enumerate(prs.slides):
        footer_shape = None
        for shape in iter_text_shapes(slide):
            if shape.text.strip().startswith(footer_prefix):
                footer_shape = shape
                break

        if i in (0, total - 1):
            if footer_shape is not None:
                set_text(footer_shape, "", 10, False, MUTED)
            continue

        footer_text = f"{footer_prefix}  ·  {i + 1}/{total}"
        if footer_shape is not None:
            set_text(footer_shape, footer_text, 10, False, MUTED)
        else:
            add_footer(slide, prs, i + 1, total)


def main() -> None:
    prs = Presentation(PPTX)

    replace_in_runs(prs, "Fixed investment ₦1,850,000", "Fixed investment ₦6,800,000")
    replace_in_runs(prs, "₦1,850,000 fixed", "₦6,800,000 fixed")
    replace_in_runs(prs, "Confirm ₦1,850,000 package", "Confirm ₦6,800,000 package")

    update_cost_slide(prs)
    add_calling_device_slides(prs)
    refresh_footers(prs)

    prs.save(PPTX)
    print(f"Updated {PPTX}")
    print(f"Slides: {len(prs.slides)}")


if __name__ == "__main__":
    main()
