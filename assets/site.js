(function () {
  var root = document.documentElement;

  function qs(sel, el) { return (el || document).querySelector(sel); }
  function qsa(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }

  var savedTheme = localStorage.getItem('cv_theme');
  if (savedTheme) root.setAttribute('data-theme', savedTheme);

  var themeBtn = qs('#themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('cv_theme', next);
    });
  }

  ['languagePref', 'unitPref'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    var key = 'cv_' + id;
    var val = localStorage.getItem(key);
    if (val) el.value = val;
    el.addEventListener('change', function () { localStorage.setItem(key, el.value); });
  });

  var jump = document.getElementById('categoryJump');
  if (jump) jump.addEventListener('change', function () { if (jump.value) location.href = jump.value; });

  function attachSearch(inputId, suggestionsId) {
    var input = document.getElementById(inputId);
    var box = document.getElementById(suggestionsId);
    if (!input || !box || !window.CALC_SEARCH_DATA) return;
    function render() {
      var q = (input.value || '').trim().toLowerCase();
      if (!q) { box.innerHTML = ''; box.style.display = 'none'; return; }
      var items = window.CALC_SEARCH_DATA.filter(function (item) {
        return item.name.toLowerCase().indexOf(q) !== -1 || item.category.toLowerCase().indexOf(q) !== -1;
      }).slice(0, 10);
      box.innerHTML = items.map(function (item) {
        return '<a href="' + item.url + '">' + item.name + '<small>' + item.category + '</small></a>';
      }).join('');
      box.style.display = items.length ? 'block' : 'none';
    }
    input.addEventListener('input', render);
    input.addEventListener('focus', render);
    document.addEventListener('click', function (e) {
      if (!box.contains(e.target) && e.target !== input) box.style.display = 'none';
    });
  }

  attachSearch('globalSearch', 'searchSuggestions');
  attachSearch('heroSearch', 'heroSuggestions');

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || form.tagName !== 'FORM') return;
    var input = form.querySelector('input[type=search]');
    if (!input || !input.value.trim()) return;
    if (form.action.indexOf('/search.html') === -1) {
      event.preventDefault();
      location.href = '/search.html?q=' + encodeURIComponent(input.value.trim());
    }
  });

  function formatToolCard(item) {
    return '<article class="tool-card"><a href="' + item.url + '"><h2>' + item.name + '</h2><p>' + item.category + '</p></a></article>';
  }

  function renderSearchResults() {
    var container = qs('#searchResults');
    var summary = qs('.search-summary');
    if (!container || !summary) return;
    var params = new URLSearchParams(location.search);
    var query = (params.get('q') || '').trim();
    if (!query) {
      summary.textContent = 'Enter a search term above to find calculators and tools.';
      container.innerHTML = '';
      return;
    }
    var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    var results = (window.CALC_SEARCH_DATA || []).filter(function (item) {
      var hay = (item.name + ' ' + item.category).toLowerCase();
      return terms.every(function (term) { return hay.indexOf(term) !== -1; });
    });
    if (!results.length) {
      summary.textContent = 'No calculators matched "' + query + '". Try shorter keywords like "BMI", "loan" or "interest".';
      container.innerHTML = '<div class="empty-state">No results found for "' + query + '".</div>';
      return;
    }
    summary.innerHTML = '<strong>' + results.length + ' results for "' + query + '"</strong>';
    container.innerHTML = results.slice(0, 50).map(formatToolCard).join('');
  }

  function fillCategoryJump() {
    var sel = document.getElementById('categoryJump');
    if (!sel || !window.CALC_SEARCH_DATA) return;
    var categories = Array.from(new Set(window.CALC_SEARCH_DATA.map(function (item) { return item.category; }))).sort();
    sel.innerHTML = '<option value="">Categories</option>' + categories.map(function (cat) {
      return '<option value="/search.html?q=' + encodeURIComponent(cat) + '">' + cat + '</option>';
    }).join('');
  }

  var PAGE_THEME_MAP = {
    finance: { class: 'theme-finance', label: 'Finance', icon: '💰' },
    health: { class: 'theme-health', label: 'Health', icon: '❤️' },
    math: { class: 'theme-math', label: 'Math', icon: '∑' },
    geometry: { class: 'theme-chemistry', label: 'Geometry', icon: '📐' },
    physics: { class: 'theme-physics', label: 'Physics', icon: '⚛️' },
    chemistry: { class: 'theme-chemistry', label: 'Chemistry', icon: '🧪' },
    construction: { class: 'theme-construction', label: 'Construction', icon: '🏗️' },
    food: { class: 'theme-food', label: 'Food', icon: '🍽️' },
    education: { class: 'theme-education', label: 'Education', icon: '🎓' },
    automotive: { class: 'theme-automotive', label: 'Automotive', icon: '🚗' },
    converter: { class: 'theme-converter', label: 'Converter', icon: '🔄' },
    date: { class: 'theme-date', label: 'Date', icon: '📅' },
    generic: { class: 'theme-generic', label: 'Calculator', icon: '🧮' }
  };

  function getToolTheme(slug, path) {
    var family = normalizeFamily(slug, slug, path) || detectCalculatorType(slug, path) || 'generic';
    return PAGE_THEME_MAP[family] || PAGE_THEME_MAP.generic;
  }

  function createAssistantPanel() {
    if (qs('.utility-panel')) return;
    var panel = document.createElement('div');
    panel.className = 'utility-panel';
    panel.innerHTML = '<button type="button" id="recentToolsToggle">Recently viewed</button>' +
      '<button type="button" id="favoriteToolsToggle">Saved calculators</button>' +
      '<div class="utility-menu" id="utilityMenu"></div>';
    var header = qs('.site-header') || qs('.header-row') || document.body;
    if (header) header.appendChild(panel);
    qs('#recentToolsToggle').addEventListener('click', function () { renderUtilityMenu('recent'); });
    qs('#favoriteToolsToggle').addEventListener('click', function () { renderUtilityMenu('favorites'); });
  }

  function trackedTools(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
  }
  function storeTools(key, items) { localStorage.setItem(key, JSON.stringify(items.slice(0, 12))); }
  function addRecentTool(tool) {
    if (!tool || !tool.slug) return;
    var list = trackedTools('cv_recent_tools');
    list = list.filter(function (entry) { return entry.slug !== tool.slug; });
    list.unshift(tool);
    storeTools('cv_recent_tools', list);
  }
  function toggleFavoriteTool(tool) {
    var list = trackedTools('cv_favorite_tools');
    if (!tool || !tool.slug) return;
    var existing = list.find(function (entry) { return entry.slug === tool.slug; });
    if (existing) list = list.filter(function (entry) { return entry.slug !== tool.slug; });
    else list.unshift(tool);
    storeTools('cv_favorite_tools', list);
    return !existing;
  }

  function renderUtilityMenu(type) {
    var box = qs('#utilityMenu');
    if (!box) return;
    var tools = type === 'favorites' ? trackedTools('cv_favorite_tools') : trackedTools('cv_recent_tools');
    if (!tools.length) {
      box.innerHTML = '<div class="empty-state">No ' + (type === 'favorites' ? 'favorite' : 'recent') + ' calculators yet.</div>';
      return;
    }
    box.innerHTML = tools.map(function (item) {
      return '<a href="' + item.url + '">' + item.name + '<small>' + (item.category || 'Calculator') + '</small></a>';
    }).join('');
  }

  function updateFavoriteButton(slug, name, url, button) {
    var list = trackedTools('cv_favorite_tools');
    var active = list.some(function (item) { return item.slug === slug; });
    if (!button) return active;
    button.classList.toggle('active', active);
    button.textContent = active ? 'Unsave calculator' : 'Save calculator';
    return active;
  }

  function decoratePage() {
    var pageType = inferPageType();
    document.body.dataset.pageType = pageType;
    var theme = getToolTheme(location.pathname.split('/').filter(Boolean).pop() || '', location.pathname);
    document.body.classList.add(theme.class);
    var title = qs('.section-head h1');
    if (title) {
      var badge = document.createElement('span');
      badge.className = 'page-icon';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = theme.icon;
      title.insertBefore(badge, title.firstChild);
      var label = document.createElement('span');
      label.className = 'page-badge';
      label.textContent = theme.label;
      title.appendChild(label);
    }
    createAssistantPanel();
  }

  function searchPageReady() {
    return location.pathname.toLowerCase().endsWith('/search.html');
  }

  fillCategoryJump();
  if (searchPageReady()) renderSearchResults();
  decoratePage();

  function factorial(n) {
    n = Math.floor(Number(n));
    if (!isFinite(n) || n < 0) return NaN;
    var r = 1;
    for (var i = 2; i <= n; i++) r *= i;
    return r;
  }

  var sciInput = qs('#sciExpression');
  var sciResult = qs('#sciResult');
  var sciHistory = qs('#sciHistory');
  var sciMode = 'deg';
  var history = JSON.parse(localStorage.getItem('cv_sci_history') || '[]');

  function refreshHistory() {
    if (!sciHistory) return;
    sciHistory.innerHTML = history.slice(0, 6).map(function (x) { return '<div>' + x + '</div>'; }).join('') || '<div>No history yet.</div>';
  }
  refreshHistory();

  function transformExpression(expr) {
    return expr
      .replace(/pi/g, String(Math.PI))
      .replace(/\be\b/g, String(Math.E))
      .replace(/sqrt\(/g, 'Math.sqrt(')
      .replace(/log\(/g, 'Math.log10(')
      .replace(/ln\(/g, 'Math.log(')
      .replace(/sin\(([^)]+)\)/g, function (_, a) { return 'Math.sin(' + (sciMode === 'deg' ? '(' + a + ')*Math.PI/180' : a) + ')'; })
      .replace(/cos\(([^)]+)\)/g, function (_, a) { return 'Math.cos(' + (sciMode === 'deg' ? '(' + a + ')*Math.PI/180' : a) + ')'; })
      .replace(/tan\(([^)]+)\)/g, function (_, a) { return 'Math.tan(' + (sciMode === 'deg' ? '(' + a + ')*Math.PI/180' : a) + ')'; })
      .replace(/(\d+)\!/g, function (_, a) { return 'factorial(' + a + ')'; })
      .replace(/\^/g, '**');
  }

  function evaluateSci() {
    if (!sciInput || !sciResult) return;
    try {
      var expr = transformExpression(sciInput.value || '0');
      var value = Function('factorial', 'return ' + expr)(factorial);
      sciResult.textContent = isFinite(value) ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 12 }) : 'Error';
      history.unshift((sciInput.value || '') + ' = ' + sciResult.textContent);
      history = history.slice(0, 12);
      localStorage.setItem('cv_sci_history', JSON.stringify(history));
      refreshHistory();
    } catch (e) {
      sciResult.textContent = 'Error';
    }
  }

  qsa('[data-sci]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!sciInput) return;
      sciInput.value += btn.getAttribute('data-sci');
      sciInput.focus();
    });
  });

  qsa('[data-sci-mode]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      sciMode = btn.getAttribute('data-sci-mode');
      qsa('[data-sci-mode]').forEach(function (x) { x.classList.remove('active'); });
      btn.classList.add('active');
    });
  });

  qsa('[data-sci-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var act = btn.getAttribute('data-sci-action');
      if (act === 'eval') evaluateSci();
      if (act === 'clear-history') {
        history = [];
        localStorage.setItem('cv_sci_history', '[]');
        refreshHistory();
      }
    });
  });

  if (sciInput) {
    sciInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        evaluateSci();
      }
    });
  }

  function fmt(n, p) {
    if (p === undefined) p = 2;
    var value = Number(n);
    if (!isFinite(value)) return '—';
    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: p });
  }

  function fmtDate(d) {
    return d instanceof Date && !isNaN(d) ? d.toISOString().slice(0, 10) : '—';
  }

  function readForm(form) {
    var obj = {};
    new FormData(form).forEach(function (value, key) { obj[key.replace(/-/g, '_')] = value; });
    return obj;
  }

  function setTable(table, rows) {
    table.querySelector('tbody').innerHTML = rows.map(function (row) {
      return '<tr><th>' + row[0] + '</th><td>' + row[1] + '</td></tr>';
    }).join('');
  }

  function drawBars(area, rows) {
    area.innerHTML = '';
    var nums = rows.map(function (r) { return Number(r[1]); }).filter(function (v) { return isFinite(v); });
    if (!nums.length) { area.textContent = 'Chart preview will appear here.'; return; }
    var max = Math.max.apply(null, nums) || 1;
    var wrap = document.createElement('div');
    wrap.style.display = 'grid';
    wrap.style.gap = '10px';
    rows.forEach(function (row) {
      var label = row[0], value = Number(row[1]);
      if (!isFinite(value)) return;
      var el = document.createElement('div');
      el.innerHTML = '<div style="display:flex;justify-content:space-between;font-size:.9rem;margin-bottom:4px"><span>' + label + '</span><strong>' + fmt(value) + '</strong></div><div style="height:10px;background:rgba(148,163,184,.18);border-radius:999px;overflow:hidden"><div style="width:' + Math.max(8, (Math.abs(value) / max) * 100) + '%;height:100%;background:linear-gradient(135deg,#2563eb,#0f766e)"></div></div>';
      wrap.appendChild(el);
    });
    area.appendChild(wrap);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {});
      return;
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  function exportTableCSV(table, filename) {
    var rows = Array.prototype.slice.call(table.querySelectorAll('tr')).map(function (tr) {
      return Array.prototype.slice.call(tr.children).map(function (td) {
        return '"' + (td.textContent || '').replace(/"/g, '""') + '"';
      }).join(',');
    });
    var blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function keys(obj) { return Object.keys(obj || {}); }
  function findKey(obj, arr) {
    return keys(obj).find(function (k) {
      return arr.some(function (x) { return k.indexOf(x) !== -1; });
    });
  }
  function num(obj, arr, fallback) {
    var k = findKey(obj, arr);
    var v = k ? Number(String(obj[k]).replace(/,/g, '')) : NaN;
    return isFinite(v) ? v : fallback;
  }
  function str(obj, arr, fallback) {
    var k = findKey(obj, arr);
    return k ? String(obj[k] || '') : fallback;
  }
  function dateVal(obj, arr, fallback) {
    var d = new Date(str(obj, arr, fallback));
    return isNaN(d) ? new Date(fallback) : d;
  }
  function numList(obj) {
    return keys(obj).map(function (k) { return Number(String(obj[k]).replace(/,/g, '')); }).filter(function (v) { return isFinite(v); });
  }
  function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function gcd(a, b) { a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b)); while (b) { var t = b; b = a % b; a = t; } return a || 0; }
  function primeFactors(n) {
    n = Math.abs(Math.round(n));
    var out = [], d = 2;
    while (n > 1) {
      while (n % d === 0) { out.push(d); n /= d; }
      d++;
      if (d * d > n && n > 1) { out.push(n); break; }
    }
    return out;
  }
  function median(arr) {
    if (!arr.length) return 0;
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }
  function mode(arr) {
    var map = {};
    arr.forEach(function (x) { map[x] = (map[x] || 0) + 1; });
    var best = null;
    Object.keys(map).forEach(function (k) {
      if (!best || map[k] > best.count) best = { key: k, count: map[k] };
    });
    return best ? best.key : 0;
  }
  function sampleVariance(arr) {
    if (arr.length < 2) return 0;
    var mean = arr.reduce(function (a, b) { return a + b; }, 0) / arr.length;
    return arr.reduce(function (s, x) { return s + Math.pow(x - mean, 2); }, 0) / (arr.length - 1);
  }
  function toRoman(num) {
    var map = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
    var out = '', n = Math.floor(num);
    map.forEach(function (pair) {
      while (n >= pair[0]) { out += pair[1]; n -= pair[0]; }
    });
    return out;
  }
  function fromRoman(s) {
    var map = {I:1,V:5,X:10,L:50,C:100,D:500,M:1000};
    var sum = 0, strR = String(s || '').toUpperCase();
    for (var i = 0; i < strR.length; i++) {
      var cur = map[strR[i]] || 0, next = map[strR[i + 1]] || 0;
      sum += cur < next ? -cur : cur;
    }
    return sum;
  }

  function normalizeFamily(engine, slug, path) {
    var e = String(engine || '').toLowerCase();
    if (/^(emi|loan|mortgage|sip|fd|rd|simpleinterest|compoundinterest|gst|tds|tax|roi|cagr|break-even|profit-margin|markup|discount|income-tax|hra|gratuity|pf-calculator|net-worth|budget|stock-returns|dividend-yield|p-e-ratio|gold|currency-converter|savings-goal|compound-interest|simple-interest|loan-calculator|fd-calculator|nps-calculator|mutual-fund-returns|ppf-calculator|nsc-calculator|rd-calculator|emi-calculator|sip-calculator)$/i.test(e)) return 'finance';
    if (/^(bmi|bmr|tdee|body-fat|ideal-weight|calorie|macro|water-intake|heart-rate-zones|pace|steps-to-km|waist-to-hip-ratio|waist-to-height|due-date|ovulation|conception|fertility|sleep|alcohol-units|smoking-cost|body-surface-area|creatinine-clearance|egfr|blood-volume|pediatric-dose)$/i.test(e)) return 'health';
    if (/^(percentage|fraction|lcm-gcd|prime-factorization|square-root|cube-root|power|logarithm|scientific-notation|average|median-mode|standard-deviation|variance|quadratic|linear-equation|determinant|factorial|combinations-permutations|fibonacci|number-base|roman|ratio|proportion|modulo|rounding|significant-figures|absolute-value|floor-ceiling)$/i.test(e)) return 'math';
    if (/^(area-of-circle|area-of-rectangle|area-of-triangle|area-of-trapezoid|area-of-parallelogram|area-of-ellipse|volume-of-cube|volume-of-sphere|volume-of-cylinder|volume-of-cone|volume-of-pyramid|surface-area|diagonal|pythagorean|distance-formula|slope|midpoint|angle-calculator|arc-length|sector-area|polygon-area)$/i.test(e)) return 'geometry';
    if (/^(velocity-calculator|acceleration|force|kinetic-energy|potential-energy|power-calculator|momentum|pressure|density|ohm-s-law|resistance|capacitance|frequency|wavelength|speed-of-sound|projectile-motion|gravitational-force|torque|work-calculator|efficiency|heat-transfer|thermal-expansion|buoyancy|refraction|doppler-effect)$/i.test(e)) return 'physics';
    if (/^(molecular-weight|molarity|molality|dilution|ph-calculator|poh-calculator|ideal-gas-law|boyle-s-law|charles-s-law|half-life|reaction-yield|buffer-ph|normality|osmolarity)$/i.test(e)) return 'chemistry';
    if (/^(concrete|brick|paint|flooring|tile|roof-area|staircase|beam-load|column-load|footing-size|retaining-wall|plaster|sand-cement|steel-weight|pipe-weight|earthwork|water-tank-volume|drainage|electrical-load|cable-size|lighting|ac-tonnage)$/i.test(e)) return 'construction';
    if (/^(length-converter|weight-converter|temperature-converter|volume-converter|area-converter|speed-converter|pressure-converter|energy-converter|power-converter|force-converter|torque-converter|time-converter|frequency-converter|data-storage-converter|angle-converter|fuel-efficiency|luminance|density-converter|flow-rate)$/i.test(e)) return 'converter';
    if (/^(age-calculator|days-between|date-difference|add-subtract-days|weekday-finder|week-number|leap-year|time-zone-converter|work-hours|overtime|retirement-date|unix-timestamp|julian-date)$/i.test(e)) return 'date';
    if (/^(fuel-cost|mileage|tire-size|speed-calculator|engine-horsepower|oil-change-interval|stopping-distance|towing-capacity|depreciation|parking-cost|ev-range|gear-ratio)$/i.test(e)) return 'automotive';
    if (/^(gpa|grade|cgpa|marks-required|study-hours|exam-score|scholarship|student-loan|attendance)$/i.test(e)) return 'education';
    if (/^(recipe-converter|cooking-measurement|macros-tracker|baking-ratio|yeast-calculator|coffee-ratio|tea-strength|sugar-substitute|alcohol-content-abv|food-expiry-estimator)$/i.test(e)) return 'food';
    return '';
  }

  function detectCalculatorType(slug, path) {
    var s = String(slug || '').toLowerCase();
    var p = String(path || '').toLowerCase();
    var text = s + ' ' + p;
    if (/emi|loan|mortgage|sip|fd|rd|ppf|nsc|pf|hra|gratuity|tax|gst|roi|cagr|break-even|profit|markup|discount|gold|currency|salary|budget|stock|dividend|net-worth|salary|retirement|inflation|income-tax/.test(text)) return 'finance';
    if (/bmi|bmr|tdee|calorie|body-fat|ideal-weight|water|heart-rate|pace|steps|waist|due-date|ovulation|sleep|alcohol|smoking|creatinine|egfr|blood-volume|pediatric|fertility/.test(text)) return 'health';
    if (/percentage|fraction|lcm|gcd|prime|square-root|cube-root|power|logarithm|scientific|average|median|variance|quadratic|linear|determinant|factorial|combination|permutation|fibonacci|roman|ratio|proportion|modulo|rounding|significant|absolute|floor|ceiling|standard-deviation/.test(text)) return 'math';
    if (/area-of|volume-of|surface-area|perimeter|diagonal|pythagorean|distance-formula|slope|midpoint|angle|arc-length|sector-area|polygon|circumference|hypotenuse/.test(text)) return 'geometry';
    if (/velocity|acceleration|force|kinetic|potential|power|momentum|pressure|density|ohm|capacitance|frequency|wavelength|sound|projectile|gravity|torque|work|efficiency|heat|thermal|buoyancy|refraction|doppler/.test(text)) return 'physics';
    if (/molecular|molar|dilution|ph|poh|gas-law|half-life|reaction|buffer|normality|osmolarity|titration/.test(text)) return 'chemistry';
    if (/concrete|brick|paint|flooring|tile|roof|stair|beam|column|footing|plaster|cement|steel|pipe|earthwork|tank|drainage|electrical|cable|lighting|ac-tonnage/.test(text)) return 'construction';
    if (/converter|fuel-efficiency|density|flow-rate|luminance|temperature|length|weight|area|volume|speed|pressure|energy|power|force|torque|time|frequency|data-storage|angle/.test(text)) return 'converter';
    if (/age|days-between|date|weekday|week-number|leap|timezone|work-hours|retirement-date|unix|julian/.test(text)) return 'date';
    if (/fuel-cost|mileage|tire|speed|engine|oil|stopping|towing|depreciation|parking|ev-range|gear/.test(text)) return 'automotive';
    if (/gpa|grade|cgpa|marks|study|exam|scholarship|student|attendance/.test(text)) return 'education';
    if (/recipe|cooking|macro|baking|yeast|coffee|tea|sugar|alcohol|expiry/.test(text)) return 'food';
    return 'generic';
  }

  function inferFamily(slug, path) {
    var s = slug || '';
    var p = (path || '').toLowerCase();
    if (/emi|loan|mortgage|roi|break-even|profit-margin|markup|discount|gst|tax|hra|gratuity|pf|nps|cagr|stock|dividend|net-worth|budget|savings-goal|currency-converter|gold/.test(s) || /finance|banking|investment|trading|insurance|accounting/.test(p)) return 'finance';
    if (/bmi|bmr|tdee|body-fat|ideal-weight|calorie|macro|water-intake|heart-rate|pace|steps-to-km|waist|due-date|ovulation|conception|sleep|alcohol-units|smoking-cost|body-surface-area|creatinine|egfr|blood-volume|pediatric-dose|fertility/.test(s)) return 'health';
    if (/percentage|fraction|lcm|gcd|prime|square-root|cube-root|power|logarithm|scientific-notation|average|median|standard-deviation|variance|quadratic|linear-equation|determinant|factorial|combinations|permutations|fibonacci|number-base|roman|ratio|proportion|modulo|rounding|significant-figures|absolute-value|floor-ceiling/.test(s)) return 'math';
    if (/area-of|volume-of|surface-area|perimeter|diagonal|pythagorean|distance-formula|slope|midpoint|angle-calculator|arc-length|sector-area|circumference|hypotenuse|polygon-area|3d-shape-volume/.test(s)) return 'geometry';
    if (/velocity|acceleration|force|kinetic-energy|potential-energy|power-calculator|momentum|pressure$|density$|ohm-s-law|resistance$|capacitance|frequency$|wavelength|speed-of-sound|projectile-motion|gravitational-force|torque$|work-calculator|efficiency$|heat-transfer|thermal-expansion|buoyancy|refraction|doppler-effect/.test(s)) return 'physics';
    if (/molecular-weight|molar-mass|molarity|molality|dilution|ph-calculator|poh-calculator|empirical-formula|ideal-gas-law|boyle-s-law|charles-s-law|stoichiometry|percent-composition|half-life|reaction-yield|normality|buffer-ph|osmolarity|concentration-converter/.test(s)) return 'chemistry';
    if (/concrete|brick|paint|flooring|tile|roof-area|staircase|beam-load|column-load|footing-size|plaster|sand-cement|steel-weight|pipe-weight|earthwork|retaining-wall|water-tank-volume|drainage|electrical-load|cable-size|lighting|ac-tonnage/.test(s)) return 'construction';
    if (/converter|fuel-efficiency|data-storage|cooking-measurements|cups-to-ml|tablespoon-converter/.test(s)) return 'converter';
    if (/age-calculator|days-between|date-difference|add-subtract-days|weekday-finder|week-number|leap-year|time-zone-converter|work-hours|overtime|countdown|birthday|retirement-date|deadline|unix-timestamp|julian-date/.test(s)) return 'date';
    if (/fuel-cost|mileage|tire-size|speed-calculator|engine-horsepower|oil-change-interval|stopping-distance|towing-capacity|depreciation|parking-cost|road-trip-cost|ev-range|gear-ratio/.test(s)) return 'automotive';
    if (/gpa|grade|cgpa|marks-required|study-hours|exam-score|scholarship|student-loan|attendance|percentage-to-grade/.test(s)) return 'education';
    if (/recipe-converter|cooking-measurement|macros-tracker|baking-ratio|yeast-calculator|coffee-ratio|tea-strength|sugar-substitute|alcohol-content-abv|food-expiry-estimator/.test(s)) return 'food';
    return 'generic';
  }

  function calcFinance(slug, data) {
    var amount = num(data, ['amount', 'value', 'principal', 'loan', 'investment', 'price', 'cost', 'income'], 10000);
    var rate = num(data, ['rate', 'interest', 'return', 'tax', 'gst', 'discount', 'markup'], 10);
    var time = num(data, ['time', 'period', 'duration', 'tenure', 'years', 'months'], 5);

    if (/emi|loan|mortgage/.test(slug)) {
      var P = num(data, ['loan_amount', 'amount', 'principal', 'loan'], 1000000);
      var annual = num(data, ['interest_rate', 'rate'], 9);
      var tenure = num(data, ['tenure', 'duration', 'time_period', 'years'], 20);
      var explicitMonths = num(data, ['months', 'term_months', 'tenure_months'], NaN);
      var months = isFinite(explicitMonths) && explicitMonths > 0 ? Math.round(explicitMonths) : Math.round(tenure <= 30 ? tenure * 12 : tenure);
      months = months || 12;
      var feePct = num(data, ['processing_fee', 'fee'], 0);
      var r = annual / 12 / 100;
      var emi = r ? (P * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1) : P / months;
      var total = emi * months;
      var interest = total - P;
      var fee = P * feePct / 100;
      return { primary: 'Monthly payment: ' + fmt(emi), sub: 'Loan EMI and repayment estimate.', rows: [['Principal', P], ['Monthly EMI', emi], ['Interest cost', interest], ['Processing fee', fee], ['Total repayment', total + fee]] };
    }

    if (/sip/.test(slug)) {
      var sip = num(data, ['monthly_investment', 'sip', 'investment', 'amount'], 10000);
      var annualS = num(data, ['expected_annual_return', 'rate', 'return'], 12);
      var yearsS = num(data, ['investment_duration', 'duration', 'time'], 15);
      var step = num(data, ['step_up'], 0);
      var i = annualS / 12 / 100;
      var invested = 0, future = 0;
      for (var y = 0; y < yearsS; y++) {
        var monthly = sip * Math.pow(1 + step / 100, y);
        for (var m = 0; m < 12; m++) {
          var remaining = yearsS * 12 - (y * 12 + m);
          invested += monthly;
          future += monthly * Math.pow(1 + i, remaining);
        }
      }
      return { primary: 'Estimated future value: ' + fmt(future), sub: 'Projected SIP corpus.', rows: [['Monthly SIP', sip], ['Total invested', invested], ['Estimated value', future], ['Estimated gain', future - invested]] };
    }

    if (/fd|ppf|nsc|pf-calculator|nps-calculator|mutual-fund-returns|savings-goal|compound-interest/.test(slug)) {
      var maturity = amount * Math.pow(1 + rate / 100 / 4, 4 * time);
      return { primary: 'Future value: ' + fmt(maturity), sub: 'Compound growth estimate.', rows: [['Principal', amount], ['Rate %', rate], ['Years', time], ['Interest earned', maturity - amount], ['Maturity amount', maturity]] };
    }

    if (/rd-calculator/.test(slug)) {
      var monthlyD = num(data, ['monthly', 'amount', 'deposit'], 5000);
      var annualD = num(data, ['rate'], 7);
      var yearsD = num(data, ['time', 'period', 'duration'], 5);
      var ir = annualD / 12 / 100;
      var n = yearsD * 12;
      var mat = monthlyD * (((Math.pow(1 + ir, n) - 1) / ir) * (1 + ir));
      return { primary: 'RD maturity value: ' + fmt(mat), sub: 'Recurring deposit estimate.', rows: [['Monthly deposit', monthlyD], ['Months', n], ['Rate %', annualD], ['Maturity value', mat]] };
    }

    if (/simple-interest/.test(slug)) {
      var si = amount * rate * time / 100;
      return { primary: 'Simple interest: ' + fmt(si), sub: 'Principal + simple interest estimate.', rows: [['Principal', amount], ['Rate %', rate], ['Time', time], ['Interest', si], ['Total', amount + si]] };
    }

    if (/roi/.test(slug)) {
      var invest = num(data, ['investment', 'cost', 'amount'], 100000);
      var finalValue = num(data, ['final', 'return', 'value', 'revenue'], 120000);
      var roi = ((finalValue - invest) / invest) * 100;
      return { primary: 'ROI: ' + fmt(roi) + '%', sub: 'Return on investment.', rows: [['Investment', invest], ['Final value', finalValue], ['Profit', finalValue - invest], ['ROI %', roi]] };
    }

    if (/cagr/.test(slug)) {
      var start = num(data, ['initial', 'start'], 100000);
      var end = num(data, ['final', 'end'], 180000);
      var years = num(data, ['years', 'time', 'period'], 5);
      var cagr = (Math.pow(end / start, 1 / years) - 1) * 100;
      return { primary: 'CAGR: ' + fmt(cagr) + '%', sub: 'Compounded annual growth rate.', rows: [['Start value', start], ['End value', end], ['Years', years], ['CAGR %', cagr]] };
    }

    if (/break-even/.test(slug)) {
      var fixed = num(data, ['fixed'], 50000);
      var sell = num(data, ['selling', 'price'], 100);
      var variable = num(data, ['variable'], 60);
      var units = fixed / Math.max(1, sell - variable);
      return { primary: 'Break-even units: ' + fmt(units), sub: 'Units needed to cover fixed cost.', rows: [['Fixed costs', fixed], ['Selling price / unit', sell], ['Variable cost / unit', variable], ['Break-even units', units]] };
    }

    if (/profit-margin/.test(slug)) {
      var revenue = num(data, ['revenue', 'selling', 'sale'], 150000);
      var cost = num(data, ['cost', 'expense'], 100000);
      var profit = revenue - cost;
      var margin = revenue ? (profit / revenue) * 100 : 0;
      return { primary: 'Profit margin: ' + fmt(margin) + '%', sub: 'Net profit as a percentage of revenue.', rows: [['Revenue', revenue], ['Cost', cost], ['Profit', profit], ['Margin %', margin]] };
    }

    if (/markup/.test(slug)) {
      var baseCost = num(data, ['cost'], 100);
      var markup = num(data, ['markup', 'rate'], 25);
      var salePrice = baseCost * (1 + markup / 100);
      return { primary: 'Selling price: ' + fmt(salePrice), sub: 'Cost plus markup.', rows: [['Cost', baseCost], ['Markup %', markup], ['Selling price', salePrice]] };
    }

    if (/discount/.test(slug)) {
      var price = num(data, ['price', 'mrp', 'amount'], 1000);
      var disc = num(data, ['discount', 'rate'], 10);
      var save = price * disc / 100;
      return { primary: 'Final price: ' + fmt(price - save), sub: 'Discounted amount and savings.', rows: [['Original price', price], ['Discount %', disc], ['Savings', save], ['Final price', price - save]] };
    }

    if (/gst|tds|tax/.test(slug) && !/income-tax/.test(slug)) {
      var base = num(data, ['base', 'amount', 'value', 'price'], 1000);
      var tax = num(data, ['rate', 'gst', 'tax'], 18);
      var taxAmt = base * tax / 100;
      return { primary: 'Total with tax: ' + fmt(base + taxAmt), sub: 'Base, tax rate, and final total.', rows: [['Base amount', base], ['Tax rate %', tax], ['Tax amount', taxAmt], ['Total', base + taxAmt]] };
    }

    if (/income-tax/.test(slug)) {
      var income = num(data, ['income', 'salary', 'taxable'], 1200000);
      var slabs = [[400000,0],[400000,0.05],[400000,0.10],[400000,0.15],[400000,0.20],[400000,0.25],[1e18,0.30]];
      var remaining = income, totalTax = 0;
      slabs.forEach(function (slab) {
        if (remaining <= 0) return;
        var taxable = Math.min(remaining, slab[0]);
        totalTax += taxable * slab[1];
        remaining -= taxable;
      });
      return { primary: 'Estimated tax: ' + fmt(totalTax), sub: 'Illustrative slab-based estimate.', rows: [['Taxable income', income], ['Estimated tax', totalTax], ['Effective rate %', income ? totalTax / income * 100 : 0], ['Post-tax income', income - totalTax]] };
    }

    if (/hra/.test(slug)) {
      var basic = num(data, ['basic'], 50000);
      var hra = num(data, ['hra'], 20000);
      var rent = num(data, ['rent'], 25000);
      var exempt = Math.min(hra, Math.max(0, rent - basic * 0.1), basic * 0.5);
      return { primary: 'HRA exemption: ' + fmt(exempt), sub: 'Common salary/rent comparison.', rows: [['Basic salary', basic], ['HRA received', hra], ['Rent paid', rent], ['Exempt HRA', exempt]] };
    }

    if (/gratuity/.test(slug)) {
      var salary = num(data, ['salary', 'basic'], 50000);
      var serviceYears = num(data, ['years', 'service'], 10);
      var gratuity = salary * 15 / 26 * serviceYears;
      return { primary: 'Estimated gratuity: ' + fmt(gratuity), sub: 'Approximate gratuity formula.', rows: [['Monthly basic', salary], ['Years of service', serviceYears], ['Gratuity', gratuity]] };
    }

    if (/pf-calculator/.test(slug)) {
      var wage = num(data, ['salary', 'basic'], 40000);
      return { primary: 'Monthly PF total: ' + fmt(wage * 0.24), sub: 'Employee + employer contribution estimate.', rows: [['Salary base', wage], ['Employee PF', wage * 0.12], ['Employer PF', wage * 0.12], ['Monthly total', wage * 0.24]] };
    }

    if (/net-worth/.test(slug)) {
      var assets = num(data, ['assets', 'cash', 'investment', 'value'], 500000);
      var liabilities = num(data, ['liabilities', 'loan', 'debt'], 200000);
      return { primary: 'Net worth: ' + fmt(assets - liabilities), sub: 'Assets minus liabilities.', rows: [['Assets', assets], ['Liabilities', liabilities], ['Net worth', assets - liabilities]] };
    }

    if (/budget/.test(slug)) {
      var incomeB = num(data, ['income', 'salary'], 100000);
      var expenseB = num(data, ['expense', 'cost'], 70000);
      return { primary: 'Monthly savings: ' + fmt(incomeB - expenseB), sub: 'Budget balance.', rows: [['Income', incomeB], ['Expenses', expenseB], ['Savings', incomeB - expenseB]] };
    }

    if (/stock-returns/.test(slug)) {
      var buy = num(data, ['buy', 'purchase', 'start'], 100);
      var sellS = num(data, ['sell', 'end', 'current'], 135);
      var dividend = num(data, ['dividend'], 2);
      var ret = ((sellS + dividend - buy) / buy) * 100;
      return { primary: 'Total return: ' + fmt(ret) + '%', sub: 'Capital gain plus dividend.', rows: [['Buy price', buy], ['Sell price', sellS], ['Dividend', dividend], ['Return %', ret]] };
    }

    if (/dividend-yield/.test(slug)) {
      var div = num(data, ['dividend'], 6);
      var share = num(data, ['price', 'share'], 120);
      return { primary: 'Dividend yield: ' + fmt((div / share) * 100) + '%', sub: 'Annual dividend / share price.', rows: [['Annual dividend', div], ['Share price', share], ['Yield %', (div / share) * 100]] };
    }

    if (/p-e-ratio/.test(slug)) {
      var pePrice = num(data, ['price'], 240);
      var eps = num(data, ['eps', 'earnings'], 12);
      return { primary: 'P/E ratio: ' + fmt(pePrice / eps), sub: 'Share price / earnings per share.', rows: [['Share price', pePrice], ['EPS', eps], ['P/E', pePrice / eps]] };
    }

    if (/gold/.test(slug)) {
      var grams = num(data, ['weight', 'gram'], 10);
      var rateGram = num(data, ['rate', 'price'], 7000);
      var purity = num(data, ['purity'], 24);
      var goldValue = grams * rateGram * (purity / 24);
      return { primary: 'Gold value: ' + fmt(goldValue), sub: 'Weight × rate × purity adjustment.', rows: [['Weight (g)', grams], ['Rate / g', rateGram], ['Purity', purity], ['Estimated value', goldValue]] };
    }

    if (/currency-converter/.test(slug)) {
      var amt = num(data, ['amount', 'value'], 100);
      var exRate = num(data, ['exchange_rate', 'rate'], 83);
      return { primary: 'Converted value: ' + fmt(amt * exRate), sub: 'No-API mode: uses the exchange rate you provide.', rows: [['Amount', amt], ['Exchange rate', exRate], ['Converted amount', amt * exRate]] };
    }

    return { primary: 'Finance result: ' + fmt(amount * (1 + rate / 100 * time)), sub: 'Generic finance estimate.', rows: [['Amount', amount], ['Rate %', rate], ['Time', time]] };
  }

  function calcHealth(slug, data) {
    var age = num(data, ['age'], 30);
    var weight = num(data, ['weight'], 70);
    var heightCm = num(data, ['height'], 175);
    var heightM = heightCm / 100;
    var gender = str(data, ['gender', 'sex'], 'male').toLowerCase();

    if (/bmi/.test(slug)) {
      var bmi = weight / (heightM * heightM);
      var band = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy range' : bmi < 30 ? 'Overweight' : 'Obesity';
      return { primary: 'BMI: ' + fmt(bmi), sub: 'Interpretation: ' + band + '.', rows: [['Weight (kg)', weight], ['Height (cm)', heightCm], ['BMI', bmi]] };
    }
    if (/body-fat/.test(slug)) {
      var bmi2 = weight / (heightM * heightM);
      var bodyFat = 1.2 * bmi2 + 0.23 * age - 16.2;
      return { primary: 'Estimated body fat: ' + fmt(bodyFat) + '%', sub: 'BMI and age based estimate.', rows: [['BMI', bmi2], ['Age', age], ['Body fat %', bodyFat]] };
    }
    if (/bmr/.test(slug)) {
      var bmrBase = 10 * weight + 6.25 * heightCm - 5 * age;
      var bmr = bmrBase + (gender === 'female' ? -161 : 5);
      return { primary: 'BMR: ' + fmt(bmr) + ' kcal/day', sub: 'Estimated basal metabolic rate.', rows: [['Age', age], ['Weight', weight], ['Height', heightCm], ['Gender', gender], ['BMR', bmr]] };
    }
    if (/tdee|calorie/.test(slug)) {
      var activity = num(data, ['activity'], 1.55);
      var baseBmr = 10 * weight + 6.25 * heightCm - 5 * age + (gender === 'female' ? -161 : 5);
      var calories = baseBmr * activity;
      return { primary: 'Maintenance calories: ' + fmt(calories), sub: 'Daily energy estimate from BMR × activity.', rows: [['BMR', baseBmr], ['Activity factor', activity], ['Calories/day', calories]] };
    }
    if (/macro/.test(slug)) {
      var cal = num(data, ['calories'], 2200);
      return { primary: 'Protein: ' + fmt(cal * 0.3 / 4) + ' g/day', sub: 'Sample 30/40/30 macro split.', rows: [['Calories', cal], ['Protein (g)', cal * 0.3 / 4], ['Carbs (g)', cal * 0.4 / 4], ['Fat (g)', cal * 0.3 / 9]] };
    }
    if (/ideal-weight/.test(slug)) {
      var ideal = 50 + 0.91 * Math.max(0, heightCm - 152.4);
      return { primary: 'Ideal weight: ' + fmt(ideal) + ' kg', sub: 'Common height-based estimate.', rows: [['Height (cm)', heightCm], ['Ideal weight', ideal]] };
    }
    if (/water-intake/.test(slug)) {
      var liters = weight * 0.033;
      return { primary: 'Water target: ' + fmt(liters) + ' L/day', sub: 'General hydration estimate.', rows: [['Weight (kg)', weight], ['Water (L/day)', liters]] };
    }
    if (/heart-rate-zones/.test(slug)) {
      var maxHr = 220 - age;
      return { primary: 'Max heart rate: ' + fmt(maxHr, 0) + ' bpm', sub: 'Training zones based on age.', rows: [['50% zone', maxHr * 0.5], ['60% zone', maxHr * 0.6], ['70% zone', maxHr * 0.7], ['80% zone', maxHr * 0.8], ['90% zone', maxHr * 0.9]] };
    }
    if (/pace/.test(slug)) {
      var distance = num(data, ['distance'], 5);
      var minutes = num(data, ['time', 'minutes'], 30);
      return { primary: 'Pace: ' + fmt(minutes / distance) + ' min/km', sub: 'Running pace from time and distance.', rows: [['Distance (km)', distance], ['Time (min)', minutes], ['Pace (min/km)', minutes / distance], ['Speed (km/h)', distance / (minutes / 60)]] };
    }
    if (/steps-to-km/.test(slug)) {
      var steps = num(data, ['steps'], 10000);
      return { primary: 'Distance: ' + fmt(steps * 0.000762) + ' km', sub: 'Approximate steps to distance conversion.', rows: [['Steps', steps], ['Distance (km)', steps * 0.000762]] };
    }
    if (/waist-to-hip-ratio/.test(slug)) {
      var waist = num(data, ['waist'], 80), hip = num(data, ['hip'], 95);
      return { primary: 'WHR: ' + fmt(waist / hip), sub: 'Waist / hip circumference.', rows: [['Waist', waist], ['Hip', hip], ['Ratio', waist / hip]] };
    }
    if (/waist-to-height/.test(slug)) {
      var waist2 = num(data, ['waist'], 80);
      return { primary: 'Waist-to-height: ' + fmt(waist2 / heightCm), sub: 'Waist / height.', rows: [['Waist', waist2], ['Height', heightCm], ['Ratio', waist2 / heightCm]] };
    }
    if (/due-date/.test(slug)) {
      var lastPeriod = dateVal(data, ['period', 'lmp', 'date'], '2026-01-01');
      var due = addDays(lastPeriod, 280);
      return { primary: 'Estimated due date: ' + fmtDate(due), sub: 'Based on Naegele’s rule.', rows: [['Last period', fmtDate(lastPeriod)], ['Estimated due date', fmtDate(due)]] };
    }
    if (/ovulation|conception|fertility/.test(slug)) {
      var lmp = dateVal(data, ['period', 'lmp', 'date'], '2026-01-01');
      var cycle = num(data, ['cycle'], 28);
      var ovu = addDays(lmp, cycle - 14);
      return { primary: 'Estimated ovulation: ' + fmtDate(ovu), sub: 'Approximate fertile window estimate.', rows: [['Last period', fmtDate(lmp)], ['Cycle length', cycle], ['Fertile start', fmtDate(addDays(ovu, -5))], ['Fertile end', fmtDate(addDays(ovu, 1))]] };
    }
    if (/sleep/.test(slug)) {
      var wake = dateVal(data, ['wake'], '2026-06-06T07:00');
      var bed = new Date(wake.getTime() - ((90 * 5 + 15) * 60000));
      return { primary: 'Suggested bedtime: ' + bed.toTimeString().slice(0, 5), sub: 'Five 90-minute cycles plus sleep buffer.', rows: [['Wake-up time', wake.toTimeString().slice(0, 5)], ['Suggested bedtime', bed.toTimeString().slice(0, 5)]] };
    }
    if (/alcohol-units/.test(slug)) {
      var volumeMl = num(data, ['volume'], 330), abv = num(data, ['abv', 'alcohol'], 5);
      return { primary: 'Alcohol units: ' + fmt(volumeMl * abv / 1000), sub: 'Volume × ABV conversion.', rows: [['Volume (ml)', volumeMl], ['ABV %', abv], ['Units', volumeMl * abv / 1000]] };
    }
    if (/smoking-cost/.test(slug)) {
      var packs = num(data, ['packs', 'cigarettes'], 1), packCost = num(data, ['cost', 'price'], 300);
      return { primary: 'Annual smoking cost: ' + fmt(packs * packCost * 365), sub: 'Daily spend projected across one year.', rows: [['Daily packs', packs], ['Cost per pack', packCost], ['Annual cost', packs * packCost * 365]] };
    }
    if (/body-surface-area/.test(slug)) {
      var bsa = Math.sqrt(heightCm * weight / 3600);
      return { primary: 'BSA: ' + fmt(bsa) + ' m²', sub: 'Mosteller formula.', rows: [['Height (cm)', heightCm], ['Weight (kg)', weight], ['BSA', bsa]] };
    }
    if (/creatinine-clearance/.test(slug)) {
      var cr = num(data, ['creatinine'], 1);
      var crcl = ((140 - age) * weight) / (72 * cr);
      return { primary: 'Creatinine clearance: ' + fmt(crcl) + ' mL/min', sub: 'Cockcroft-Gault style estimate.', rows: [['Age', age], ['Weight', weight], ['Serum creatinine', cr], ['CrCl', crcl]] };
    }
    if (/egfr/.test(slug)) {
      var scr = num(data, ['creatinine'], 1);
      var egfr = 141 * Math.pow(Math.min(scr / 0.9, 1), -0.411) * Math.pow(Math.max(scr / 0.9, 1), -1.209) * Math.pow(0.993, age);
      return { primary: 'eGFR: ' + fmt(egfr) + ' mL/min/1.73m²', sub: 'Simplified estimate.', rows: [['Age', age], ['Creatinine', scr], ['eGFR', egfr]] };
    }
    if (/blood-volume/.test(slug)) {
      return { primary: 'Blood volume: ' + fmt(weight * 70) + ' mL', sub: 'General body-weight estimate.', rows: [['Weight', weight], ['Blood volume (mL)', weight * 70]] };
    }
    if (/pediatric-dose/.test(slug)) {
      var mgPerKg = num(data, ['mg_per_kg', 'dose'], 10);
      return { primary: 'Dose: ' + fmt(mgPerKg * weight) + ' mg', sub: 'Weight-based pediatric dose estimate.', rows: [['Weight', weight], ['Dose per kg', mgPerKg], ['Total dose', mgPerKg * weight]] };
    }

    return { primary: 'Health result: ' + fmt(weight), sub: 'Generic health fallback.', rows: [['Age', age], ['Weight', weight], ['Height', heightCm]] };
  }

  function calcMath(slug, data) {
    var list = numList(data);
    var a = list.length > 0 ? list[0] : 12;
    var b = list.length > 1 ? list[1] : 18;
    var c = list.length > 2 ? list[2] : 6;

    if (/percentage/.test(slug)) return { primary: fmt((a / (b || 1)) * 100) + '%', sub: 'Part ÷ whole × 100.', rows: [['Part', a], ['Whole', b], ['Percentage', (a / (b || 1)) * 100]] };
    if (/fraction/.test(slug)) {
      var d1 = b || 1, n2 = c, d2 = list.length > 3 ? list[3] : 1;
      var nume = a * d2 + n2 * d1, deno = d1 * d2, g = gcd(nume, deno) || 1;
      return { primary: (nume / g) + '/' + (deno / g), sub: 'Default operation: fraction addition.', rows: [['Fraction 1', a + '/' + d1], ['Fraction 2', n2 + '/' + d2], ['Result', (nume / g) + '/' + (deno / g)]] };
    }
    if (/lcm-gcd/.test(slug)) return { primary: 'GCD: ' + gcd(a, b) + ', LCM: ' + fmt(Math.abs(a * b) / (gcd(a, b) || 1), 0), sub: 'GCD and LCM.', rows: [['Number 1', a], ['Number 2', b], ['GCD', gcd(a, b)], ['LCM', Math.abs(a * b) / (gcd(a, b) || 1)]] };
    if (/prime-factorization/.test(slug)) { var pf = primeFactors(a); return { primary: pf.join(' × ') || 'Prime', sub: 'Prime factorization.', rows: [['Number', a], ['Prime factors', pf.join(' × ') || a]] }; }
    if (/square-root/.test(slug)) return { primary: '√' + a + ' = ' + fmt(Math.sqrt(a)), sub: 'Square root.', rows: [['Input', a], ['Square root', Math.sqrt(a)]] };
    if (/cube-root/.test(slug)) return { primary: '∛' + a + ' = ' + fmt(Math.cbrt(a)), sub: 'Cube root.', rows: [['Input', a], ['Cube root', Math.cbrt(a)]] };
    if (/power/.test(slug)) return { primary: fmt(Math.pow(a, b)), sub: 'a^b power result.', rows: [['Base', a], ['Exponent', b], ['Result', Math.pow(a, b)]] };
    if (/logarithm/.test(slug)) return { primary: 'log base ' + (b || 10) + ': ' + fmt(Math.log(a) / Math.log(b || 10)), sub: 'Logarithm result.', rows: [['Value', a], ['Base', b || 10], ['Result', Math.log(a) / Math.log(b || 10)]] };
    if (/scientific-notation/.test(slug)) return { primary: Number(a).toExponential(4), sub: 'Scientific notation output.', rows: [['Value', a], ['Scientific notation', Number(a).toExponential(4)]] };
    if (/average/.test(slug)) { var mean = list.reduce(function (x, y) { return x + y; }, 0) / Math.max(1, list.length); return { primary: 'Average: ' + fmt(mean), sub: 'Arithmetic mean.', rows: [['Count', list.length], ['Average', mean]] }; }
    if (/median-mode/.test(slug)) return { primary: 'Median: ' + fmt(median(list)), sub: 'Mode: ' + mode(list), rows: [['Median', median(list)], ['Mode', mode(list)]] };
    if (/standard-deviation/.test(slug)) { var sd = Math.sqrt(sampleVariance(list)); return { primary: 'Std. deviation: ' + fmt(sd), sub: 'Sample standard deviation.', rows: [['Variance', sampleVariance(list)], ['Std. deviation', sd]] }; }
    if (/variance/.test(slug)) return { primary: 'Variance: ' + fmt(sampleVariance(list)), sub: 'Sample variance.', rows: [['Variance', sampleVariance(list)]] };
    if (/quadratic/.test(slug)) { var disc = b * b - 4 * a * c; return { primary: disc >= 0 ? 'Roots: ' + fmt((-b + Math.sqrt(disc)) / (2 * a)) + ', ' + fmt((-b - Math.sqrt(disc)) / (2 * a)) : 'Complex roots', sub: 'Quadratic equation solution.', rows: [['a', a], ['b', b], ['c', c], ['Discriminant', disc]] }; }
    if (/linear-equation/.test(slug)) return { primary: 'x = ' + fmt((c - b) / (a || 1)), sub: 'Solves ax + b = c.', rows: [['a', a], ['b', b], ['c', c], ['x', (c - b) / (a || 1)]] };
    if (/determinant/.test(slug)) { var d2 = list.length > 3 ? list[3] : 4; var det = a * d2 - b * c; return { primary: 'Determinant: ' + fmt(det), sub: '2×2 determinant.', rows: [['a', a], ['b', b], ['c', c], ['d', d2], ['Determinant', det]] }; }
    if (/factorial/.test(slug)) return { primary: a + '! = ' + fmt(factorial(a), 0), sub: 'Factorial result.', rows: [['n', a], ['Factorial', factorial(a)]] };
    if (/combinations-permutations/.test(slug)) { var comb = factorial(a) / (factorial(b) * factorial(a - b)); var perm = factorial(a) / factorial(a - b); return { primary: 'nCr: ' + fmt(comb, 0), sub: 'nPr: ' + fmt(perm, 0), rows: [['n', a], ['r', b], ['nCr', comb], ['nPr', perm]] }; }
    if (/fibonacci/.test(slug)) { var x = 0, y2 = 1; for (var i2 = 0; i2 < a; i2++) { var temp = x + y2; x = y2; y2 = temp; } return { primary: 'Fib(' + a + ') = ' + fmt(x, 0), sub: 'Nth Fibonacci number.', rows: [['n', a], ['Value', x]] }; }
    if (/number-base/.test(slug)) { var input = str(data, ['value', 'number'], String(a)); var base = num(data, ['base', 'from'], 10); var nbase = parseInt(input, base); return { primary: 'Binary: ' + nbase.toString(2), sub: 'Hex: ' + nbase.toString(16).toUpperCase(), rows: [['Decimal', nbase], ['Binary', nbase.toString(2)], ['Octal', nbase.toString(8)], ['Hex', nbase.toString(16).toUpperCase()]] }; }
    if (/roman/.test(slug)) { var t = str(data, ['roman', 'value'], '42'); var numv = Number(t); if (isFinite(numv)) return { primary: toRoman(numv), sub: 'Roman numeral output.', rows: [['Number', numv], ['Roman', toRoman(numv)]] }; return { primary: String(fromRoman(t)), sub: 'Roman numeral parsed to number.', rows: [['Roman', t], ['Number', fromRoman(t)]] }; }
    if (/ratio/.test(slug)) { var rg = gcd(a, b) || 1; return { primary: (a / rg) + ':' + (b / rg), sub: 'Reduced ratio.', rows: [['Value 1', a], ['Value 2', b], ['Ratio', (a / rg) + ':' + (b / rg)]] }; }
    if (/proportion/.test(slug)) { var x2 = c * b / (a || 1); return { primary: 'x = ' + fmt(x2), sub: 'Solves a:b = c:x.', rows: [['a', a], ['b', b], ['c', c], ['x', x2]] }; }
    if (/modulo/.test(slug)) return { primary: fmt(a % (b || 1), 0), sub: 'Modulo remainder.', rows: [['a', a], ['b', b], ['a mod b', a % (b || 1)]] };
    if (/rounding/.test(slug)) return { primary: 'Rounded: ' + fmt(Math.round(a), 0), sub: 'Rounded to nearest integer.', rows: [['Input', a], ['Floor', Math.floor(a)], ['Ceil', Math.ceil(a)], ['Round', Math.round(a)]] };
    if (/significant-figures/.test(slug)) { var sig = b || 3; return { primary: String(Number(a).toPrecision(sig)), sub: 'Rounded to significant figures.', rows: [['Value', a], ['Sig figs', sig], ['Result', Number(a).toPrecision(sig)]] }; }
    if (/absolute-value/.test(slug)) return { primary: fmt(Math.abs(a)), sub: 'Absolute value.', rows: [['Input', a], ['Absolute value', Math.abs(a)]] };
    if (/floor-ceiling/.test(slug)) return { primary: 'Floor ' + Math.floor(a) + ', Ceil ' + Math.ceil(a), sub: 'Floor and ceiling values.', rows: [['Input', a], ['Floor', Math.floor(a)], ['Ceiling', Math.ceil(a)]] };

    return { primary: 'Math result: ' + fmt(a + b + c), sub: 'Generic math fallback.', rows: [['a', a], ['b', b], ['c', c], ['Sum', a + b + c]] };
  }

  function calcGeometry(slug, data) {
    var length = num(data, ['length'], 10), width = num(data, ['width'], 8), height = num(data, ['height', 'depth'], 6), radius = num(data, ['radius'], 5), base = num(data, ['base'], 10), side = num(data, ['side'], 6), angle = num(data, ['angle'], 60);
    if (/area-of-circle|circumference/.test(slug)) { var area = Math.PI * radius * radius, circ = 2 * Math.PI * radius; return { primary: (/circumference/.test(slug) ? 'Circumference: ' + fmt(circ) : 'Area: ' + fmt(area)), sub: 'Circle geometry.', rows: [['Radius', radius], ['Area', area], ['Circumference', circ]] }; }
    if (/area-of-rectangle|perimeter/.test(slug)) { var rectArea = length * width, rectPer = 2 * (length + width); return { primary: (/perimeter/.test(slug) ? 'Perimeter: ' + fmt(rectPer) : 'Area: ' + fmt(rectArea)), sub: 'Rectangle geometry.', rows: [['Length', length], ['Width', width], ['Area', rectArea], ['Perimeter', rectPer]] }; }
    if (/area-of-triangle/.test(slug)) return { primary: 'Area: ' + fmt(0.5 * base * height), sub: 'Triangle area.', rows: [['Base', base], ['Height', height], ['Area', 0.5 * base * height]] };
    if (/area-of-trapezoid/.test(slug)) { var top = num(data, ['top', 'a'], 6), bottom = num(data, ['bottom', 'b'], 10); return { primary: 'Area: ' + fmt((top + bottom) * height / 2), sub: 'Trapezoid area.', rows: [['Top', top], ['Bottom', bottom], ['Height', height], ['Area', (top + bottom) * height / 2]] }; }
    if (/area-of-parallelogram/.test(slug)) return { primary: 'Area: ' + fmt(base * height), sub: 'Parallelogram area.', rows: [['Base', base], ['Height', height], ['Area', base * height]] };
    if (/area-of-ellipse/.test(slug)) { var ra = num(data, ['major', 'a'], 6), rb = num(data, ['minor', 'b'], 4); return { primary: 'Area: ' + fmt(Math.PI * ra * rb), sub: 'Ellipse area.', rows: [['Semi-major', ra], ['Semi-minor', rb], ['Area', Math.PI * ra * rb]] }; }
    if (/volume-of-cube/.test(slug)) return { primary: 'Volume: ' + fmt(Math.pow(side, 3)), sub: 'Cube volume.', rows: [['Side', side], ['Volume', Math.pow(side, 3)], ['Surface area', 6 * side * side]] };
    if (/volume-of-sphere/.test(slug)) return { primary: 'Volume: ' + fmt(4 * Math.PI * Math.pow(radius, 3) / 3), sub: 'Sphere volume.', rows: [['Radius', radius], ['Volume', 4 * Math.PI * Math.pow(radius, 3) / 3], ['Surface area', 4 * Math.PI * radius * radius]] };
    if (/volume-of-cylinder/.test(slug)) return { primary: 'Volume: ' + fmt(Math.PI * radius * radius * height), sub: 'Cylinder volume.', rows: [['Radius', radius], ['Height', height], ['Volume', Math.PI * radius * radius * height]] };
    if (/volume-of-cone/.test(slug)) return { primary: 'Volume: ' + fmt(Math.PI * radius * radius * height / 3), sub: 'Cone volume.', rows: [['Radius', radius], ['Height', height], ['Volume', Math.PI * radius * radius * height / 3]] };
    if (/volume-of-pyramid|3d-shape-volume/.test(slug)) return { primary: 'Volume: ' + fmt(length * width * height / 3), sub: 'Pyramid/cuboid-based estimate.', rows: [['Length', length], ['Width', width], ['Height', height], ['Volume', length * width * height / 3]] };
    if (/surface-area/.test(slug)) return { primary: 'Surface area: ' + fmt(2 * (length * width + width * height + length * height)), sub: 'Cuboid surface area.', rows: [['Length', length], ['Width', width], ['Height', height], ['Surface area', 2 * (length * width + width * height + length * height)]] };
    if (/diagonal/.test(slug)) return { primary: 'Diagonal: ' + fmt(Math.sqrt(length * length + width * width)), sub: 'Rectangle diagonal.', rows: [['Length', length], ['Width', width], ['Diagonal', Math.sqrt(length * length + width * width)]] };
    if (/pythagorean|hypotenuse/.test(slug)) return { primary: 'Hypotenuse: ' + fmt(Math.sqrt(a * a + b * b)), sub: 'a² + b² = c².', rows: [['a', 3], ['b', 4], ['c', 5]] };
    if (/distance-formula/.test(slug)) { var x1 = num(data, ['x1'], 0), y1 = num(data, ['y1'], 0), x2 = num(data, ['x2'], 3), y2 = num(data, ['y2'], 4); return { primary: 'Distance: ' + fmt(Math.hypot(x2 - x1, y2 - y1)), sub: '2D distance formula.', rows: [['Point 1', '(' + x1 + ', ' + y1 + ')'], ['Point 2', '(' + x2 + ', ' + y2 + ')'], ['Distance', Math.hypot(x2 - x1, y2 - y1)]] }; }
    if (/slope/.test(slug)) { var sx1 = num(data, ['x1'], 1), sy1 = num(data, ['y1'], 2), sx2 = num(data, ['x2'], 3), sy2 = num(data, ['y2'], 8); return { primary: 'Slope: ' + fmt((sy2 - sy1) / ((sx2 - sx1) || 1)), sub: 'Slope = rise/run.', rows: [['Slope', (sy2 - sy1) / ((sx2 - sx1) || 1)]] }; }
    if (/midpoint/.test(slug)) { var mx1 = num(data, ['x1'], 0), my1 = num(data, ['y1'], 0), mx2 = num(data, ['x2'], 4), my2 = num(data, ['y2'], 6); return { primary: 'Midpoint: (' + fmt((mx1 + mx2) / 2) + ', ' + fmt((my1 + my2) / 2) + ')', sub: 'Midpoint formula.', rows: [['Midpoint X', (mx1 + mx2) / 2], ['Midpoint Y', (my1 + my2) / 2]] }; }
    if (/angle-calculator/.test(slug)) { var rad = angle * Math.PI / 180; return { primary: 'sin(angle): ' + fmt(Math.sin(rad)), sub: 'Default trig output.', rows: [['Angle (deg)', angle], ['Radians', rad], ['sin', Math.sin(rad)], ['cos', Math.cos(rad)], ['tan', Math.tan(rad)]] }; }
    if (/arc-length/.test(slug)) return { primary: 'Arc length: ' + fmt(radius * (angle * Math.PI / 180)), sub: 'Arc length = rθ.', rows: [['Radius', radius], ['Angle', angle], ['Arc length', radius * (angle * Math.PI / 180)]] };
    if (/sector-area/.test(slug)) return { primary: 'Sector area: ' + fmt(Math.PI * radius * radius * (angle / 360)), sub: 'Sector area formula.', rows: [['Radius', radius], ['Angle', angle], ['Sector area', Math.PI * radius * radius * (angle / 360)]] };
    if (/polygon-area/.test(slug)) { var sides = num(data, ['sides', 'n'], 6); return { primary: 'Polygon area: ' + fmt((sides * side * side) / (4 * Math.tan(Math.PI / sides))), sub: 'Regular polygon area.', rows: [['Sides', sides], ['Side length', side], ['Area', (sides * side * side) / (4 * Math.tan(Math.PI / sides))]] }; }
    return { primary: 'Geometric result: ' + fmt(length * width), sub: 'Generic geometry fallback.', rows: [['Length', length], ['Width', width], ['Result', length * width]] };
  }

  function calcPhysics(slug, data) {
    var mass = num(data, ['mass'], 10), velocity = num(data, ['velocity', 'speed'], 5), accel = num(data, ['acceleration'], 2), distance = num(data, ['distance', 'height'], 10), time = num(data, ['time', 'period'], 5), voltage = num(data, ['voltage'], 220), current = num(data, ['current'], 5);
    if (/velocity-calculator/.test(slug)) return { primary: 'Velocity: ' + fmt(distance / time) + ' m/s', sub: 'Distance ÷ time.', rows: [['Distance', distance], ['Time', time], ['Velocity', distance / time]] };
    if (/acceleration/.test(slug)) return { primary: 'Acceleration: ' + fmt(velocity / time) + ' m/s²', sub: 'Velocity change ÷ time.', rows: [['Velocity change', velocity], ['Time', time], ['Acceleration', velocity / time]] };
    if (/force/.test(slug)) return { primary: 'Force: ' + fmt(mass * accel) + ' N', sub: 'Newton’s second law.', rows: [['Mass', mass], ['Acceleration', accel], ['Force', mass * accel]] };
    if (/kinetic-energy/.test(slug)) return { primary: 'Kinetic energy: ' + fmt(0.5 * mass * velocity * velocity) + ' J', sub: '½mv².', rows: [['Mass', mass], ['Velocity', velocity], ['KE', 0.5 * mass * velocity * velocity]] };
    if (/potential-energy/.test(slug)) return { primary: 'Potential energy: ' + fmt(mass * 9.81 * distance) + ' J', sub: 'mgh.', rows: [['Mass', mass], ['Height', distance], ['PE', mass * 9.81 * distance]] };
    if (/power-calculator/.test(slug)) { var work = num(data, ['work'], 1000); return { primary: 'Power: ' + fmt(work / time) + ' W', sub: 'Work ÷ time.', rows: [['Work', work], ['Time', time], ['Power', work / time]] }; }
    if (/momentum/.test(slug)) return { primary: 'Momentum: ' + fmt(mass * velocity), sub: 'Mass × velocity.', rows: [['Mass', mass], ['Velocity', velocity], ['Momentum', mass * velocity]] };
    if (/pressure$/.test(slug)) { var force2 = num(data, ['force'], 100), area2 = num(data, ['area'], 10); return { primary: 'Pressure: ' + fmt(force2 / area2) + ' Pa', sub: 'Force ÷ area.', rows: [['Force', force2], ['Area', area2], ['Pressure', force2 / area2]] }; }
    if (/density$/.test(slug)) { var volume = num(data, ['volume'], 2); return { primary: 'Density: ' + fmt(mass / volume), sub: 'Mass ÷ volume.', rows: [['Mass', mass], ['Volume', volume], ['Density', mass / volume]] }; }
    if (/ohm-s-law|resistance$/.test(slug)) return { primary: 'Resistance: ' + fmt(voltage / current) + ' Ω', sub: 'R = V / I.', rows: [['Voltage', voltage], ['Current', current], ['Resistance', voltage / current], ['Power', voltage * current]] };
    if (/capacitance/.test(slug)) { var charge = num(data, ['charge'], 10); return { primary: 'Capacitance: ' + fmt(charge / voltage) + ' F', sub: 'C = Q / V.', rows: [['Charge', charge], ['Voltage', voltage], ['Capacitance', charge / voltage]] }; }
    if (/frequency$/.test(slug)) return { primary: 'Frequency: ' + fmt(1 / time) + ' Hz', sub: 'f = 1/T.', rows: [['Period', time], ['Frequency', 1 / time]] };
    if (/wavelength/.test(slug)) { var freq = num(data, ['frequency'], 440); return { primary: 'Wavelength: ' + fmt(velocity / freq) + ' m', sub: 'λ = v / f.', rows: [['Speed', velocity], ['Frequency', freq], ['Wavelength', velocity / freq]] }; }
    if (/speed-of-sound/.test(slug)) { var tempC = num(data, ['temperature'], 20); return { primary: 'Speed of sound: ' + fmt(331 + 0.6 * tempC) + ' m/s', sub: 'Approximate air formula.', rows: [['Temperature °C', tempC], ['Speed', 331 + 0.6 * tempC]] }; }
    if (/projectile-motion/.test(slug)) { var ang = num(data, ['angle'], 45) * Math.PI / 180; return { primary: 'Range: ' + fmt(velocity * velocity * Math.sin(2 * ang) / 9.81) + ' m', sub: 'Projectile range estimate.', rows: [['Velocity', velocity], ['Angle', ang * 180 / Math.PI], ['Range', velocity * velocity * Math.sin(2 * ang) / 9.81]] }; }
    if (/gravitational-force/.test(slug)) { var mass2 = num(data, ['mass_2', 'second_mass'], 5), dist = num(data, ['distance'], 2), gf = 6.674e-11 * mass * mass2 / (dist * dist); return { primary: 'Force: ' + gf.toExponential(4) + ' N', sub: 'Newtonian gravity.', rows: [['Mass 1', mass], ['Mass 2', mass2], ['Distance', dist], ['Force', gf]] }; }
    if (/torque$/.test(slug)) { var force3 = num(data, ['force'], 50), lever = num(data, ['lever', 'radius', 'distance'], 0.5); return { primary: 'Torque: ' + fmt(force3 * lever) + ' N·m', sub: 'Force × lever arm.', rows: [['Force', force3], ['Lever arm', lever], ['Torque', force3 * lever]] }; }
    if (/work-calculator/.test(slug)) { var force4 = num(data, ['force'], 100); return { primary: 'Work: ' + fmt(force4 * distance) + ' J', sub: 'Force × distance.', rows: [['Force', force4], ['Distance', distance], ['Work', force4 * distance]] }; }
    if (/efficiency$/.test(slug)) { var out = num(data, ['output'], 80), inp = num(data, ['input'], 100); return { primary: 'Efficiency: ' + fmt((out / inp) * 100) + '%', sub: 'Output ÷ input.', rows: [['Output', out], ['Input', inp], ['Efficiency %', (out / inp) * 100]] }; }
    if (/heat-transfer/.test(slug)) { var cp = num(data, ['specific_heat'], 4.186), dt = num(data, ['temperature_change', 'delta'], 20); return { primary: 'Heat transfer: ' + fmt(mass * cp * dt) + ' J', sub: 'Q = mcΔT.', rows: [['Mass', mass], ['Specific heat', cp], ['ΔT', dt], ['Q', mass * cp * dt]] }; }
    if (/thermal-expansion/.test(slug)) { var alpha = num(data, ['coefficient'], 0.000012), dt2 = num(data, ['temperature_change', 'delta'], 40), length0 = num(data, ['length'], 10); return { primary: 'Expansion: ' + fmt(length0 * alpha * dt2), sub: 'ΔL = LαΔT.', rows: [['Length', length0], ['α', alpha], ['ΔT', dt2], ['ΔL', length0 * alpha * dt2]] }; }
    if (/buoyancy/.test(slug)) { var density = num(data, ['density'], 1000), volume2 = num(data, ['volume'], 0.1); return { primary: 'Buoyant force: ' + fmt(density * 9.81 * volume2) + ' N', sub: 'ρgV.', rows: [['Fluid density', density], ['Displaced volume', volume2], ['Buoyant force', density * 9.81 * volume2]] }; }
    if (/refraction/.test(slug)) { var n1 = num(data, ['n1'], 1), n2 = num(data, ['n2'], 1.33), inc = num(data, ['incident'], 30), refr = Math.asin((n1 / n2) * Math.sin(inc * Math.PI / 180)) * 180 / Math.PI; return { primary: 'Refraction angle: ' + fmt(refr) + '°', sub: 'Snell’s law.', rows: [['n1', n1], ['n2', n2], ['Incident angle', inc], ['Refracted angle', refr]] }; }
    if (/doppler-effect/.test(slug)) { var vs = num(data, ['source_speed'], 10), vo = num(data, ['observer_speed'], 0), wave = num(data, ['wave_speed'], 343), f = num(data, ['frequency'], 440); return { primary: 'Observed frequency: ' + fmt(f * (wave + vo) / (wave - vs)) + ' Hz', sub: 'Basic Doppler approximation.', rows: [['Source frequency', f], ['Observed frequency', f * (wave + vo) / (wave - vs)]] }; }
    return { primary: 'Physics result: ' + fmt(mass * accel), sub: 'Generic physics fallback.', rows: [['Mass', mass], ['Acceleration', accel], ['Result', mass * accel]] };
  }

  function parseChemicalFormula(formula) {
    var atomicMass = {H:1.008,He:4.003,Li:6.94,Be:9.012,B:10.81,C:12.011,N:14.007,O:15.999,F:18.998,Na:22.99,Mg:24.305,Al:26.982,Si:28.085,P:30.974,S:32.06,Cl:35.45,K:39.098,Ca:40.078,Fe:55.845,Cu:63.546,Zn:65.38,Ag:107.868,Au:196.967};
    var tokens = String(formula || '').match(/[A-Z][a-z]?\d*/g) || [];
    var comp = {}, mass = 0;
    tokens.forEach(function (t) {
      var m = t.match(/([A-Z][a-z]?)(\d*)/);
      if (!m) return;
      var el = m[1], count = Number(m[2] || 1);
      comp[el] = (comp[el] || 0) + count;
    });
    Object.keys(comp).forEach(function (el) { mass += (atomicMass[el] || 0) * comp[el]; });
    return { composition: comp, mass: mass };
  }

  function calcChemistry(slug, data) {
    var formula = str(data, ['formula', 'compound'], 'H2O');
    if (/molecular-weight|molar-mass/.test(slug)) {
      var parsed = parseChemicalFormula(formula);
      return { primary: fmt(parsed.mass) + ' g/mol', sub: 'Parsed from chemical formula.', rows: [['Formula', formula], ['Molar mass', parsed.mass], ['Composition', JSON.stringify(parsed.composition)]] };
    }
    if (/molarity/.test(slug)) { var moles = num(data, ['moles'], 1), liters = num(data, ['volume', 'liters'], 1); return { primary: fmt(moles / liters) + ' M', sub: 'Moles per liter.', rows: [['Moles', moles], ['Volume (L)', liters], ['Molarity', moles / liters]] }; }
    if (/molality/.test(slug)) { var moles2 = num(data, ['moles'], 1), kg = num(data, ['kg', 'solvent'], 1); return { primary: fmt(moles2 / kg) + ' m', sub: 'Moles per kg solvent.', rows: [['Moles', moles2], ['Solvent (kg)', kg], ['Molality', moles2 / kg]] }; }
    if (/dilution/.test(slug)) { var c1 = num(data, ['c1'], 1), v1 = num(data, ['v1'], 1), c2 = num(data, ['c2'], 0.2), v2 = c1 * v1 / c2; return { primary: 'Final volume: ' + fmt(v2), sub: 'C1V1 = C2V2.', rows: [['C1', c1], ['V1', v1], ['C2', c2], ['V2', v2]] }; }
    if (/ph-calculator/.test(slug)) { var h = num(data, ['hydrogen', 'h'], 0.0001); return { primary: 'pH: ' + fmt(-Math.log10(h)), sub: '-log10[H+].', rows: [['[H+]', h], ['pH', -Math.log10(h)]] }; }
    if (/poh-calculator/.test(slug)) { var oh = num(data, ['hydroxide', 'oh'], 0.0001); return { primary: 'pOH: ' + fmt(-Math.log10(oh)), sub: '-log10[OH-].', rows: [['[OH-]', oh], ['pOH', -Math.log10(oh)]] }; }
    if (/ideal-gas-law/.test(slug)) { var p = num(data, ['pressure'], 1), v = num(data, ['volume'], 22.4), n = num(data, ['moles'], 1), T = num(data, ['temperature'], 273.15), R = 0.082057; return { primary: 'PV = ' + fmt(p * v) + ', nRT = ' + fmt(n * R * T), sub: 'Ideal gas law consistency check.', rows: [['Pressure', p], ['Volume', v], ['Moles', n], ['Temperature', T], ['PV', p * v], ['nRT', n * R * T]] }; }
    if (/boyle-s-law/.test(slug)) { var p1 = num(data, ['p1'], 1), vv1 = num(data, ['v1'], 2), p2 = num(data, ['p2'], 2), vv2 = p1 * vv1 / p2; return { primary: 'V2: ' + fmt(vv2), sub: 'P1V1 = P2V2.', rows: [['P1', p1], ['V1', vv1], ['P2', p2], ['V2', vv2]] }; }
    if (/charles-s-law/.test(slug)) { var cv1 = num(data, ['v1'], 2), t1 = num(data, ['t1'], 300), t2 = num(data, ['t2'], 330), cv2 = cv1 * t2 / t1; return { primary: 'V2: ' + fmt(cv2), sub: 'V1/T1 = V2/T2.', rows: [['V1', cv1], ['T1', t1], ['T2', t2], ['V2', cv2]] }; }
    if (/half-life/.test(slug)) { var initial = num(data, ['initial'], 100), half = num(data, ['half_life'], 5), elapsed = num(data, ['time'], 10), remain = initial * Math.pow(0.5, elapsed / half); return { primary: 'Remaining amount: ' + fmt(remain), sub: 'Radioactive decay estimate.', rows: [['Initial', initial], ['Half-life', half], ['Elapsed time', elapsed], ['Remaining', remain]] }; }
    if (/reaction-yield/.test(slug)) { var actual = num(data, ['actual'], 8), theoretical = num(data, ['theoretical'], 10); return { primary: 'Yield: ' + fmt((actual / theoretical) * 100) + '%', sub: 'Actual ÷ theoretical × 100.', rows: [['Actual yield', actual], ['Theoretical yield', theoretical], ['Yield %', (actual / theoretical) * 100]] }; }
    if (/buffer-ph/.test(slug)) { var pKa = num(data, ['pka'], 4.76), baseB = num(data, ['base'], 1), acid = num(data, ['acid'], 1), ph = pKa + Math.log10(baseB / acid); return { primary: 'Buffer pH: ' + fmt(ph), sub: 'Henderson-Hasselbalch equation.', rows: [['pKa', pKa], ['Base', baseB], ['Acid', acid], ['pH', ph]] }; }
    if (/normality/.test(slug)) { var eq = num(data, ['equivalents'], 1), lit = num(data, ['volume', 'liters'], 1); return { primary: fmt(eq / lit) + ' N', sub: 'Equivalents per liter.', rows: [['Equivalents', eq], ['Volume (L)', lit], ['Normality', eq / lit]] }; }
    if (/osmolarity/.test(slug)) { var mol = num(data, ['molarity'], 1), vant = num(data, ['factor'], 1); return { primary: fmt(mol * vant) + ' Osm/L', sub: 'Osmolarity estimate.', rows: [['Molarity', mol], ['Van’t Hoff factor', vant], ['Osmolarity', mol * vant]] }; }
    return { primary: 'Chemistry result: ' + fmt(1), sub: 'Generic chemistry fallback.', rows: [['Formula', formula], ['Note', 'Add exact inputs for more precise results']] };
  }

  function calcConstruction(slug, data) {
    var length = num(data, ['length'], 10), width = num(data, ['width'], 10), depth = num(data, ['depth', 'height', 'thickness'], 0.15), area = num(data, ['area'], length * width), rate = num(data, ['rate', 'cost', 'price'], 50);
    if (/concrete/.test(slug)) { var vol = length * width * depth; return { primary: 'Concrete volume: ' + fmt(vol) + ' m³', sub: 'Length × width × depth.', rows: [['Length', length], ['Width', width], ['Depth', depth], ['Volume', vol], ['Estimated cost', vol * rate]] }; }
    if (/brick/.test(slug)) { var wallVol = length * width * depth, brickQty = wallVol / (0.19 * 0.09 * 0.09) * 1.05; return { primary: 'Bricks needed: ' + fmt(brickQty, 0), sub: 'Approximate brick quantity with wastage.', rows: [['Wall volume', wallVol], ['Brick quantity', brickQty]] }; }
    if (/paint/.test(slug)) { var coats = num(data, ['coat'], 2), coverage = num(data, ['coverage'], 10), liters = area * coats / coverage; return { primary: 'Paint needed: ' + fmt(liters) + ' L', sub: 'Area × coats ÷ coverage.', rows: [['Area', area], ['Coats', coats], ['Coverage', coverage], ['Paint (L)', liters]] }; }
    if (/flooring|tile/.test(slug)) { var tileL = num(data, ['tile_length'], 0.6), tileW = num(data, ['tile_width'], 0.6), pieces = area / (tileL * tileW) * 1.1; return { primary: 'Pieces required: ' + fmt(pieces, 0), sub: 'Area divided by tile size + wastage.', rows: [['Area', area], ['Tile area', tileL * tileW], ['Pieces', pieces], ['Cost estimate', pieces * rate]] }; }
    if (/roof-area/.test(slug)) { var slope = num(data, ['slope'], 30) * Math.PI / 180, roof = area / Math.cos(slope); return { primary: 'Roof area: ' + fmt(roof), sub: 'Plan area adjusted for slope.', rows: [['Plan area', area], ['Slope', slope * 180 / Math.PI], ['Roof area', roof]] }; }
    if (/staircase/.test(slug)) { var rise = num(data, ['rise'], 3), riser = num(data, ['riser'], 0.17), tread = num(data, ['tread'], 0.28), steps = rise / riser; return { primary: 'Steps: ' + fmt(steps, 0), sub: 'Rise divided by riser height.', rows: [['Total rise', rise], ['Riser', riser], ['Tread', tread], ['Steps', steps]] }; }
    if (/beam-load|column-load|footing-size|retaining-wall/.test(slug)) { var load = num(data, ['load', 'force'], 100), safe = num(data, ['safe', 'soil', 'stress'], 200), req = load / safe; return { primary: 'Required area: ' + fmt(req), sub: 'Load ÷ safe bearing/stress value.', rows: [['Load', load], ['Allowable value', safe], ['Required area', req]] }; }
    if (/plaster/.test(slug)) { var plaster = area * depth; return { primary: 'Plaster volume: ' + fmt(plaster) + ' m³', sub: 'Area × thickness.', rows: [['Area', area], ['Thickness', depth], ['Volume', plaster]] }; }
    if (/sand-cement/.test(slug)) { var vol2 = num(data, ['volume'], 1); return { primary: 'Cement part: ' + fmt(vol2 * 0.2) + ' m³', sub: 'Default 1:4 mix split.', rows: [['Total volume', vol2], ['Cement', vol2 * 0.2], ['Sand', vol2 * 0.8]] }; }
    if (/steel-weight/.test(slug)) { var dia = num(data, ['diameter'], 12), len = num(data, ['length'], 10), wt = dia * dia / 162 * len; return { primary: 'Steel weight: ' + fmt(wt) + ' kg', sub: 'Rebar weight formula.', rows: [['Diameter (mm)', dia], ['Length (m)', len], ['Weight (kg)', wt]] }; }
    if (/pipe-weight/.test(slug)) { var od = num(data, ['outer_diameter', 'diameter'], 60), thick = num(data, ['thickness'], 3), plen = num(data, ['length'], 6), pwt = 0.02466 * (od - thick) * thick * plen; return { primary: 'Pipe weight: ' + fmt(pwt) + ' kg', sub: 'Approximate steel pipe weight.', rows: [['OD', od], ['Thickness', thick], ['Length', plen], ['Weight', pwt]] }; }
    if (/earthwork/.test(slug)) { var earth = length * width * depth; return { primary: 'Earthwork volume: ' + fmt(earth) + ' m³', sub: 'Excavation/fill volume.', rows: [['Length', length], ['Width', width], ['Depth', depth], ['Volume', earth]] }; }
    if (/water-tank-volume/.test(slug)) { var tank = length * width * depth * 1000; return { primary: 'Tank volume: ' + fmt(tank) + ' L', sub: 'Rectangular tank volume.', rows: [['Length', length], ['Width', width], ['Height', depth], ['Volume (L)', tank]] }; }
    if (/drainage/.test(slug)) { var rain = num(data, ['rainfall', 'intensity'], 50), flow = area * rain / 3600; return { primary: 'Drain flow: ' + fmt(flow), sub: 'Simple runoff estimate.', rows: [['Catchment area', area], ['Rainfall intensity', rain], ['Flow', flow]] }; }
    if (/electrical-load/.test(slug)) { var watts = num(data, ['watts', 'power'], 2000), volts = num(data, ['voltage'], 230); return { primary: 'Current: ' + fmt(watts / volts) + ' A', sub: 'Electrical load estimate.', rows: [['Power (W)', watts], ['Voltage', volts], ['Current (A)', watts / volts]] }; }
    if (/cable-size/.test(slug)) { var amps = num(data, ['current'], 20); return { primary: 'Suggested cable size: ' + fmt(amps / 6) + ' mm²', sub: 'Rule-of-thumb sizing estimate.', rows: [['Current', amps], ['Cable size', amps / 6]] }; }
    if (/lighting/.test(slug)) { var lux = num(data, ['lux'], 200), lumens = area * lux; return { primary: 'Required lumens: ' + fmt(lumens), sub: 'Area × target lux.', rows: [['Area', area], ['Target lux', lux], ['Lumens', lumens]] }; }
    if (/ac-tonnage/.test(slug)) return { primary: 'Estimated AC tonnage: ' + fmt(area / 120), sub: 'Rough room area rule.', rows: [['Area', area], ['Tonnage', area / 120]] };
    return { primary: 'Construction result: ' + fmt(area), sub: 'Generic construction fallback.', rows: [['Area', area], ['Rate', rate], ['Cost', area * rate]] };
  }

  var converterMaps = {
    length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mile: 1609.344 },
    weight: { mg: 0.000001, g: 0.001, kg: 1, tonne: 1000, lb: 0.45359237, oz: 0.0283495 },
    area: { sqm: 1, m2: 1, sqft: 0.092903, acre: 4046.856, hectare: 10000 },
    volume: { ml: 0.001, l: 1, liter: 1, gallon: 3.78541, cup: 0.236588, tbsp: 0.0147868, tsp: 0.00492892 },
    speed: { mps: 1, kmh: 0.277778, mph: 0.44704, knot: 0.514444 },
    time: { sec: 1, second: 1, min: 60, hour: 3600, day: 86400, week: 604800, month: 2629800, year: 31557600 },
    pressure: { pa: 1, kpa: 1000, bar: 100000, psi: 6894.76, atm: 101325 },
    energy: { j: 1, kj: 1000, cal: 4.184, kcal: 4184, wh: 3600, kwh: 3600000 },
    power: { w: 1, kw: 1000, hp: 745.7 },
    force: { n: 1, kn: 1000, lbf: 4.44822 },
    torque: { nm: 1, ftlb: 1.35582 },
    frequency: { hz: 1, khz: 1000, mhz: 1000000, ghz: 1000000000 },
    data: { b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776 },
    angle: { deg: 1, rad: 57.2957795 }
  };

  function cleanUnit(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, '_'); }
  function convert(kind, value, from, to) {
    if (kind === 'temperature') {
      var f = cleanUnit(from), t = cleanUnit(to), c = value;
      if (f === 'f' || f === 'fahrenheit') c = (value - 32) * 5 / 9;
      else if (f === 'k' || f === 'kelvin') c = value - 273.15;
      if (t === 'f' || t === 'fahrenheit') return c * 9 / 5 + 32;
      if (t === 'k' || t === 'kelvin') return c + 273.15;
      return c;
    }
    var map = converterMaps[kind];
    if (!map) return null;
    var fv = map[cleanUnit(from)], tv = map[cleanUnit(to)];
    if (!fv || !tv) return null;
    return value * fv / tv;
  }

  function calcConverter(slug, data) {
    var value = num(data, ['value', 'amount'], 1);
    var from = str(data, ['from_unit', 'from'], 'm');
    var to = str(data, ['to_unit', 'to'], 'km');
    var kind = /length/.test(slug) ? 'length' : /weight/.test(slug) ? 'weight' : /temperature/.test(slug) ? 'temperature' : /volume|cups-to-ml|cooking-measurements/.test(slug) ? 'volume' : /area/.test(slug) ? 'area' : /speed/.test(slug) ? 'speed' : /pressure/.test(slug) ? 'pressure' : /energy/.test(slug) ? 'energy' : /power/.test(slug) ? 'power' : /force/.test(slug) ? 'force' : /torque/.test(slug) ? 'torque' : /time/.test(slug) ? 'time' : /frequency/.test(slug) ? 'frequency' : /data-storage/.test(slug) ? 'data' : /angle/.test(slug) ? 'angle' : null;
    if (/fuel-efficiency/.test(slug)) { var dist = num(data, ['distance'], 400), fuel = num(data, ['fuel'], 20); return { primary: 'Efficiency: ' + fmt(dist / fuel) + ' km/L', sub: 'Distance divided by fuel used.', rows: [['Distance', dist], ['Fuel', fuel], ['km/L', dist / fuel]] }; }
    if (/luminance/.test(slug)) return { primary: fmt(value / 10.764) + ' fc', sub: 'Lux to foot-candle conversion.', rows: [['Lux', value], ['Foot-candle', value / 10.764]] };
    if (/density-converter/.test(slug)) return { primary: fmt(value / 1000) + ' g/cm³', sub: 'Basic density conversion.', rows: [['kg/m³', value], ['g/cm³', value / 1000]] };
    if (/flow-rate/.test(slug)) return { primary: fmt(value / 60) + ' L/s', sub: 'Flow rate conversion.', rows: [['L/min', value], ['L/s', value / 60]] };
    var converted = kind ? convert(kind, value, from, to) : null;
    if (converted !== null) return { primary: fmt(converted) + ' ' + to, sub: 'Converted from ' + from + ' to ' + to + '.', rows: [['Value', value], ['From', from], ['To', to], ['Converted', converted]] };
    return { primary: 'Converted value: ' + fmt(value), sub: 'Provide supported from/to units for exact conversion.', rows: [['Value', value], ['From', from], ['To', to]] };
  }

  function calcDate(slug, data) {
    var start = dateVal(data, ['start', 'from', 'birth', 'date'], '2026-01-01');
    var end = dateVal(data, ['end', 'to', 'target'], '2026-06-01');
    if (/age-calculator|birthday/.test(slug)) {
      var years = end.getFullYear() - start.getFullYear(), months = end.getMonth() - start.getMonth(), days = end.getDate() - start.getDate();
      if (days < 0) { months--; days += 30; }
      if (months < 0) { years--; months += 12; }
      return { primary: years + ' years, ' + months + ' months, ' + days + ' days', sub: 'Date difference in age format.', rows: [['Start date', fmtDate(start)], ['End date', fmtDate(end)], ['Total days', daysBetween(start, end)]] };
    }
    if (/days-between|date-difference|deadline|countdown/.test(slug)) return { primary: daysBetween(start, end) + ' days', sub: 'Difference between two dates.', rows: [['Start', fmtDate(start)], ['End', fmtDate(end)], ['Days', daysBetween(start, end)]] };
    if (/add-subtract-days/.test(slug)) { var delta = num(data, ['days'], 30), out = addDays(start, delta); return { primary: fmtDate(out), sub: 'Start date adjusted by selected day count.', rows: [['Start', fmtDate(start)], ['Days added', delta], ['Result', fmtDate(out)]] }; }
    if (/weekday-finder/.test(slug)) return { primary: start.toLocaleDateString(undefined, { weekday: 'long' }), sub: 'Weekday for selected date.', rows: [['Date', fmtDate(start)], ['Weekday', start.toLocaleDateString(undefined, { weekday: 'long' })]] };
    if (/week-number/.test(slug)) { var onejan = new Date(start.getFullYear(), 0, 1), wk = Math.ceil((((start - onejan) / 86400000) + onejan.getDay() + 1) / 7); return { primary: 'Week ' + wk, sub: 'Calendar week estimate.', rows: [['Date', fmtDate(start)], ['Week number', wk]] }; }
    if (/leap-year/.test(slug)) { var y = num(data, ['year'], start.getFullYear()), leap = (!(y % 4) && y % 100) || !(y % 400); return { primary: leap ? 'Leap year' : 'Not a leap year', sub: 'Gregorian leap-year check.', rows: [['Year', y], ['Leap year', leap ? 'Yes' : 'No']] }; }
    if (/time-zone-converter/.test(slug)) { var offset = num(data, ['offset'], 5.5), out2 = new Date(start.getTime() + offset * 3600000); return { primary: out2.toISOString().replace('T', ' ').slice(0, 16), sub: 'Basic offset-based timezone conversion.', rows: [['Source', start.toISOString().slice(0, 16)], ['Offset hours', offset], ['Converted', out2.toISOString().slice(0, 16)]] }; }
    if (/work-hours|overtime/.test(slug)) { var hours = num(data, ['hours'], 9), days2 = num(data, ['days'], 22), standard = num(data, ['standard'], 8); return { primary: 'Monthly hours: ' + fmt(hours * days2), sub: 'Work-hour and overtime estimate.', rows: [['Hours/day', hours], ['Days', days2], ['Total hours', hours * days2], ['Overtime hours', Math.max(0, hours - standard) * days2]] }; }
    if (/retirement-date/.test(slug)) { var dob = start, retireAge = num(data, ['retirement_age', 'age'], 60), out3 = new Date(dob); out3.setFullYear(dob.getFullYear() + retireAge); return { primary: fmtDate(out3), sub: 'Estimated retirement date.', rows: [['DOB', fmtDate(dob)], ['Retirement age', retireAge], ['Retirement date', fmtDate(out3)]] }; }
    if (/unix-timestamp/.test(slug)) return { primary: String(Math.floor(start.getTime() / 1000)), sub: 'Unix timestamp in seconds.', rows: [['Date', fmtDate(start)], ['Unix timestamp', Math.floor(start.getTime() / 1000)]] };
    if (/julian-date/.test(slug)) { var jd = start.getTime() / 86400000 + 2440587.5; return { primary: fmt(jd, 5), sub: 'Julian date value.', rows: [['Date', fmtDate(start)], ['Julian date', jd]] }; }
    return { primary: daysBetween(start, end) + ' days', sub: 'Generic date fallback.', rows: [['Start', fmtDate(start)], ['End', fmtDate(end)], ['Days', daysBetween(start, end)]] };
  }

  function calcAutomotive(slug, data) {
    var distance = num(data, ['distance'], 400), fuel = num(data, ['fuel'], 20), speed = num(data, ['speed'], 80), time = num(data, ['time', 'hours'], 5);
    if (/fuel-cost|road-trip-cost/.test(slug)) { var price = num(data, ['price', 'fuel_price', 'rate'], 100), liters = fuel || distance / 15; return { primary: 'Trip fuel cost: ' + fmt(liters * price), sub: 'Fuel used × price per liter.', rows: [['Fuel used', liters], ['Fuel price', price], ['Cost', liters * price]] }; }
    if (/mileage/.test(slug)) return { primary: 'Mileage: ' + fmt(distance / fuel) + ' km/L', sub: 'Distance ÷ fuel.', rows: [['Distance', distance], ['Fuel', fuel], ['Mileage', distance / fuel]] };
    if (/tire-size/.test(slug)) { var width = num(data, ['width'], 205), aspect = num(data, ['aspect'], 55), rim = num(data, ['rim'], 16), dia = rim * 25.4 + 2 * width * aspect / 100; return { primary: 'Overall diameter: ' + fmt(dia) + ' mm', sub: 'Tire size estimate.', rows: [['Width', width], ['Aspect', aspect], ['Rim', rim], ['Diameter', dia]] }; }
    if (/speed-calculator/.test(slug)) return { primary: 'Speed: ' + fmt(distance / time) + ' km/h', sub: 'Distance ÷ time.', rows: [['Distance', distance], ['Time', time], ['Speed', distance / time]] };
    if (/engine-horsepower/.test(slug)) { var torque = num(data, ['torque'], 250), rpm = num(data, ['rpm'], 4000); return { primary: 'Horsepower: ' + fmt(torque * rpm / 7127) + ' hp', sub: 'Torque and RPM based estimate.', rows: [['Torque (Nm)', torque], ['RPM', rpm], ['HP', torque * rpm / 7127]] }; }
    if (/oil-change-interval/.test(slug)) return { primary: fmt(num(data, ['km', 'distance'], 10000), 0) + ' km', sub: 'Service interval tracker.', rows: [['Recommended interval', num(data, ['km', 'distance'], 10000)]] };
    if (/stopping-distance/.test(slug)) { var reaction = speed * 0.277778 * 1.5, braking = (speed * speed) / 170; return { primary: 'Stopping distance: ' + fmt(reaction + braking) + ' m', sub: 'Reaction + braking estimate.', rows: [['Reaction distance', reaction], ['Braking distance', braking], ['Total stopping distance', reaction + braking]] }; }
    if (/towing-capacity/.test(slug)) { var gcwr = num(data, ['gcwr'], 5000), curb = num(data, ['curb'], 2500), payload = num(data, ['payload'], 300); return { primary: 'Tow capacity: ' + fmt(gcwr - curb - payload) + ' kg', sub: 'Gross combined weight based estimate.', rows: [['GCWR', gcwr], ['Curb weight', curb], ['Payload', payload], ['Tow capacity', gcwr - curb - payload]] }; }
    if (/depreciation/.test(slug)) { var price2 = num(data, ['price', 'value'], 1000000), dep = num(data, ['rate'], 15), years3 = num(data, ['years', 'time'], 5), residual = price2 * Math.pow(1 - dep / 100, years3); return { primary: 'Residual value: ' + fmt(residual), sub: 'Compound depreciation estimate.', rows: [['Purchase price', price2], ['Depreciation %', dep], ['Years', years3], ['Residual value', residual]] }; }
    if (/parking-cost/.test(slug)) { var hours2 = num(data, ['hours'], 5), rate2 = num(data, ['rate', 'cost'], 40); return { primary: 'Parking cost: ' + fmt(hours2 * rate2), sub: 'Hours × parking rate.', rows: [['Hours', hours2], ['Rate', rate2], ['Cost', hours2 * rate2]] }; }
    if (/ev-range/.test(slug)) { var battery = num(data, ['battery'], 60), eff = num(data, ['efficiency'], 6); return { primary: 'Estimated EV range: ' + fmt(battery * eff) + ' km', sub: 'Battery capacity × efficiency.', rows: [['Battery (kWh)', battery], ['Efficiency (km/kWh)', eff], ['Range', battery * eff]] }; }
    if (/gear-ratio/.test(slug)) { var driven = num(data, ['driven'], 40), driver = num(data, ['driver'], 20); return { primary: 'Gear ratio: ' + fmt(driven / driver), sub: 'Driven teeth ÷ driver teeth.', rows: [['Driven teeth', driven], ['Driver teeth', driver], ['Ratio', driven / driver]] }; }
    return { primary: 'Automotive result: ' + fmt(speed), sub: 'Generic automotive fallback.', rows: [['Distance', distance], ['Speed', speed], ['Time', time]] };
  }

  function calcEducation(slug, data) {
    var list = numList(data), score = list.length > 0 ? list[0] : 80, max = list.length > 1 ? list[1] : 100;
    if (/gpa|cgpa/.test(slug)) { var avg = list.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, list.length), gpa = avg / 10; return { primary: 'GPA: ' + fmt(gpa), sub: 'Average marks scaled to 10-point GPA.', rows: [['Average marks', avg], ['GPA', gpa]] }; }
    if (/grade|percentage-to-grade/.test(slug)) { var pct = score / max * 100, grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F'; return { primary: 'Grade: ' + grade, sub: 'Percentage: ' + fmt(pct) + '%.', rows: [['Score', score], ['Max', max], ['Percentage', pct], ['Grade', grade]] }; }
    if (/marks-required/.test(slug)) { var target = num(data, ['target'], 85), achieved = num(data, ['achieved'], 240), total = num(data, ['total'], 500), need = target / 100 * total - achieved; return { primary: 'Marks needed: ' + fmt(need), sub: 'Required marks to reach target overall percentage.', rows: [['Target %', target], ['Total marks', total], ['Marks achieved', achieved], ['Marks needed', need]] }; }
    if (/study-hours/.test(slug)) { var subjects = num(data, ['subjects'], 5), days = num(data, ['days'], 30), totalH = subjects * 2 * days; return { primary: 'Recommended study time: ' + fmt(totalH) + ' hours', sub: '2 hours per subject per day estimate.', rows: [['Subjects', subjects], ['Days', days], ['Hours', totalH]] }; }
    if (/exam-score/.test(slug)) { var internal = num(data, ['internal'], 25), exam = num(data, ['test', 'exam'], 60); return { primary: 'Predicted final score: ' + fmt(internal + exam), sub: 'Internal + projected exam score.', rows: [['Internal', internal], ['Projected exam', exam], ['Final score', internal + exam]] }; }
    if (/scholarship/.test(slug)) { var pct2 = score / max * 100, scholarship = pct2 >= 90 ? 100 : pct2 >= 80 ? 50 : pct2 >= 70 ? 25 : 0; return { primary: 'Scholarship estimate: ' + scholarship + '%', sub: 'Percentage-based scholarship band.', rows: [['Percentage', pct2], ['Scholarship %', scholarship]] }; }
    if (/student-loan/.test(slug)) return calcFinance('loan-calculator', data);
    if (/attendance/.test(slug)) { var attended = num(data, ['attended'], 72), totalC = num(data, ['total'], 90); return { primary: 'Attendance: ' + fmt((attended / totalC) * 100) + '%', sub: 'Attended classes divided by total classes.', rows: [['Attended', attended], ['Total', totalC], ['Attendance %', (attended / totalC) * 100]] }; }
    return { primary: 'Education result: ' + fmt((score / max) * 100) + '%', sub: 'Generic education fallback.', rows: [['Score', score], ['Max', max], ['Percentage', (score / max) * 100]] };
  }

  function calcFood(slug, data) {
    var amount = num(data, ['amount', 'value'], 1);
    if (/recipe-converter/.test(slug)) { var factor = num(data, ['factor', 'servings'], 2); return { primary: 'Scaled amount: ' + fmt(amount * factor), sub: 'Recipe quantity scaled by selected factor.', rows: [['Base amount', amount], ['Scale factor', factor], ['New amount', amount * factor]] }; }
    if (/cooking-measurement|tablespoon-converter/.test(slug)) return { primary: fmt(amount * 14.7868) + ' ml', sub: 'Kitchen tablespoon conversion.', rows: [['Tablespoons', amount], ['Milliliters', amount * 14.7868]] };
    if (/macros-tracker/.test(slug)) { var calories = num(data, ['calories'], 2000); return { primary: fmt(calories * 0.3 / 4) + ' g protein', sub: 'Sample macro split.', rows: [['Calories', calories], ['Protein (g)', calories * 0.3 / 4], ['Carbs (g)', calories * 0.4 / 4], ['Fat (g)', calories * 0.3 / 9]] }; }
    if (/baking-ratio/.test(slug)) { var flour = num(data, ['flour'], 500); return { primary: fmt(flour * 0.65) + ' g water', sub: '65% hydration baking ratio.', rows: [['Flour', flour], ['Water', flour * 0.65], ['Salt', flour * 0.02], ['Yeast', flour * 0.01]] }; }
    if (/yeast-calculator/.test(slug)) { var flour2 = num(data, ['flour'], 500); return { primary: fmt(flour2 * 0.01) + ' g yeast', sub: '1% yeast estimate.', rows: [['Flour', flour2], ['Yeast', flour2 * 0.01]] }; }
    if (/coffee-ratio/.test(slug)) { var water = num(data, ['water'], 300); return { primary: fmt(water / 16) + ' g coffee', sub: '1:16 coffee ratio.', rows: [['Water (ml)', water], ['Coffee (g)', water / 16]] }; }
    if (/tea-strength/.test(slug)) { var leaves = num(data, ['tea', 'leaves'], 5), water2 = num(data, ['water'], 250); return { primary: 'Strength index: ' + fmt(leaves / water2 * 100), sub: 'Tea leaves to water concentration.', rows: [['Tea leaves', leaves], ['Water', water2], ['Strength index', leaves / water2 * 100]] }; }
    if (/sugar-substitute/.test(slug)) return { primary: fmt(amount * 0.7) + ' g substitute', sub: 'Approximate substitute weight.', rows: [['Sugar', amount], ['Substitute', amount * 0.7]] };
    if (/alcohol-content-abv/.test(slug)) { var alcohol = num(data, ['alcohol'], 40), total = num(data, ['total'], 750); return { primary: 'ABV: ' + fmt((alcohol / total) * 100) + '%', sub: 'Alcohol volume by total volume.', rows: [['Alcohol volume', alcohol], ['Total volume', total], ['ABV %', (alcohol / total) * 100]] }; }
    if (/food-expiry-estimator/.test(slug)) { var made = dateVal(data, ['date', 'made'], '2026-06-01'), shelf = num(data, ['days', 'shelf'], 3), exp = addDays(made, shelf); return { primary: 'Estimated expiry: ' + fmtDate(exp), sub: 'Simple shelf-life estimate.', rows: [['Prepared date', fmtDate(made)], ['Shelf life (days)', shelf], ['Expiry', fmtDate(exp)]] }; }
    return { primary: 'Food result: ' + fmt(amount), sub: 'Generic food fallback.', rows: [['Amount', amount]] };
  }

  function calcGeneric(data) {
    var list = numList(data), total = list.reduce(function (a, b) { return a + b; }, 0);
    return { primary: 'Calculated summary: ' + fmt(total), sub: 'Generic fallback using numeric inputs on the page.', rows: Object.keys(data).slice(0, 8).map(function (k) { return [k.replace(/_/g, ' '), data[k]]; }).concat([['Numeric sum', total]]) };
  }

  function calculate(engine, slug, path, data) {
    var family = normalizeFamily(engine, slug, path) || inferFamily(slug, path);
    if (family === 'finance') return calcFinance(slug, data);
    if (family === 'health') return calcHealth(slug, data);
    if (family === 'math') return calcMath(slug, data);
    if (family === 'geometry') return calcGeometry(slug, data);
    if (family === 'physics') return calcPhysics(slug, data);
    if (family === 'chemistry') return calcChemistry(slug, data);
    if (family === 'construction') return calcConstruction(slug, data);
    if (family === 'converter') return calcConverter(slug, data);
    if (family === 'date') return calcDate(slug, data);
    if (family === 'automotive') return calcAutomotive(slug, data);
    if (family === 'education') return calcEducation(slug, data);
    if (family === 'food') return calcFood(slug, data);
    return calcGeneric(data);
  }

  function validateForm(form) {
    var errors = [];
    qsa('input[type="number"]', form).forEach(function (input) {
      var value = input.value.trim();
      if (!value) return;
      var num = Number(value);
      if (!isFinite(num)) {
        errors.push((input.name || 'Input') + ' must be a valid number.');
        input.setAttribute('aria-invalid', 'true');
        return;
      }
      var min = input.getAttribute('min');
      var max = input.getAttribute('max');
      if (min !== null && num < Number(min)) errors.push((input.name || 'Input') + ' must be at least ' + min + '.');
      if (max !== null && num > Number(max)) errors.push((input.name || 'Input') + ' must be at most ' + max + '.');
      input.setAttribute('aria-invalid', 'false');
    });
    qsa('input[type="date"]', form).forEach(function (input) {
      if (input.value && Number.isNaN(new Date(input.value).getTime())) {
        errors.push((input.name || 'Date') + ' must be a valid date.');
        input.setAttribute('aria-invalid', 'true');
      } else input.setAttribute('aria-invalid', 'false');
    });
    return errors;
  }

  function fillSample(slug, form) {
    var samples = {
      'emi-calculator': { loan_amount: 1000000, interest_rate: 9, tenure_months_years: 20, processing_fee: 1 },
      'sip-calculator': { monthly_investment: 10000, expected_annual_return: 12, investment_duration: 15 },
      'bmi-calculator': { weight: 70, height: 175, age: 30 },
      'area-of-circle': { radius: 5 },
      'velocity-calculator': { distance: 100, time: 9.58 },
      'molarity': { moles: 1, volume: 1 },
      'concrete-calculator': { length: 5, width: 4, depth: 0.15, rate: 5500 },
      'length-converter': { value: 1000, from_unit: 'm', to_unit: 'km' },
      'gpa-calculator': { subject_1: 85, subject_2: 78, subject_3: 92 },
      'fuel-cost-calculator': { distance: 400, fuel: 28, fuel_price: 100 },
      'recipe-converter': { amount: 250, factor: 2 }
    };
    var sample = samples[slug] || {};
    Object.keys(sample).forEach(function (name) {
      var input = form.querySelector('[name="' + name + '"], [name="' + name.replace(/_/g, '-') + '"]');
      if (input) input.value = sample[name];
    });
    if (!Object.keys(sample).length) {
      qsa('input', form).forEach(function (input) {
        if (input.type === 'date' && !input.value) input.value = '2026-06-06';
        if (input.type === 'number' && !input.value) input.value = input.name.indexOf('rate') !== -1 ? '10' : (input.name.indexOf('time') !== -1 || input.name.indexOf('year') !== -1 ? '5' : '10');
        if (input.type === 'text' && !input.value) {
          if (input.name.indexOf('from') !== -1) input.value = 'm';
          else if (input.name.indexOf('to') !== -1) input.value = 'km';
          else if (input.name.indexOf('formula') !== -1) input.value = 'H2O';
        }
      });
    }
  }

  qsa('.calc-layout').forEach(function (layout) {
    var engine = (layout.getAttribute('data-engine') || '').trim() || 'auto';
    var slug = layout.getAttribute('data-page-slug') || location.pathname.split('/').filter(Boolean).pop() || '';
    if (engine === 'auto') engine = detectCalculatorType(slug, location.pathname);
    var form = qs('.calc-form', layout);
    var primary = qs('[data-result-primary]', layout);
    var sub = qs('[data-result-sub]', layout);
    var table = qs('[data-result-table]', layout);
    var chart = qs('[data-chart-area]', layout);

    function run() {
      var errors = validateForm(form);
      if (errors.length) {
        primary.textContent = 'Validation error';
        sub.textContent = errors[0];
        setTable(table, [['Input', 'Please correct the highlighted fields']]);
        chart.textContent = 'Enter valid values to see chart output.';
        return;
      }
      var data = readForm(form);
      var out = calculate(engine, slug, location.pathname, data);
      primary.textContent = out.primary || 'Calculation complete';
      sub.textContent = out.sub || 'Result generated successfully.';
      setTable(table, out.rows.map(function (row) { return [row[0], typeof row[1] === 'number' ? fmt(row[1]) : row[1]]; }));
      drawBars(chart, out.rows.map(function (row) { return [row[0], Number(row[1])]; }));
      localStorage.setItem('cv_calc_' + slug, JSON.stringify({ data: data, out: out }));
    }

    layout.setAttribute('aria-live', 'polite');

    var btnCalculate = qs('[data-action="calculate"]', layout);
    if (btnCalculate) btnCalculate.addEventListener('click', run);

    var btnReset = qs('[data-action="reset"]', layout);
    if (btnReset) {
      btnReset.addEventListener('click', function () {
        form.reset();
        primary.textContent = 'Enter values and calculate';
        sub.textContent = 'Detailed breakdown, charts, and tables will appear here.';
        setTable(table, [['Output', 'Waiting for input']]);
        chart.textContent = '';
      });
    }

    var btnSample = qs('[data-action="sample"]', layout);
    if (btnSample) btnSample.addEventListener('click', function () { fillSample(slug, form); run(); });

    var btnCopy = qs('[data-action="copy"]', layout);
    if (btnCopy) btnCopy.addEventListener('click', function () { copyText(primary.textContent + '\n' + sub.textContent); });

    var btnCsv = qs('[data-action="csv"]', layout);
    if (btnCsv) btnCsv.addEventListener('click', function () { exportTableCSV(table, slug + '.csv'); });

    var btnPrint = qs('[data-action="print"]', layout);
    if (btnPrint) btnPrint.addEventListener('click', function () { window.print(); });

    var btnShare = qs('[data-action="share"]', layout);
    if (btnShare) {
      btnShare.addEventListener('click', async function () {
        var url = new URL(location.href);
        var data = readForm(form);
        Object.keys(data).forEach(function (k) { if (data[k]) url.searchParams.set(k, data[k]); });
        try { if (navigator.share) await navigator.share({ title: document.title, url: url.toString() }); } catch (e) {}
        copyText(url.toString());
      });
    }

    var favoriteButton = document.createElement('button');
    favoriteButton.type = 'button';
    favoriteButton.className = 'button favorite-button';
    favoriteButton.setAttribute('data-action', 'favorite');
    favoriteButton.setAttribute('aria-pressed', 'false');
    favoriteButton.textContent = 'Save calculator';
    var actionRow = qs('.button-row', layout) || form;
    if (actionRow) actionRow.appendChild(favoriteButton);
    var titleNode = qs('.section-head h1');
    var toolMeta = { slug: slug, name: document.title || (titleNode && titleNode.textContent) || slug, url: location.pathname, category: getToolTheme(slug, location.pathname).label };
    updateFavoriteButton(slug, toolMeta.name, toolMeta.url, favoriteButton);
    favoriteButton.addEventListener('click', function () {
      var active = toggleFavoriteTool(toolMeta);
      updateFavoriteButton(slug, toolMeta.name, toolMeta.url, favoriteButton);
    });

    var params = new URLSearchParams(location.search);
    params.forEach(function (v, k) {
      var input = form.querySelector('[name="' + k + '"], [name="' + k.replace(/_/g, '-') + '"]');
      if (input) input.value = v;
    });
    if (params.toString()) run();
    addRecentTool(toolMeta);
  });

  function inferPageType() {
    var path = location.pathname.toLowerCase();
    if (/finance|money|loan|emi|investment|tax/.test(path)) return 'Finance';
    if (/health|medical|fitness|diet|body/.test(path)) return 'Health';
    if (/math|geometry|algebra|number|equation/.test(path)) return 'Math';
    if (/science|physics|chemistry|biology/.test(path)) return 'Science';
    return 'Calculator';
  }

  function injectSchema() {
    if (document.getElementById('site-schema')) return;
    var description = document.querySelector('meta[name="description"]');
    var schema = [];
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Calculator Pro AI',
      url: location.origin + '/',
      description: description ? description.getAttribute('content') : 'A searchable collection of AI-enhanced calculators for finance, health, science, and everyday planning.',
      inLanguage: 'en',
      potentialAction: {
        '@type': 'SearchAction',
        target: location.origin + '/search.html?q={search_term_string}',
        'query-input': 'required name=search_term_string'
      }
    });
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: document.title || 'Calculator Pro AI',
      url: location.origin + location.pathname,
      description: description ? description.getAttribute('content') : 'AI-assisted calculator page.',
      inLanguage: 'en',
      isPartOf: { '@id': location.origin + '/#website' },
      about: { '@type': 'Thing', name: inferPageType() }
    });

    var breadcrumbs = qsa('.breadcrumbs a').map(function (link, index) {
      return { '@type': 'ListItem', position: index + 1, name: link.textContent.trim(), item: location.origin + link.getAttribute('href') };
    });
    if (breadcrumbs.length) {
      schema.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs
      });
    }

    var faqItems = qsa('details .faq-question, details h3, details summary').map(function (item) {
      var question = item.textContent.trim();
      var answer = '';
      var panel = item.closest('details');
      if (panel) {
        var body = panel.querySelector('p');
        answer = body ? body.textContent.trim() : '';
      }
      return { question: question, answer: answer };
    }).filter(function (item) { return item.question && item.answer; });
    if (faqItems.length) {
      schema.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map(function (item) {
          return {
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', 'text': item.answer }
          };
        })
      });
    }

    var script = document.createElement('script');
    script.id = 'site-schema';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  injectSchema();
})();
