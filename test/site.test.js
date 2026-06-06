const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

function loadSiteScript(engine = 'emi', slug = 'emi-calculator', formHtml = `
            <input type="number" name="loan-amount" value="1000000" />
            <input type="number" name="interest-rate" value="9" />
            <input type="number" name="tenure-months-years" value="20" />
            <input type="number" name="processing-fee" value="1" />
          `) {
  const dom = new JSDOM(`
    <!doctype html>
    <html>
      <body>
        <button id="themeToggle"></button>
        <select id="languagePref"></select>
        <select id="unitPref"></select>
        <select id="categoryJump"></select>
        <input id="globalSearch" />
        <div id="searchSuggestions"></div>
        <input id="heroSearch" />
        <div id="heroSuggestions"></div>
        <div class="calc-layout" data-engine="${engine}" data-page-slug="${slug}">
          <form class="calc-form">
          ${formHtml}
          </form>
          <div data-result-primary></div>
          <div data-result-sub></div>
          <div data-chart-area></div>
          <table data-result-table><tbody></tbody></table>
          <button type="button" data-action="calculate"></button>
          <button type="button" data-action="reset"></button>
          <button type="button" data-action="sample"></button>
          <button type="button" data-action="copy"></button>
          <button type="button" data-action="csv"></button>
          <button type="button" data-action="print"></button>
          <button type="button" data-action="share"></button>
        </div>
      </body>
    </html>
  `, { url: 'https://example.test/finance-money/emi-calculator/', runScripts: 'dangerously', resources: 'usable' });

  const script = fs.readFileSync(path.join(__dirname, '..', 'assets', 'site.js'), 'utf8');

  dom.window.CALC_SEARCH_DATA = [];
  dom.window.localStorage.clear();
  const context = dom.getInternalVMContext();
  context.window = dom.window;
  context.document = dom.window.document;
  context.localStorage = dom.window.localStorage;
  context.navigator = dom.window.navigator;
  context.URL = dom.window.URL;
  context.FormData = dom.window.FormData;
  context.Blob = dom.window.Blob;
  context.FileReader = dom.window.FileReader;
  context.crypto = dom.window.crypto;
  context.performance = dom.window.performance;
  context.history = dom.window.history;
  context.location = dom.window.location;
  context.getComputedStyle = dom.window.getComputedStyle;
  context.CustomEvent = dom.window.CustomEvent;
  context.Event = dom.window.Event;
  context.HTMLElement = dom.window.HTMLElement;
  context.Node = dom.window.Node;
  context.HTMLInputElement = dom.window.HTMLInputElement;
  context.HTMLButtonElement = dom.window.HTMLButtonElement;
  context.HTMLSelectElement = dom.window.HTMLSelectElement;
  context.HTMLTableElement = dom.window.HTMLTableElement;
  context.HTMLFormElement = dom.window.HTMLFormElement;
  context.requestAnimationFrame = dom.window.requestAnimationFrame;
  context.cancelAnimationFrame = dom.window.cancelAnimationFrame;
  context.setTimeout = dom.window.setTimeout;
  context.clearTimeout = dom.window.clearTimeout;
  context.setInterval = dom.window.setInterval;
  context.clearInterval = dom.window.clearInterval;
  context.alert = dom.window.alert;
  context.confirm = dom.window.confirm;
  context.prompt = dom.window.prompt;
  context.console = console;
  context.eval(script);

  return { dom, script };
}

test('emi calculator page uses finance logic from the engine tag', () => {
  const { dom } = loadSiteScript();
  const button = dom.window.document.querySelector('[data-action="calculate"]');
  button.click();

  const primary = dom.window.document.querySelector('[data-result-primary]').textContent;
  assert.match(primary, /Monthly payment:/);
});

test('bmi calculator page uses health logic from the engine tag', () => {
  const { dom } = loadSiteScript('bmi', 'bmi-calculator', `
    <input type="number" name="weight" value="70" />
    <input type="number" name="height" value="175" />
    <input type="number" name="age" value="30" />
  `);
  const button = dom.window.document.querySelector('[data-action="calculate"]');
  button.click();

  const primary = dom.window.document.querySelector('[data-result-primary]').textContent;
  assert.match(primary, /BMI:/);
});
