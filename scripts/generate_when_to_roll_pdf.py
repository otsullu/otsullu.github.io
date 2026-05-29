"""
Generate a styled PDF for the standalone article:
"The Rule I Never Believed: Why Counting Rolls Is the Wrong Way to Manage Short Options"

Usage: python scripts/generate_when_to_roll_pdf.py
"""

import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

REPO_ROOT    = Path(__file__).parent.parent
ARTICLE_HTML = REPO_ROOT / "articles" / "when-to-roll-or-stop" / "index.html"
OUTPUT_PDF   = REPO_ROOT / "pdfs" / "when-to-roll-or-stop-covered-calls-cash-secured-puts-strategy-guide-ots-ullu.pdf"

PRINT_CSS = """
  /* ── FORCE LIGHT THEME ── */
  html, html[data-theme="dark"], html[data-theme="light"] {
    --bg:              #FFFFFF !important;
    --bg-alt:          #F2F2F0 !important;
    --bg-elev:         #FFFFFF !important;
    --fg:              #111112 !important;
    --fg-secondary:    #2E2E35 !important;
    --fg-meta:         #666670 !important;
    --border:          rgba(0,0,0,0.10) !important;
    --border-strong:   rgba(0,0,0,0.18) !important;
    --accent:          #B8860B !important;
    --accent-dim:      #96700A !important;
    --accent-glow:     rgba(184,134,11,0.15) !important;
    --accent-tint-04:  rgba(184,134,11,0.04) !important;
    --accent-tint-06:  rgba(184,134,11,0.06) !important;
    --accent-tint-08:  rgba(184,134,11,0.08) !important;
    --accent-tint-10:  rgba(184,134,11,0.10) !important;
    --accent-tint-20:  rgba(184,134,11,0.20) !important;
    --accent-tint-22:  rgba(184,134,11,0.22) !important;
    --accent-tint-25:  rgba(184,134,11,0.25) !important;
    --accent-tint-30:  rgba(184,134,11,0.30) !important;
    --accent-tint-40:  rgba(184,134,11,0.40) !important;
    --accent-tint-45:  rgba(184,134,11,0.45) !important;
    --accent-tint-60:  rgba(184,134,11,0.60) !important;
    --shadow-sm:       none !important;
    --shadow-md:       none !important;
    --shadow-lg:       0 2px 12px rgba(0,0,0,0.10) !important;
  }

  html, body {
    background: #ffffff !important;
    color: #111112 !important;
    font-size: 12px !important;
  }

  /* ── HIDE SITE CHROME ── */
  .site-header,
  .config-panel,
  .config-scrim,
  .pdf-download-wrap,
  .breadcrumb,
  .disclaimer-box,
  .site-footer {
    display: none !important;
  }

  /* ── LAYOUT ── */
  .container { max-width: 100% !important; padding: 0 !important; }
  main > .container { padding: 4px 44px 4px !important; }

  /* ── TYPOGRAPHY ── */
  .article-title { font-size: 1.7rem !important; margin-bottom: 12px !important; color: #111112 !important; line-height: 1.2 !important; }
  .article-lede { font-size: 0.95rem !important; color: #2E2E35 !important; border-left-color: #B8860B !important; margin-bottom: 14px !important; padding: 10px 14px !important; }
  .article-meta { color: #666 !important; font-size: 0.78rem !important; margin-bottom: 16px !important; }
  .article-body p { font-size: 0.88rem !important; line-height: 1.68 !important; color: #111112 !important; margin-bottom: 0.9em !important; }
  .article-section-heading { font-size: 1.15rem !important; margin: 28px 0 10px !important; color: #B8860B !important; }

  /* ── PULL QUOTES ── */
  .pull-quote { background: rgba(184,134,11,0.06) !important; border-left-color: #B8860B !important; margin: 18px 0 !important; padding: 12px 16px !important; }
  .pull-quote p { color: #111112 !important; font-size: 0.95rem !important; line-height: 1.55 !important; }

  /* ── IMAGES ── */
  .article-hero-img { width: 100% !important; max-height: none !important; border-radius: 8px !important; box-shadow: 0 2px 12px rgba(0,0,0,0.12) !important; margin-bottom: 24px !important; }
  .article-img-wrap { margin: 12px 0 !important; }
  .article-img-wrap img { width: 100% !important; max-height: none !important; border-radius: 8px !important; box-shadow: 0 2px 8px rgba(0,0,0,0.10) !important; }
  .article-img-caption { color: #444 !important; font-size: 0.72rem !important; font-weight: 700 !important; margin-top: 4px !important; font-style: normal !important; }

  /* ── BULLET LISTS ── */
  .article-body ul { margin-bottom: 0.9em !important; }
  .article-body ul li { color: #111112 !important; font-size: 0.88rem !important; line-height: 1.68 !important; margin-bottom: 0.5em !important; }
  .article-body ul li strong { color: #111112 !important; }

  /* ── AUTHOR CARD ── */
  .author-card { background: #F5F5F3 !important; border-color: rgba(0,0,0,0.10) !important; margin-top: 10px !important; padding: 12px 16px !important; }
  .author-card-label { color: #B8860B !important; font-size: 0.65rem !important; margin-bottom: 6px !important; }
  .author-card-name { font-size: 0.92rem !important; margin-bottom: 6px !important; }
  .author-card-name a { color: #B8860B !important; }
  .author-card p { color: #2E2E35 !important; font-size: 0.8rem !important; line-height: 1.55 !important; margin-bottom: 0.4em !important; }

  /* ── META SECTIONS ── */
  .article-meta-section { border-top-color: rgba(0,0,0,0.10) !important; margin-top: 6px !important; padding-top: 6px !important; }
  .article-meta-section h3 { color: #888 !important; font-size: 0.6rem !important; margin-bottom: 2px !important; }
  .article-meta-section p { color: #777 !important; font-size: 0.68rem !important; line-height: 1.32 !important; margin-bottom: 2px !important; }

  /* ── PAGE BREAK CONTROL ── */
  .author-card, .pull-quote, .article-img-wrap, .article-meta-section {
    break-inside: avoid !important; page-break-inside: avoid !important;
  }
  .article-section-heading { break-after: avoid !important; page-break-after: avoid !important; }

  /* ── CREDIT LINE ── */
  .article-meta-section:last-of-type::after {
    display: block !important;
    content: "OTS Ullu  ·  Published May 2026  ·  © 2026 OTS Ullu. All rights reserved." !important;
    margin-top: 10px !important;
    padding-top: 8px !important;
    border-top: 1px solid #ddd !important;
    font-size: 0.62rem !important;
    color: #aaa !important;
    text-align: center !important;
  }
"""

async def generate():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        file_url = ARTICLE_HTML.as_uri()
        print(f"Loading: {file_url}")
        await page.goto(file_url, wait_until="networkidle")

        await page.evaluate("""() => {
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-palette', 'gold');
            document.body.style.background = '#ffffff';
        }""")

        await page.add_style_tag(content=PRINT_CSS)
        await page.wait_for_timeout(2000)

        OUTPUT_PDF.parent.mkdir(parents=True, exist_ok=True)

        await page.pdf(
            path=str(OUTPUT_PDF),
            format="A4",
            margin={"top": "14mm", "right": "0", "bottom": "6mm", "left": "0"},
            print_background=True,
            display_header_footer=True,
            header_template="<span></span>",
            footer_template="""
                <div style="width:100%; font-family:'Inter',Arial,sans-serif; font-size:8px;
                            color:#bbb; text-align:center; line-height:1;">
                    <span class="pageNumber"></span> of <span class="totalPages"></span>
                </div>
            """,
        )

        await browser.close()
        print(f"PDF saved: {OUTPUT_PDF}")

if __name__ == "__main__":
    asyncio.run(generate())
