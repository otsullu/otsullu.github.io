from playwright.sync_api import sync_playwright
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent))
from generate_article_pdf import PRINT_CSS, ARTICLE_HTML

OUT = Path(__file__).parent

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 794, "height": 900})
    page.goto(ARTICLE_HTML.as_uri(), wait_until="networkidle")
    page.evaluate("document.documentElement.setAttribute('data-theme','light')")
    page.evaluate("document.documentElement.setAttribute('data-palette','gold')")
    page.evaluate("document.body.style.background = '#ffffff'")
    page.add_style_tag(content=PRINT_CSS)
    page.wait_for_timeout(2000)
    page.screenshot(path=str(OUT / "pdf-preview-full.png"), full_page=True)
    print("Saved preview")
    browser.close()
