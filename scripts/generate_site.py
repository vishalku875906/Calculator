from __future__ import annotations
import json
import math
import pathlib
import re
from html import escape

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = pathlib.Path('/app/incoming_files/6a2376690d15166b752fe82d/e1436f851_TXTtxt.txt')
BASE_URL = 'https://example.com'

CATEGORY_RE = re.compile(r'^\s*(\d+)\.\s+(.+?)\s+â€”\s+(\d+)\s+Tools\s*$')
TOOL_RE = re.compile(r'^\s*(\d+\.\d+)\s+(.+?)\s*$')
BULLET_RE = re.compile(r'^\s*-\s+(.*)$')

DISCLAIMER_RULES = [
    (['finance', 'banking', 'investment', 'trading', 'insurance', 'tax', 'accounting', 'real estate', 'retirement', 'business'], 'Informational only — this tool does not provide financial, investment, accounting, lending, insurance, or tax advice. Verify important decisions with a qualified professional.'),
    (['health', 'medical', 'pregnancy', 'parenting', 'wellness', 'pharmacy', 'biology', 'mental'], 'Informational only — this tool is not medical advice and is not a substitute for a licensed doctor or qualified healthcare professional.'),
    (['legal', 'visa', 'immigration', 'compliance', 'government'], 'Informational only — laws, regulations, and official requirements vary by country, state, and situation. Verify details with a qualified advisor or official authority.'),
    (['construction', 'civil', 'mechanical', 'electrical', 'engineering', 'plumbing', 'hvac', 'urban', 'aviation', 'mining'], 'Planning aid only — verify all engineering, construction, safety, and field values with a certified professional before real-world use.'),
]

CUSTOM_ENGINES = {
    'emi-calculator': 'emi',
    'loan-calculator': 'emi',
    'sip-calculator': 'sip',
    'fd-calculator': 'fd',
    'simple-interest': 'simpleInterest',
    'compound-interest': 'compoundInterest',
    'percentage-calculator': 'percentage',
    'bmi-calculator': 'bmi',
    'age-calculator': 'age',
    'gst-calculator': 'gst',
    'calorie-calculator': 'calorie',
    'body-fat-calculator': 'bodyFat',
}

POPULAR_SLUGS = [
    'emi-calculator', 'sip-calculator', 'bmi-calculator', 'gst-calculator', 'percentage-calculator',
    'age-calculator', 'simple-interest', 'compound-interest', 'loan-calculator', 'calorie-calculator'
]


def slugify(text: str) -> str:
    text = text.lower()
    text = text.replace('&', ' and ')
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')


def nice_title(s: str) -> str:
    return s.replace('â€”', '—').strip()


def get_disclaimer(category_name: str) -> str:
    lower = category_name.lower()
    for keys, disclaimer in DISCLAIMER_RULES:
        if any(key in lower for key in keys):
            return disclaimer
    return 'Informational only — double-check any critical values before making personal, academic, technical, or business decisions.'


def intro_for(tool_name: str, category_name: str) -> str:
    return f'{tool_name} helps you estimate, compare, and understand key values for {category_name.lower()}. Use the inputs below to calculate results, review the formula, and explore related tools.'


def formula_for(tool_name: str, inputs: list[str]) -> str:
    slug = slugify(tool_name)
    if slug in ('emi-calculator', 'loan-calculator'):
        return 'EMI = P × r × (1 + r)^n / ((1 + r)^n − 1), where P is principal, r is monthly interest rate, and n is total months.'
    if slug == 'sip-calculator':
        return 'Future Value = SIP × [((1 + i)^n − 1) / i] × (1 + i), where i is monthly return and n is total months.'
    if slug == 'fd-calculator':
        return 'Maturity Value = P × (1 + r / m)^(m × t), where P is deposit, r is annual rate, m is compounding frequency, and t is time in years.'
    if slug == 'simple-interest':
        return 'Simple Interest = (Principal × Rate × Time) / 100.'
    if slug == 'compound-interest':
        return 'Amount = P × (1 + r / n)^(n × t), and Compound Interest = Amount − Principal.'
    if slug == 'bmi-calculator':
        return 'BMI = weight (kg) / [height (m)]².'
    if slug == 'percentage-calculator':
        return 'Percentage = (Part / Whole) × 100.'
    if slug == 'gst-calculator':
        return 'GST Amount = Base Value × GST Rate / 100. Total = Base Value + GST Amount.'
    if slug == 'age-calculator':
        return 'Age is the difference between birth date and target date, expressed in years, months, and days.'
    variables = ', '.join(inputs[:6]) if inputs else 'the provided inputs'
    return f'This tool uses the selected values ({variables}) to derive the final result, comparison values, and summary tables.'


def example_for(tool_name: str, category_name: str) -> str:
    slug = slugify(tool_name)
    if slug == 'emi-calculator':
        return 'Example: A ₹10,00,000 loan at 9% annual interest for 20 years gives a fixed monthly EMI, along with total interest and total payment.'
    if slug == 'sip-calculator':
        return 'Example: Investing ₹10,000 every month for 15 years at 12% expected annual return shows invested value, estimated gains, and maturity amount.'
    if slug == 'bmi-calculator':
        return 'Example: If weight is 70 kg and height is 1.75 m, BMI = 70 / (1.75 × 1.75) = 22.86.'
    return f'Enter your own values, try the sample button, and compare outputs to understand how {tool_name.lower()} behaves in different scenarios.'


def faq_items(tool_name: str, category_name: str) -> list[dict]:
    return [
        {'q': f'How does the {tool_name} work?', 'a': f'It processes the values you enter, applies the relevant formula or logic, and shows a primary answer with supporting details.'},
        {'q': f'Can I use the {tool_name} on mobile?', 'a': 'Yes. The layout is mobile-first and works on phones, tablets, and desktops.'},
        {'q': 'Can I export or print the result?', 'a': 'Yes. You can print the result, save it as PDF from the browser, or export table data as CSV when available.'},
        {'q': f'Is this {category_name.lower()} calculation exact?', 'a': 'It is intended for planning and educational use. Verify critical decisions with official sources or qualified professionals.'},
        {'q': 'Does the page support sharing?', 'a': 'Yes. The share button copies a link with your current query values when supported by the browser.'},
    ]


def infer_input_type(label: str) -> str:
    lower = label.lower()
    if 'date' in lower:
        return 'date'
    if 'email' in lower:
        return 'email'
    if 'name' in lower or 'city' in lower or 'country' in lower or 'state' in lower or 'code' in lower or 'symbol' in lower:
        return 'text'
    if 'gender' in lower or 'activity' in lower or 'currency' in lower or 'mode' in lower or 'frequency' in lower or 'unit' in lower:
        return 'text'
    return 'number'


def placeholder_for(label: str) -> str:
    lower = label.lower()
    if 'rate' in lower or '%' in lower:
        return 'e.g. 12'
    if 'date' in lower:
        return ''
    if 'amount' in lower or 'price' in lower or 'cost' in lower or 'loan' in lower or 'salary' in lower or 'income' in lower:
        return 'e.g. 10000'
    if 'year' in lower or 'month' in lower or 'time' in lower or 'tenure' in lower or 'duration' in lower:
        return 'e.g. 12'
    if 'height' in lower:
        return 'e.g. 170'
    if 'weight' in lower:
        return 'e.g. 70'
    if 'age' in lower:
        return 'e.g. 30'
    return 'e.g. 10'


def parse_spec():
    lines = SPEC.read_text(errors='ignore').splitlines()
    categories = []
    current_category = None
    current_tool = None
    section = None
    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue
        cat = CATEGORY_RE.match(line)
        if cat:
            current_category = {
                'index': int(cat.group(1)),
                'name': nice_title(cat.group(2)),
                'count': int(cat.group(3)),
                'slug': slugify(cat.group(2)),
                'tools': []
            }
            categories.append(current_category)
            current_tool = None
            section = None
            continue

        tool = TOOL_RE.match(line)
        if tool and current_category and not line.endswith('Tools'):
            current_tool = {
                'id': tool.group(1),
                'name': nice_title(tool.group(2)),
                'slug': '',
                'basic_inputs': [],
                'features': [],
                'advanced_options': [],
            }
            current_category['tools'].append(current_tool)
            section = None
            continue

        if current_tool is None:
            continue
        if line.startswith('URL Slug:'):
            current_tool['slug'] = line.split(':', 1)[1].strip().strip('/')
            current_tool['page_slug'] = current_tool['slug'].split('/')[-1] or slugify(current_tool['name'])
            continue
        if line.startswith('Basic Options / Inputs:'):
            section = 'basic_inputs'
            continue
        if line.startswith('Main Features:'):
            section = 'features'
            continue
        if line.startswith('Advanced Options / Pro Features:'):
            section = 'advanced_options'
            continue
        bullet = BULLET_RE.match(line)
        if bullet and section:
            current_tool[section].append(nice_title(bullet.group(1)))
            continue

    for category in categories:
        for tool in category['tools']:
            if not tool.get('slug'):
                tool['page_slug'] = slugify(tool['name'])
                tool['slug'] = f"{category['slug']}/{tool['page_slug']}"
            tool['engine'] = CUSTOM_ENGINES.get(tool['page_slug'])
            tool['url'] = f"/{tool['slug']}/"
    return categories


def related_tools(category, current_slug, limit=8):
    items = [t for t in category['tools'] if t['page_slug'] != current_slug]
    return items[:limit]


def page_shell(title: str, description: str, body: str, canonical: str, extra_head: str = '', body_class: str = ''):
    return f'''<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(description)}" />
  <link rel="canonical" href="{escape(canonical)}" />
  <meta name="theme-color" content="#1d4ed8" />
  <meta property="og:title" content="{escape(title)}" />
  <meta property="og:description" content="{escape(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="{escape(canonical)}" />
  <link rel="stylesheet" href="/assets/styles.css" />
  {extra_head}
</head>
<body class="{body_class}">
  {body}
  <script src="/assets/site.js" defer></script>
</body>
</html>'''


def header_html(categories):
    options = ''.join(f'<option value="/{c["slug"]}/">{escape(c["name"])} ({len(c["tools"])} tools)</option>' for c in categories)
    return f'''
<header class="site-header">
  <div class="container header-row">
    <a class="brand" href="/">CalcVerse</a>
    <form class="header-search" action="/search/" onsubmit="return false;">
      <input id="globalSearch" type="search" placeholder="Search calculators, formulas, units..." autocomplete="off" />
      <div id="searchSuggestions" class="search-suggestions"></div>
    </form>
    <div class="header-actions">
      <select id="categoryJump" aria-label="Jump to category">
        <option value="">Categories</option>
        {options}
      </select>
      <a class="text-link" href="/#popular">Popular</a>
      <button id="themeToggle" class="theme-toggle" type="button" aria-label="Toggle theme">🌙</button>
    </div>
  </div>
  <div class="container toolbar-row">
    <div class="toolbar-chip-group">
      <label class="inline-select">Language
        <select id="languagePref">
          <option>English</option>
          <option>Hindi</option>
          <option>Hinglish</option>
        </select>
      </label>
      <label class="inline-select">Units
        <select id="unitPref">
          <option>Metric</option>
          <option>Imperial</option>
          <option>Indian</option>
        </select>
      </label>
    </div>
  </div>
</header>'''


def footer_html(categories):
    links = ''.join(f'<a href="/{c["slug"]}/">{escape(c["name"])} ({len(c["tools"])} tools)</a>' for c in categories[:24])
    return f'''
<footer class="site-footer">
  <div class="container footer-grid">
    <div>
      <h3>CalcVerse</h3>
      <p>Free online calculators with formulas, FAQs, charts, exports, and mobile-first pages.</p>
    </div>
    <div>
      <h3>Quick links</h3>
      <a href="/sitemap.xml">Sitemap</a>
      <a href="/privacy.html">Privacy Policy</a>
      <a href="/disclaimer.html">Disclaimer</a>
      <a href="/about.html">About</a>
      <a href="/contact.html">Contact</a>
    </div>
    <div class="footer-categories">
      <h3>Top categories</h3>
      {links}
    </div>
  </div>
</footer>'''


def scientific_widget():
    return '''
<section class="widget-card sci-card">
  <div class="section-head"><h2>Scientific Calculator</h2><p>Basic + scientific, history, memory, and copy result.</p></div>
  <div class="sci-toolbar">
    <button class="mini-btn active" data-sci-mode="deg">Deg</button>
    <button class="mini-btn" data-sci-mode="rad">Rad</button>
    <button class="mini-btn" data-sci-action="clear-history">Clear history</button>
  </div>
  <div class="sci-display-wrap">
    <input id="sciExpression" class="sci-expression" placeholder="Type expression e.g. sin(30)+sqrt(49)" />
    <div id="sciResult" class="sci-result">0</div>
  </div>
  <div class="sci-grid">
    <button data-sci="7">7</button><button data-sci="8">8</button><button data-sci="9">9</button><button data-sci="/">÷</button><button data-sci="sin(">sin</button>
    <button data-sci="4">4</button><button data-sci="5">5</button><button data-sci="6">6</button><button data-sci="*">×</button><button data-sci="cos(">cos</button>
    <button data-sci="1">1</button><button data-sci="2">2</button><button data-sci="3">3</button><button data-sci="-">−</button><button data-sci="tan(">tan</button>
    <button data-sci="0">0</button><button data-sci=".">.</button><button data-sci="(">(</button><button data-sci=")">)</button><button data-sci="+">+</button>
    <button data-sci="sqrt(">√</button><button data-sci="log(">log</button><button data-sci="ln(">ln</button><button data-sci="pi">π</button><button data-sci="e">e</button>
    <button data-sci="^">xʸ</button><button data-sci="!">n!</button><button data-sci-action="mc">MC</button><button data-sci-action="mr">MR</button><button data-sci-action="eval" class="accent">=</button>
  </div>
  <div id="sciHistory" class="history-list"></div>
</section>'''


def tool_card(tool, category):
    badge = '<span class="badge badge-live">Working formula</span>' if tool['engine'] else '<span class="badge">SEO page scaffold</span>'
    return f'''
<a class="tool-card" href="/{tool['slug']}/">
  <div class="tool-card-top">
    <span class="tool-category">{escape(category['name'])}</span>
    {badge}
  </div>
  <h3>{escape(tool['name'])}</h3>
  <p>{escape(intro_for(tool['name'], category['name']))}</p>
</a>'''


def build_home(categories, tools):
    search_data = json.dumps([{
        'name': t['name'], 'url': f"/{t['slug']}/", 'category': c['name']
    } for c in categories for t in c['tools']])
    popular = []
    tool_map = {t['page_slug']: (t, c) for c in categories for t in c['tools']}
    for slug in POPULAR_SLUGS:
        if slug in tool_map:
            t, c = tool_map[slug]
            popular.append(tool_card(t, c))
    cat_cards = []
    emoji_pool = ['💰','🩺','📐','🧱','🔁','📅','🚗','🎓','🍳','🌾','⚡','💻','🌍','📊','🎯','🏠']
    for idx, category in enumerate(categories):
        top_tools = ''.join(f'<li><a href="/{tool["slug"]}/">{escape(tool["name"])}<\/a><\/li>' for tool in category['tools'][:8])
        cat_cards.append(f'''
        <article class="category-card">
          <div class="category-card-head"><span class="emoji">{emoji_pool[idx % len(emoji_pool)]}</span><div><h3>{escape(category['name'])}</h3><p>{len(category['tools'])} calculators</p></div></div>
          <ul>{top_tools}</ul>
          <a class="button ghost" href="/{category['slug']}/">View all</a>
        </article>
        ''')
    body = f'''
    {header_html(categories)}
    <main>
      <section class="hero">
        <div class="container hero-grid">
          <div>
            <span class="eyebrow">900+ free tools • formulas • charts • exports</span>
            <h1>Free Online Calculators for Finance, Health, Math, Science & More</h1>
            <p>Explore {sum(len(c['tools']) for c in categories)} calculator pages across {len(categories)} categories with step-by-step explanations, printable result views, and clean mobile-friendly design.</p>
            <form class="hero-search" onsubmit="return false;">
              <input id="heroSearch" type="search" placeholder="Search EMI, SIP, BMI, GST, Age, Concrete, Tax..." autocomplete="off" />
              <button type="button" class="button">Search</button>
              <div id="heroSuggestions" class="search-suggestions"></div>
            </form>
          </div>
          {scientific_widget()}
        </div>
      </section>

      <section id="popular" class="section">
        <div class="container">
          <div class="section-head"><h2>Popular calculators</h2><p>Fast access to the most-used planning tools.</p></div>
          <div class="tool-grid">{''.join(popular)}</div>
        </div>
      </section>

      <section class="section muted">
        <div class="container">
          <div class="section-head"><h2>Browse categories</h2><p>Original calculator hub UI with category-led navigation, search, and SEO-friendly pages.</p></div>
          <div class="category-grid">{''.join(cat_cards)}</div>
        </div>
      </section>
    </main>
    {footer_html(categories)}
    <script>window.CALC_SEARCH_DATA = {search_data};</script>
    '''
    html = page_shell(
        'Free Online Calculators for Finance, Health, Math, Science & More | CalcVerse',
        'Browse 900+ free online calculators with formulas, explanations, printable result views, charts, category pages, and mobile-friendly SEO pages.',
        body,
        f'{BASE_URL}/'
    )
    (ROOT / 'index.html').write_text(html)


def build_category_pages(categories):
    all_search = json.dumps([{'name': t['name'], 'url': f"/{t['slug']}/", 'category': c['name']} for c in categories for t in c['tools']])
    for category in categories:
        cards = ''.join(tool_card(t, category) for t in category['tools'])
        body = f'''
        {header_html(categories)}
        <main class="section">
          <div class="container">
            <nav class="breadcrumbs"><a href="/">Home</a> <span>/</span> <span>{escape(category['name'])}</span></nav>
            <div class="section-head"><h1>{escape(category['name'])} Calculators</h1><p>{len(category['tools'])} tools with formulas, FAQs, related calculators, and export-ready result layouts.</p></div>
            <div class="tool-grid">{cards}</div>
          </div>
        </main>
        {footer_html(categories)}
        <script>window.CALC_SEARCH_DATA = {all_search};</script>
        '''
        cat_dir = ROOT / category['slug']
        cat_dir.mkdir(parents=True, exist_ok=True)
        html = page_shell(
            f"{category['name']} Calculators | CalcVerse",
            f"Browse {len(category['tools'])} {category['name'].lower()} calculators with formulas, explanations, and related tools.",
            body,
            f"{BASE_URL}/{category['slug']}/"
        )
        (cat_dir / 'index.html').write_text(html)


def build_calc_form(tool):
    engine_note = '<p class="engine-note live-note">This page includes working calculation logic.</p>' if tool['engine'] else '<p class="engine-note">This page is fully SEO-ready and UI-complete. Add custom formula logic in <code>assets/site.js</code> for production-grade calculations.</p>'
    rows = []
    for idx, label in enumerate(tool['basic_inputs'][:10] or ['Primary value', 'Rate', 'Duration']):
        field = slugify(label)
        input_type = infer_input_type(label)
        placeholder = placeholder_for(label)
        unit = ''
        lower = label.lower()
        if 'currency' in lower:
            unit = '<select><option>INR</option><option>USD</option><option>EUR</option></select>'
        elif 'rate' in lower or '%' in lower:
            unit = '<span class="unit-pill">%</span>'
        elif 'month' in lower:
            unit = '<span class="unit-pill">months</span>'
        elif 'year' in lower or 'duration' in lower or 'time' in lower or 'tenure' in lower:
            unit = '<span class="unit-pill">years</span>'
        elif 'weight' in lower:
            unit = '<span class="unit-pill">kg</span>'
        elif 'height' in lower:
            unit = '<span class="unit-pill">cm</span>'
        elif 'date' in lower:
            unit = '<span class="unit-pill">date</span>'
        rows.append(f'''
        <label class="field">
          <span>{escape(label)} <button type="button" class="hint" title="Enter {escape(label.lower())}">?</button></span>
          <div class="input-wrap">
            <input type="{input_type}" name="{field}" placeholder="{escape(placeholder)}" />
            {unit}
          </div>
        </label>
        ''')
    advanced = ''.join(f'<li>{escape(item)}</li>' for item in tool['advanced_options'][:12]) or '<li>Decimal precision</li><li>Rounding rule</li><li>Scenario comparison</li>'
    return f'''
    <section class="calc-layout" data-engine="{tool['engine'] or ''}" data-page-slug="{tool['page_slug']}">
      <div class="calc-card">
        <div class="card-head"><h2>Calculator</h2><div class="button-row"><button type="button" class="button" data-action="sample">Sample</button><button type="button" class="button ghost" data-action="reset">Reset</button><button type="button" class="button accent" data-action="calculate">Calculate</button></div></div>
        {engine_note}
        <form class="calc-form">{''.join(rows)}
          <details class="advanced-box">
            <summary>Advanced options</summary>
            <ul>{advanced}</ul>
            <label class="field"><span>Decimal precision</span><div class="input-wrap"><input type="number" name="decimal_precision" value="2" min="0" max="8" /><span class="unit-pill">digits</span></div></label>
          </details>
        </form>
      </div>
      <aside class="result-card">
        <div class="card-head"><h2>Result</h2><div class="button-row"><button type="button" class="button ghost" data-action="copy">Copy</button><button type="button" class="button ghost" data-action="csv">CSV</button><button type="button" class="button ghost" data-action="print">Print / PDF</button><button type="button" class="button ghost" data-action="share">Share</button></div></div>
        <div class="primary-result" data-result-primary>Enter values and calculate</div>
        <div class="result-sub" data-result-sub>Detailed breakdown, charts, and tables will appear here.</div>
        <div class="chart-placeholder" data-chart-area></div>
        <table class="result-table" data-result-table>
          <tbody><tr><th>Output</th><td>Waiting for input</td></tr></tbody>
        </table>
      </aside>
    </section>
    '''


def build_tool_pages(categories):
    all_search = json.dumps([{'name': t['name'], 'url': f"/{t['slug']}/", 'category': c['name']} for c in categories for t in c['tools']])
    for category in categories:
        for tool in category['tools']:
            rel = related_tools(category, tool['page_slug'])
            related_html = ''.join(f'<a class="related-link" href="/{r["slug"]}/">{escape(r["name"])}<\/a>' for r in rel)
            faq = faq_items(tool['name'], category['name'])
            faq_html = ''.join(f'<details class="faq-item"><summary>{escape(item["q"])}</summary><p>{escape(item["a"])}</p></details>' for item in faq)
            faq_schema = {
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                'mainEntity': [{'@type': 'Question', 'name': item['q'], 'acceptedAnswer': {'@type': 'Answer', 'text': item['a']}} for item in faq]
            }
            tags = ', '.join(tool['basic_inputs'][:4]) if tool['basic_inputs'] else 'calculator inputs'
            body = f'''
            {header_html(categories)}
            <main class="section">
              <div class="container tool-page">
                <nav class="breadcrumbs"><a href="/">Home</a> <span>/</span> <a href="/{category['slug']}/">{escape(category['name'])}</a> <span>/</span> <span>{escape(tool['name'])}</span></nav>
                <article>
                  <header class="page-hero">
                    <h1>{escape(tool['name'])}</h1>
                    <p>{escape(intro_for(tool['name'], category['name']))}</p>
                    <div class="tag-row"><span class="tag">{escape(category['name'])}</span><span class="tag">{escape(tags)}</span><span class="tag">SEO-ready static HTML</span></div>
                  </header>
                  {build_calc_form(tool)}
                  <section class="content-grid">
                    <div class="content-card">
                      <h2>Formula</h2>
                      <p>{escape(formula_for(tool['name'], tool['basic_inputs']))}</p>
                      <h3>Variables</h3>
                      <ul>{''.join(f'<li>{escape(x)}</li>' for x in (tool['basic_inputs'][:8] or ['Primary value', 'Rate', 'Time']))}</ul>
                      <h3>Step-by-step example</h3>
                      <p>{escape(example_for(tool['name'], category['name']))}</p>
                    </div>
                    <div class="content-card">
                      <h2>How to use</h2>
                      <ol>
                        <li>Enter the required values in the form.</li>
                        <li>Open advanced options if you need precision, scenario comparison, or export-related settings.</li>
                        <li>Calculate the result, review the breakdown table, and export or print the output.</li>
                      </ol>
                      <h3>Common mistakes</h3>
                      <ul><li>Using the wrong unit system or date format.</li><li>Mixing yearly and monthly rates.</li><li>Ignoring assumptions, fees, or category-specific disclaimers.</li></ul>
                    </div>
                  </section>
                  <section class="content-card">
                    <h2>Related calculators</h2>
                    <div class="related-grid">{related_html}</div>
                  </section>
                  <section class="content-card">
                    <h2>FAQ</h2>
                    {faq_html}
                  </section>
                  <section class="content-card disclaimer-box">
                    <h2>Disclaimer</h2>
                    <p>{escape(get_disclaimer(category['name']))}</p>
                  </section>
                </article>
              </div>
            </main>
            {footer_html(categories)}
            <script>window.CALC_SEARCH_DATA = {all_search};</script>
            <script type="application/ld+json">{json.dumps(faq_schema)}</script>
            '''
            title = f"{tool['name']} | Formula, Example, FAQ & Calculator"
            description = f"Use the {tool['name']} to calculate results fast. Includes formula, example, FAQ, related tools, print view, and mobile-friendly layout."
            html = page_shell(title, description, body, f"{BASE_URL}/{tool['slug']}/")
            tool_dir = ROOT / tool['slug']
            tool_dir.mkdir(parents=True, exist_ok=True)
            (tool_dir / 'index.html').write_text(html)


def build_support_pages(categories):
    pages = {
        'privacy.html': ('Privacy Policy | CalcVerse', 'Privacy-first static calculator website', '<main class="section"><div class="container prose"><h1>Privacy Policy</h1><p>This website works without account signup for basic use. Theme, calculator history, and recent calculations may be stored locally in your browser for convenience. No API is required for the static version.</p></div></main>'),
        'about.html': ('About | CalcVerse', 'About this calculator hub', '<main class="section"><div class="container prose"><h1>About CalcVerse</h1><p>CalcVerse is a fast, category-based calculator hub designed to feel simple like classic utility sites while looking more modern, mobile-first, and export-friendly.</p></div></main>'),
        'contact.html': ('Contact | CalcVerse', 'Contact page', '<main class="section"><div class="container prose"><h1>Contact</h1><p>Replace this section with your own support email, feedback form, or contact details before deployment.</p></div></main>'),
        'disclaimer.html': ('Disclaimer | CalcVerse', 'General disclaimer', '<main class="section"><div class="container prose"><h1>General Disclaimer</h1><p>All tools are provided for informational and educational purposes only. Verify critical outputs independently before acting on them in real-world scenarios.</p></div></main>'),
    }
    search_data = json.dumps([{'name': t['name'], 'url': f"/{t['slug']}/", 'category': c['name']} for c in categories for t in c['tools']])
    for filename, (title, description, main) in pages.items():
        html = page_shell(title, description, f"{header_html(categories)}{main}{footer_html(categories)}<script>window.CALC_SEARCH_DATA = {search_data};</script>", f"{BASE_URL}/{filename}")
        (ROOT / filename).write_text(html)


def build_assets(categories):
    styles = r'''
:root {
  --bg: #f7f8fb;
  --card: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --line: #e2e8f0;
  --brand: #1d4ed8;
  --brand-2: #0f766e;
  --soft: #eef4ff;
  --shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}
html[data-theme='dark'] {
  --bg: #0b1220;
  --card: #111827;
  --text: #e5eefc;
  --muted: #94a3b8;
  --line: #243042;
  --brand: #60a5fa;
  --brand-2: #2dd4bf;
  --soft: #111b2f;
  --shadow: 0 10px 28px rgba(0,0,0,0.38);
}
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, Arial, sans-serif; background: var(--bg); color: var(--text); }
a { color: var(--brand); text-decoration: none; }
a:hover { text-decoration: underline; }
.container { width: min(1180px, calc(100% - 32px)); margin: 0 auto; }
.section { padding: 36px 0; }
.muted { background: linear-gradient(180deg, transparent, rgba(29,78,216,0.03)); }
.site-header { position: sticky; top: 0; z-index: 30; backdrop-filter: blur(10px); background: color-mix(in srgb, var(--bg) 88%, transparent); border-bottom: 1px solid var(--line); }
.header-row, .toolbar-row { display: flex; align-items: center; gap: 16px; }
.header-row { padding: 14px 0; }
.toolbar-row { padding: 0 0 12px; justify-content: space-between; }
.brand { font-size: 1.4rem; font-weight: 800; color: var(--text); }
.header-search, .hero-search { position: relative; flex: 1; }
.header-search input, .hero-search input, select, .sci-expression, .field input { width: 100%; border: 1px solid var(--line); background: var(--card); color: var(--text); border-radius: 14px; padding: 14px 16px; outline: none; }
.header-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.theme-toggle, .mini-btn, .sci-grid button, .button, .hint { border: 1px solid var(--line); background: var(--card); color: var(--text); border-radius: 12px; cursor: pointer; }
.theme-toggle, .mini-btn, .sci-grid button, .hint { padding: 10px 12px; }
.button { padding: 12px 16px; font-weight: 700; }
.button.accent, .sci-grid .accent { background: linear-gradient(135deg, var(--brand), var(--brand-2)); color: white; border: none; }
.button.ghost { background: transparent; }
.hero { padding: 42px 0 28px; }
.hero-grid { display: grid; grid-template-columns: 1.2fr .9fr; gap: 24px; align-items: start; }
.eyebrow { display: inline-flex; margin-bottom: 12px; background: var(--soft); color: var(--brand); padding: 8px 12px; border-radius: 999px; font-weight: 700; }
h1, h2, h3 { line-height: 1.1; margin: 0 0 12px; }
h1 { font-size: clamp(2rem, 4vw, 3.2rem); }
p { color: var(--muted); line-height: 1.6; }
.widget-card, .category-card, .tool-card, .calc-card, .result-card, .content-card, .prose { background: var(--card); border: 1px solid var(--line); border-radius: 20px; box-shadow: var(--shadow); }
.widget-card, .calc-card, .result-card, .content-card, .prose { padding: 22px; }
.section-head { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.tool-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.tool-card { display: block; padding: 18px; }
.tool-card h3 { font-size: 1.1rem; }
.tool-card-top, .category-card-head, .card-head, .button-row, .tag-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tool-card-top { justify-content: space-between; }
.tool-category, .badge, .tag, .unit-pill { display: inline-flex; align-items: center; padding: 6px 10px; border-radius: 999px; background: var(--soft); color: var(--brand); font-size: .84rem; font-weight: 700; }
.badge-live { color: #047857; background: rgba(16, 185, 129, 0.12); }
.category-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.category-card { padding: 20px; }
.category-card ul { padding-left: 18px; margin: 14px 0; color: var(--muted); }
.category-card li { margin-bottom: 8px; }
.emoji { font-size: 1.6rem; }
.site-footer { border-top: 1px solid var(--line); margin-top: 32px; padding: 32px 0 40px; }
.footer-grid { display: grid; grid-template-columns: 1.2fr .8fr 1.2fr; gap: 24px; }
.footer-grid a { display: inline-block; margin: 4px 12px 4px 0; }
.breadcrumbs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; font-size: .95rem; color: var(--muted); }
.page-hero { margin-bottom: 24px; }
.calc-layout { display: grid; grid-template-columns: 1.1fr .9fr; gap: 18px; margin: 20px 0 24px; }
.calc-form { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.field span { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; }
.input-wrap { display: flex; align-items: center; gap: 10px; }
.input-wrap > * { flex: 1; }
.unit-pill { white-space: nowrap; }
.hint { width: 24px; height: 24px; padding: 0; border-radius: 999px; }
.primary-result { font-size: clamp(1.4rem, 3vw, 2rem); font-weight: 800; margin-bottom: 6px; }
.result-sub { margin-bottom: 16px; color: var(--muted); }
.result-table { width: 100%; border-collapse: collapse; }
.result-table th, .result-table td { padding: 12px 10px; border-top: 1px solid var(--line); text-align: left; }
.chart-placeholder { min-height: 160px; background: linear-gradient(180deg, color-mix(in srgb, var(--brand) 8%, transparent), transparent); border: 1px dashed var(--line); border-radius: 16px; display: grid; place-items: center; color: var(--muted); margin-bottom: 16px; }
.content-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; margin-bottom: 18px; }
.related-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.related-link { display: block; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--line); background: var(--soft); }
.faq-item { border-top: 1px solid var(--line); padding: 12px 0; }
.faq-item summary { cursor: pointer; font-weight: 700; }
.disclaimer-box { border-left: 4px solid #f59e0b; }
.search-suggestions { position: absolute; top: calc(100% + 8px); left: 0; right: 0; background: var(--card); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow); display: none; max-height: 360px; overflow: auto; }
.search-suggestions a { display: block; padding: 12px 14px; border-bottom: 1px solid var(--line); color: var(--text); }
.search-suggestions a small { display: block; color: var(--muted); margin-top: 4px; }
.sci-toolbar, .toolbar-chip-group { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.sci-display-wrap { margin-bottom: 14px; }
.sci-result { font-size: 1.6rem; font-weight: 800; margin-top: 10px; }
.sci-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.history-list { margin-top: 12px; font-size: .95rem; color: var(--muted); }
.inline-select { display: inline-flex; align-items: center; gap: 8px; font-size: .92rem; color: var(--muted); }
.inline-select select { min-width: 110px; padding: 10px 12px; }
.advanced-box { grid-column: 1 / -1; border-top: 1px solid var(--line); padding-top: 12px; }
.advanced-box ul { padding-left: 18px; color: var(--muted); }
.engine-note { margin-top: 0; margin-bottom: 16px; padding: 12px 14px; background: color-mix(in srgb, var(--brand) 8%, transparent); border-radius: 12px; }
.live-note { background: rgba(16, 185, 129, 0.10); color: #047857; }
.prose { max-width: 900px; }
@media (max-width: 960px) {
  .hero-grid, .calc-layout, .content-grid, .footer-grid { grid-template-columns: 1fr; }
  .tool-grid, .category-grid, .related-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 680px) {
  .header-row, .toolbar-row { flex-direction: column; align-items: stretch; }
  .header-actions { margin-left: 0; }
  .tool-grid, .category-grid, .related-grid, .calc-form { grid-template-columns: 1fr; }
  .container { width: min(100% - 24px, 1180px); }
}
'''
    (ROOT / 'assets' / 'styles.css').write_text(styles)

    js = '''
(function(){
  const root = document.documentElement;
  const storedTheme = localStorage.getItem('cv_theme');
  if (storedTheme) root.setAttribute('data-theme', storedTheme);

  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('cv_theme', next);
  });

  ['languagePref','unitPref'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const key = 'cv_' + id;
    const val = localStorage.getItem(key);
    if (val) el.value = val;
    el.addEventListener('change', () => localStorage.setItem(key, el.value));
  });

  const jump = document.getElementById('categoryJump');
  if (jump) jump.addEventListener('change', () => { if (jump.value) location.href = jump.value; });

  function attachSearch(inputId, suggestionsId) {
    const input = document.getElementById(inputId);
    const box = document.getElementById(suggestionsId);
    if (!input || !box || !window.CALC_SEARCH_DATA) return;
    const render = () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { box.style.display = 'none'; box.innerHTML = ''; return; }
      const items = window.CALC_SEARCH_DATA.filter(item => item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)).slice(0, 8);
      box.innerHTML = items.map(item => `<a href="${item.url}">${item.name}<small>${item.category}</small></a>`).join('');
      box.style.display = items.length ? 'block' : 'none';
    };
    input.addEventListener('input', render);
    input.addEventListener('focus', render);
    document.addEventListener('click', (e) => { if (!box.contains(e.target) && e.target !== input) box.style.display = 'none'; });
  }
  attachSearch('globalSearch', 'searchSuggestions');
  attachSearch('heroSearch', 'heroSuggestions');

  function factorial(n){
    n = Math.floor(Number(n));
    if (n < 0 || !Number.isFinite(n)) return NaN;
    let r = 1;
    for (let i=2;i<=n;i++) r *= i;
    return r;
  }

  const sciInput = document.getElementById('sciExpression');
  const sciResult = document.getElementById('sciResult');
  const sciHistory = document.getElementById('sciHistory');
  let sciMode = 'deg';
  let sciMemory = Number(localStorage.getItem('cv_sci_memory') || 0);
  let history = JSON.parse(localStorage.getItem('cv_sci_history') || '[]');

  function refreshHistory(){
    if (!sciHistory) return;
    sciHistory.innerHTML = history.slice(0,6).map(x => `<div>${x}</div>`).join('') || '<div>No history yet.</div>';
  }
  refreshHistory();

  function transformExpression(expr){
    let out = expr
      .replace(/pi/g, String(Math.PI))
      .replace(/\be\b/g, String(Math.E))
      .replace(/sqrt\(/g, 'Math.sqrt(')
      .replace(/log\(/g, 'Math.log10(')
      .replace(/ln\(/g, 'Math.log(')
      .replace(/sin\(([^)]+)\)/g, (_, a) => `Math.sin(${sciMode==='deg' ? '('+a+')*Math.PI/180' : a})`)
      .replace(/cos\(([^)]+)\)/g, (_, a) => `Math.cos(${sciMode==='deg' ? '('+a+')*Math.PI/180' : a})`)
      .replace(/tan\(([^)]+)\)/g, (_, a) => `Math.tan(${sciMode==='deg' ? '('+a+')*Math.PI/180' : a})`)
      .replace(/(\d+)\!/g, (_, a) => `factorial(${a})`)
      .replace(/\^/g, '**');
    return out;
  }

  function evaluateSci(){
    if (!sciInput || !sciResult) return;
    try {
      const expr = transformExpression(sciInput.value || '0');
      const value = Function('factorial', `return ${expr}`)(factorial);
      sciResult.textContent = Number.isFinite(value) ? Number(value).toLocaleString(undefined, {maximumFractionDigits: 12}) : 'Error';
      history.unshift(`${sciInput.value} = ${sciResult.textContent}`);
      history = history.slice(0, 12);
      localStorage.setItem('cv_sci_history', JSON.stringify(history));
      refreshHistory();
    } catch (e) {
      sciResult.textContent = 'Error';
    }
  }

  document.querySelectorAll('[data-sci]').forEach(btn => btn.addEventListener('click', () => {
    if (!sciInput) return;
    sciInput.value += btn.getAttribute('data-sci');
    sciInput.focus();
  }));
  document.querySelectorAll('[data-sci-mode]').forEach(btn => btn.addEventListener('click', () => {
    sciMode = btn.getAttribute('data-sci-mode');
    document.querySelectorAll('[data-sci-mode]').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
  }));
  document.querySelectorAll('[data-sci-action]').forEach(btn => btn.addEventListener('click', () => {
    const act = btn.getAttribute('data-sci-action');
    if (act === 'eval') evaluateSci();
    if (act === 'clear-history') { history = []; localStorage.setItem('cv_sci_history', '[]'); refreshHistory(); }
    if (act === 'mc') { sciMemory = 0; localStorage.setItem('cv_sci_memory', '0'); }
    if (act === 'mr' && sciInput) sciInput.value += String(sciMemory || 0);
  }));
  if (sciInput) sciInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); evaluateSci(); } });

  function fmt(n, precision=2){
    if (!Number.isFinite(n)) return '—';
    return Number(n).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: precision});
  }
  function readForm(form){
    const obj = {};
    new FormData(form).forEach((value, key) => obj[key] = value);
    return obj;
  }
  function setTable(table, rows){
    table.querySelector('tbody').innerHTML = rows.map(([k,v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');
  }
  function drawBars(area, rows){
    area.innerHTML = '';
    const vals = rows.map(r => Number(r[1])).filter(Number.isFinite);
    if (!vals.length) { area.textContent = 'Chart preview will appear here.'; return; }
    const max = Math.max(...vals) || 1;
    const wrap = document.createElement('div');
    wrap.style.display = 'grid';
    wrap.style.gap = '10px';
    rows.forEach(([label, value]) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return;
      const row = document.createElement('div');
      row.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:.9rem;margin-bottom:4px"><span>${label}</span><strong>${fmt(num)}</strong></div><div style="height:10px;background:rgba(148,163,184,.18);border-radius:999px;overflow:hidden"><div style="width:${Math.max(8, (num/max)*100)}%;height:100%;background:linear-gradient(135deg,#2563eb,#0f766e)"></div></div>`;
      wrap.appendChild(row);
    });
    area.appendChild(wrap);
  }
  function copyText(text){ navigator.clipboard?.writeText(text); }
  function exportTableCSV(table, filename){
    const rows = [...table.querySelectorAll('tr')].map(tr => [...tr.children].map(td => `"${(td.textContent || '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([rows.join('\n')], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }
  function fillSample(slug, form){
    const samples = {
      'emi-calculator': {loan_amount: 1000000, interest_rate: 9, tenure_months_years: 20, processing_fee: 1, start_date: '2026-01-01'},
      'loan-calculator': {loan_amount: 500000, interest_rate: 12, tenure_months_years: 5},
      'sip-calculator': {monthly_investment: 10000, expected_annual_return: 12, investment_duration: 15, step_up: 10, inflation: 6},
      'fd-calculator': {amount_value: 200000, rate_or_return: 7.2, time_period: 5},
      'simple-interest': {amount_value: 100000, rate_or_return: 8, time_period: 3},
      'compound-interest': {amount_value: 100000, rate_or_return: 10, time_period: 5},
      'percentage-calculator': {part: 75, whole: 300},
      'bmi-calculator': {weight: 70, height: 175, age: 30},
      'age-calculator': {date_of_birth: '1995-08-15', target_date: '2026-06-06'},
      'gst-calculator': {amount_value: 1000, rate_or_return: 18},
      'calorie-calculator': {age: 30, weight: 70, height: 175, activity_level: 1.55},
      'body-fat-calculator': {age: 30, weight: 70, height: 175}
    };
    const sample = samples[slug] || {};
    Object.entries(sample).forEach(([name, value]) => {
      const input = form.querySelector(`[name="${name}"]`);
      if (input) input.value = value;
    });
  }

  function num(obj, key, fallback){
    const raw = obj[key];
    const val = Number(raw);
    return Number.isFinite(val) ? val : fallback;
  }
  function valByIncludes(obj, includes, fallback){
    const key = Object.keys(obj).find(k => includes.some(x => k.includes(x)));
    if (!key) return fallback;
    const v = Number(obj[key]);
    return Number.isFinite(v) ? v : fallback;
  }
  function strByIncludes(obj, includes){
    const key = Object.keys(obj).find(k => includes.some(x => k.includes(x)));
    return key ? String(obj[key] || '') : '';
  }

  function calculate(engine, data){
    switch(engine){
      case 'emi': {
        const P = valByIncludes(data, ['loan_amount','amount_value','principal','loan'], 1000000);
        const annual = valByIncludes(data, ['interest_rate','rate_or_return','rate'], 9);
        let tenure = valByIncludes(data, ['tenure','duration','time_period'], 20);
        let months = tenure > 50 ? tenure : tenure * 12;
        const feePct = valByIncludes(data, ['processing_fee','fee'], 0);
        const r = annual / 12 / 100;
        const emi = P * r * Math.pow(1+r, months) / (Math.pow(1+r, months) - 1);
        const total = emi * months;
        const interest = total - P;
        const fee = P * feePct / 100;
        return { primary: `Monthly EMI: ${fmt(emi)}`, sub: 'Includes principal, total interest, and one-time fee estimate.', rows: [['Loan amount', P], ['Monthly EMI', emi], ['Total interest', interest], ['Processing fee', fee], ['Total payment', total + fee]] };
      }
      case 'sip': {
        const sip = valByIncludes(data, ['monthly_investment','sip'], 10000);
        const annual = valByIncludes(data, ['expected_annual_return','rate_or_return','rate'], 12);
        const years = valByIncludes(data, ['investment_duration','duration','time_period'], 15);
        const step = valByIncludes(data, ['step_up'], 0);
        let invested = 0, future = 0;
        const i = annual/12/100;
        for (let y=0;y<years;y++){
          const monthly = sip * Math.pow(1+step/100, y);
          for(let m=0;m<12;m++){
            const remaining = (years*12) - (y*12+m);
            invested += monthly;
            future += monthly * Math.pow(1+i, remaining);
          }
        }
        return { primary: `Estimated future value: ${fmt(future)}`, sub: 'Shows invested amount and projected gains based on expected return.', rows: [['Monthly SIP', sip], ['Total invested', invested], ['Estimated value', future], ['Estimated gain', future - invested]] };
      }
      case 'fd': {
        const P = valByIncludes(data, ['amount_value','deposit','amount'], 200000);
        const annual = valByIncludes(data, ['rate_or_return','rate'], 7.2);
        const years = valByIncludes(data, ['time_period','duration','years'], 5);
        const m = 4;
        const maturity = P * Math.pow(1 + annual/100/m, m*years);
        return { primary: `Maturity value: ${fmt(maturity)}`, sub: 'Quarterly compounding assumption used for the sample estimate.', rows: [['Deposit', P], ['Annual rate %', annual], ['Years', years], ['Interest earned', maturity - P], ['Maturity amount', maturity]] };
      }
      case 'simpleInterest': {
        const P = valByIncludes(data, ['amount_value','principal','amount'], 100000);
        const r = valByIncludes(data, ['rate_or_return','rate'], 8);
        const t = valByIncludes(data, ['time_period','duration','years'], 3);
        const si = P*r*t/100;
        return { primary: `Simple interest: ${fmt(si)}`, sub: 'Quick principal + interest estimate.', rows: [['Principal', P], ['Rate %', r], ['Time', t], ['Interest', si], ['Total amount', P + si]] };
      }
      case 'compoundInterest': {
        const P = valByIncludes(data, ['amount_value','principal','amount'], 100000);
        const r = valByIncludes(data, ['rate_or_return','rate'], 10);
        const t = valByIncludes(data, ['time_period','duration','years'], 5);
        const n = 4;
        const amount = P * Math.pow(1+r/100/n, n*t);
        return { primary: `Compound amount: ${fmt(amount)}`, sub: 'Quarterly compounding assumed.', rows: [['Principal', P], ['Rate %', r], ['Time', t], ['Interest', amount-P], ['Final amount', amount]] };
      }
      case 'percentage': {
        const part = valByIncludes(data, ['part','amount_value','value'], 75);
        const whole = valByIncludes(data, ['whole','total'], 300);
        const pct = whole ? (part/whole)*100 : 0;
        return { primary: `${fmt(pct)}%`, sub: 'Percentage = part ÷ whole × 100.', rows: [['Part', part], ['Whole', whole], ['Percentage', pct]] };
      }
      case 'bmi': {
        const weight = valByIncludes(data, ['weight'], 70);
        const heightCm = valByIncludes(data, ['height'], 175);
        const heightM = heightCm/100;
        const bmi = weight/(heightM*heightM);
        let band = 'Underweight';
        if (bmi >= 18.5) band = 'Healthy range';
        if (bmi >= 25) band = 'Overweight';
        if (bmi >= 30) band = 'Obesity';
        return { primary: `BMI: ${fmt(bmi)}`, sub: `Interpretation: ${band}.`, rows: [['Weight (kg)', weight], ['Height (cm)', heightCm], ['BMI', bmi]] };
      }
      case 'age': {
        const birth = new Date(strByIncludes(data, ['date_of_birth','birth_date','dob']) || '1995-08-15');
        const target = new Date(strByIncludes(data, ['target_date','date']) || new Date().toISOString().slice(0,10));
        let years = target.getFullYear() - birth.getFullYear();
        let months = target.getMonth() - birth.getMonth();
        let days = target.getDate() - birth.getDate();
        if (days < 0) { months--; days += 30; }
        if (months < 0) { years--; months += 12; }
        const totalDays = Math.floor((target - birth) / 86400000);
        return { primary: `${years} years, ${months} months, ${days} days`, sub: 'Age difference between the selected dates.', rows: [['Birth date', birth.toISOString().slice(0,10)], ['Target date', target.toISOString().slice(0,10)], ['Total days', totalDays], ['Completed years', years]] };
      }
      case 'gst': {
        const base = valByIncludes(data, ['amount_value','amount','price','value'], 1000);
        const rate = valByIncludes(data, ['rate_or_return','rate'], 18);
        const gst = base * rate / 100;
        return { primary: `Total incl. GST: ${fmt(base + gst)}`, sub: 'Base value, GST amount, and final total.', rows: [['Base amount', base], ['GST rate %', rate], ['GST amount', gst], ['Total amount', base + gst]] };
      }
      case 'calorie': {
        const age = valByIncludes(data, ['age'], 30);
        const weight = valByIncludes(data, ['weight'], 70);
        const height = valByIncludes(data, ['height'], 175);
        const activity = valByIncludes(data, ['activity_level'], 1.55);
        const bmr = 10*weight + 6.25*height - 5*age + 5;
        const calories = bmr * activity;
        return { primary: `Daily calories: ${fmt(calories)}`, sub: 'Estimated using Mifflin-St Jeor sample formula (male default assumption).', rows: [['Age', age], ['Weight (kg)', weight], ['Height (cm)', height], ['BMR', bmr], ['Maintenance calories', calories]] };
      }
      case 'bodyFat': {
        const bmiData = calculate('bmi', data);
        const age = valByIncludes(data, ['age'], 30);
        const bmi = Number(String(bmiData.rows.find(r => r[0] === 'BMI')?.[1] || 0));
        const bodyFat = 1.20*bmi + 0.23*age - 16.2;
        return { primary: `Estimated body fat: ${fmt(bodyFat)}%`, sub: 'General estimate based on BMI and age.', rows: [['BMI', bmi], ['Age', age], ['Estimated body fat %', bodyFat]] };
      }
      default:
        return null;
    }
  }

  document.querySelectorAll('.calc-layout').forEach(layout => {
    const engine = layout.getAttribute('data-engine');
    const slug = layout.getAttribute('data-page-slug');
    const form = layout.querySelector('.calc-form');
    const primary = layout.querySelector('[data-result-primary]');
    const sub = layout.querySelector('[data-result-sub]');
    const table = layout.querySelector('[data-result-table]');
    const chart = layout.querySelector('[data-chart-area]');

    function run(){
      const data = readForm(form);
      const out = calculate(engine, data);
      if (!out) {
        primary.textContent = 'Static SEO page ready';
        sub.textContent = 'This page already includes layout, export buttons, FAQ schema, related tools, and content sections. Add a custom formula hook for exact production math.';
        setTable(table, Object.entries(data).filter(([k,v]) => v !== '').slice(0,6).map(([k,v]) => [k.replace(/_/g,' '), v]).concat([['Mode', 'Template / content-ready']]))
        chart.textContent = 'Attach a custom chart to this calculator when you add its formula logic.';
        return;
      }
      primary.textContent = out.primary;
      sub.textContent = out.sub;
      setTable(table, out.rows.map(([k,v]) => [k, typeof v === 'number' ? fmt(v) : v]));
      drawBars(chart, out.rows.map(([k,v]) => [k, Number(v)]));
      localStorage.setItem('cv_calc_' + slug, JSON.stringify({data, out}));
    }

    layout.querySelector('[data-action="calculate"]')?.addEventListener('click', run);
    layout.querySelector('[data-action="reset"]')?.addEventListener('click', () => { form.reset(); primary.textContent = 'Enter values and calculate'; sub.textContent = 'Detailed breakdown, charts, and tables will appear here.'; setTable(table, [['Output', 'Waiting for input']]); chart.textContent = ''; });
    layout.querySelector('[data-action="sample"]')?.addEventListener('click', () => { fillSample(slug, form); run(); });
    layout.querySelector('[data-action="copy"]')?.addEventListener('click', () => copyText(primary.textContent + '\n' + sub.textContent));
    layout.querySelector('[data-action="csv"]')?.addEventListener('click', () => exportTableCSV(table, slug + '.csv'));
    layout.querySelector('[data-action="print"]')?.addEventListener('click', () => window.print());
    layout.querySelector('[data-action="share"]')?.addEventListener('click', async () => {
      const url = new URL(location.href);
      const data = readForm(form);
      Object.entries(data).forEach(([k,v]) => { if (v) url.searchParams.set(k, v); });
      try { await navigator.share?.({title: document.title, url: url.toString()}); } catch(e) {}
      copyText(url.toString());
    });

    const params = new URLSearchParams(location.search);
    params.forEach((v,k) => { const input = form.querySelector(`[name="${k}"]`); if (input) input.value = v; });
    if (params.toString()) run(); else if (engine) fillSample(slug, form);
  });
})();
'''
    (ROOT / 'assets' / 'site.js').write_text(js)


def build_data(categories):
    tools = [t | {'category': c['name']} for c in categories for t in c['tools']]
    (ROOT / 'data' / 'categories.json').write_text(json.dumps(categories, indent=2))
    (ROOT / 'data' / 'tools.json').write_text(json.dumps(tools, indent=2))


def build_sitemap(categories):
    urls = [f'{BASE_URL}/']
    urls += [f'{BASE_URL}/{c["slug"]}/' for c in categories]
    urls += [f'{BASE_URL}/{t["slug"]}/' for c in categories for t in c['tools']]
    urls += [f'{BASE_URL}/{name}' for name in ['privacy.html', 'about.html', 'contact.html', 'disclaimer.html']]
    xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url in urls:
        xml.append(f'  <url><loc>{escape(url)}</loc></url>')
    xml.append('</urlset>')
    (ROOT / 'sitemap.xml').write_text('\n'.join(xml))
    (ROOT / 'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\n')


def build_readme(categories):
    live = sum(1 for c in categories for t in c['tools'] if t['engine'])
    total = sum(len(c['tools']) for c in categories)
    text = f'''# CalcVerse static calculator hub

Generated from the attached project brief.

- Categories: {len(categories)}
- Calculator pages: {total}
- Pages with working JS formula hooks included: {live}
- Stack: static HTML + CSS + vanilla JS
- No API required

## What is included

- Homepage with scientific calculator widget
- Autocomplete search
- Category pages
- Individual calculator pages
- Formula / example / FAQ / related tools sections
- Light / dark mode
- Print / Save PDF flow via browser print
- CSV export for result tables
- Sitemap, robots, privacy, contact, about, disclaimer pages

## Important

This scaffold generates SEO-ready static HTML for all tools from the brief. A first batch of high-demand calculators already has working formulas in `assets/site.js`.

To make more calculators fully functional, add their exact logic in the `calculate()` switch inside `assets/site.js` and optionally add sample values in `fillSample()`.
'''
    (ROOT / 'README.md').write_text(text)


def main():
    categories = parse_spec()
    build_assets(categories)
    build_data(categories)
    build_home(categories, [])
    build_category_pages(categories)
    build_tool_pages(categories)
    build_support_pages(categories)
    build_sitemap(categories)
    build_readme(categories)
    print(json.dumps({
        'categories': len(categories),
        'tools': sum(len(c['tools']) for c in categories),
        'working_engines': sum(1 for c in categories for t in c['tools'] if t['engine'])
    }, indent=2))

if __name__ == '__main__':
    main()
