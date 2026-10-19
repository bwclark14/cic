/* =====================================================================
   CIC curriculum data: loading, parsing and shared helpers.
   Used by index.html (Curriculum Explorer) and planner.html (Teacher Learning Planner).
   ===================================================================== */

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTh6rBdn3GxwpFQtVpUwNr6ACdipDW-eDR7Diu9l_3DOkQ0hsTdMIMp8D0BETaGKxYk9pY5HM6ZbkWN/pub?gid=0&single=true&output=csv';

// Vocabulary definitions live on a second tab of the same published sheet.
const VOCAB_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTh6rBdn3GxwpFQtVpUwNr6ACdipDW-eDR7Diu9l_3DOkQ0hsTdMIMp8D0BETaGKxYk9pY5HM6ZbkWN/pub?gid=223106995&single=true&output=csv';

// Badge colours by level rank (0 = Early … 6+). Unknown levels fall back to slate.
const LEVEL_STYLES = [
    'bg-amber-100 text-amber-800 border-amber-300',
    'bg-emerald-100 text-emerald-800 border-emerald-300',
    'bg-teal-100 text-teal-800 border-teal-300',
    'bg-cyan-100 text-cyan-800 border-cyan-300',
    'bg-blue-100 text-blue-800 border-blue-300',
    'bg-indigo-100 text-indigo-800 border-indigo-300',
    'bg-violet-100 text-violet-800 border-violet-300'
];
const LEVEL_FALLBACK = 'bg-slate-100 text-slate-700 border-slate-300';

/* =====================================================================
   Generic helpers
   ===================================================================== */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const unique = arr => [...new Set(arr.filter(Boolean))];

function groupBy(list, keyFn) {
    const map = new Map();
    list.forEach(x => {
        const k = keyFn(x);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(x);
    });
    return map;
}

/* =====================================================================
   Level helpers
   ===================================================================== */
function levelRank(level) {
    const s = (level || '').toLowerCase();
    if (/early|foundation|reception|prep|\blevel 0\b/.test(s)) return 0;
    const ordinals = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, senior: 7 };
    for (const [word, rank] of Object.entries(ordinals)) if (s.includes(word)) return rank;
    const n = s.match(/\d+/);
    return n ? parseInt(n[0], 10) : 100;
}

const compareLevels = (a, b) =>
    levelRank(a) - levelRank(b) || a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

function levelClass(level) {
    const rank = levelRank(level);
    if (rank >= 100) return LEVEL_FALLBACK;
    return LEVEL_STYLES[Math.min(rank, LEVEL_STYLES.length - 1)];
}

/* =====================================================================
   Text helpers (Know / Do / Notes)
   ===================================================================== */
// Splits on full stops (followed by space/end) and line breaks; returns tidy sentences.
function toBullets(text) {
    return String(text || '')
        .split(/\.(?=\s|$)|\n+/)
        .map(s => s.replace(/^\s*[:–—-]\s*/, '').trim())
        .filter(Boolean)
        .map(s => (/[.!?]$/.test(s) ? s : s + '.'));
}

// Splits a notes string into headed blocks on "Includes", "Excludes", "Notes" etc.
function parseNotes(text) {
    if (!text) return [];
    const re = /\b(includes but not limited to|inludes but not limited to|includes|excludes|notes)\b/gi;
    const cap = w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    const blocks = [];
    const push = (heading, body) => {
        const bullets = toBullets(body);
        if (bullets.length) blocks.push({ heading, bullets });
    };
    let last = 0, heading = '', m;
    while ((m = re.exec(text))) {
        push(heading, text.slice(last, m.index));
        heading = cap(m[1]);
        last = re.lastIndex;
    }
    push(heading, text.slice(last));
    return blocks.length ? blocks : [{ heading: '', bullets: [text.trim()] }];
}

// "a; b; c" -> ['a', 'b', 'c'] (trimmed, de-duplicated)
const splitList = text => unique(String(text || '').split(';').map(t => t.trim()));

// Free text -> paragraphs (one per line break).
const toParagraphs = text => String(text || '').split(/\r?\n+/).map(t => t.trim()).filter(Boolean);

// "Title https://x; https://y" -> [{ url, label, host }]. Only http(s) URLs become links.
function parseResources(text) {
    return splitList(text).map(entry => {
        const found = entry.match(/https?:\/\/[^\s<>"]+/i) || entry.match(/\bwww\.[^\s<>"]+/i);
        if (found) {
            const raw = found[0].replace(/[.,;:!?)\]]+$/, '');
            try {
                const url = new URL(/^https?:/i.test(raw) ? raw : 'https://' + raw);
                if (url.protocol === 'http:' || url.protocol === 'https:') {
                    const host = url.hostname.replace(/^www\./, '');
                    const label = entry.replace(found[0], '').replace(/[()\[\]]/g, ' ').replace(/^[\s:\-–—|,]+|[\s:\-–—|,]+$/g, '').trim();
                    return { url: url.href, label: label || host, host };
                }
            } catch (e) { /* not a valid URL: fall through to plain text */ }
        }
        return { url: '', label: entry, host: '' };
    });
}

// Vocabulary terms are matched to definitions case-insensitively, ignoring stray punctuation.
const normTerm = s => String(s || '').toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ')
    .replace(/^["'\u201c\u201d\s]+|["'\u201c\u201d.:,;\s]+$/g, '');

// Vocabulary sheet -> { normalisedTerm: [definitions] }. Finds the term/definition columns by header
// name, falls back to the first two columns, and copes with a sheet that has no header row.
function buildVocab(rows) {
    const map = Object.create(null);
    if (!rows.length) return map;
    const headers = rows[0].map(normaliseHeader);
    let termIdx = headers.findIndex(h => /\bterm\b|\bword\b|vocab/.test(h));
    let defIdx = headers.findIndex(h => /defin|meaning|description|explanation/.test(h));
    let start = 1;
    if (termIdx === -1 && defIdx === -1) { termIdx = 0; defIdx = 1; start = 0; }
    if (termIdx === -1) termIdx = [0, 1].find(i => i !== defIdx);
    if (defIdx === -1) defIdx = [1, 0].find(i => i !== termIdx);
    rows.slice(start).forEach(r => {
        const term = normTerm(r[termIdx]);
        const def = (r[defIdx] || '').trim();
        if (!term || !def) return;
        (map[term] = map[term] || []);
        if (!map[term].includes(def)) map[term].push(def);
    });
    return map;
}

function listHtml(list) {
    if (!list || !list.length) return '<p class="italic text-slate-400">None specified.</p>';
    return '<ul class="list-disc space-y-1 pl-4 leading-relaxed text-slate-700">' +
        list.map(b => `<li>${esc(b)}</li>`).join('') + '</ul>';
}

function knowDoHtml(item) {
    const block = (cls, icon, label, list) =>
        `<div class="rounded-xl border p-3 ${cls}">
            <p class="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"><i class="fa-solid ${icon}"></i>${label}</p>
            ${listHtml(list)}
         </div>`;
    return block('border-blue-100 bg-blue-50/60 text-blue-800', 'fa-brain', 'Know', item.knowList) +
           block('border-emerald-100 bg-emerald-50/60 text-emerald-800', 'fa-person-running', 'Do', item.doList);
}

/* =====================================================================
   CSV parsing
   ===================================================================== */
function parseCsv(text) {
    const rows = [];
    let row = [''];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i], next = text[i + 1];
        if (c === '"') {
            if (inQuotes && next === '"') { row[row.length - 1] += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
            row.push('');
        } else if ((c === '\r' || c === '\n') && !inQuotes) {
            if (c === '\r' && next === '\n') i++;
            rows.push(row);
            row = [''];
        } else {
            row[row.length - 1] += c;
        }
    }
    if (row.length > 1 || row[0] !== '') rows.push(row);
    return rows;
}

const normaliseHeader = h => h.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Works out which column holds which field. Each field lists matchers in priority order.
function mapColumns(rawHeaders) {
    const headers = rawHeaders.map(normaliseHeader);
    const find = (...tests) => {
        for (const test of tests) {
            const i = headers.findIndex(test);
            if (i !== -1) return i;
        }
        return -1;
    };
    const isSubSub = h => /sub\s*sub/.test(h);

    return {
        area:      find(h => h.includes('area'), h => /domain|subject|category/.test(h)),
        level:     find(h => /level|grade|stage/.test(h)),
        strand:    find(h => h.includes('strand') && !h.includes('sub')),
        subStrand: find(h => /sub\s*strand/.test(h) && !isSubSub(h)),
        subSub:    find(h => isSubSub(h) || /elaboration|focus/.test(h)),
        statement: find(h => /statement|understanding|overarching/.test(h)),
        know:      find(h => h === 'know' || h === 'knows', h => h.includes('know'), h => h.includes('content')),
        // Do statements come from the "Dos" field only.
        do:        find(h => h === 'dos', h => h === 'do', h => /^dos?\b/.test(h)),
        notes:     find(h => /note|comment|remark/.test(h)),
        vocab:     find(h => /vocab/.test(h)),
        deepDive:  find(h => /deep\s*dive/.test(h)),
        resources: find(h => /resource/.test(h))
    };
}

function buildItems(rows) {
    const warnings = [];
    if (rows.length < 2) return { items: [], warnings };

    const cols = mapColumns(rows[0]);
    // Positional fallbacks for the core columns if a header could not be matched.
    const fallback = { area: 0, level: 1, strand: 2, subStrand: 3, statement: 4, know: 5 };
    Object.entries(fallback).forEach(([k, i]) => { if (cols[k] === -1) cols[k] = i; });

    if (cols.do === -1) warnings.push('No "Dos" column was found in the sheet, so Do statements cannot be shown. Check the column header.');

    const items = rows.slice(1)
        .filter(r => r.some(c => c.trim()))
        .map((r, i) => {
            const get = idx => (idx >= 0 ? (r[idx] || '').trim() : '');
            const item = {
                id: i,
                area: get(cols.area) || 'General Area',
                level: get(cols.level) || 'General Level',
                strand: get(cols.strand) || 'General Strand',
                subStrand: get(cols.subStrand) || 'General Sub-Strand',
                subSubStrand: get(cols.subSub),
                statement: get(cols.statement),
                know: get(cols.know),
                do: get(cols.do),
                notes: get(cols.notes),
                vocab: get(cols.vocab),
                deepDive: get(cols.deepDive),
                resourcesRaw: get(cols.resources)
            };
            item.knowList = toBullets(item.know);
            item.doList = toBullets(item.do);
            item.hasNotes = item.notes.length > 0;
            item.noteBlocks = parseNotes(item.notes);
            item.vocabTerms = splitList(item.vocab);
            item.deepParas = toParagraphs(item.deepDive);
            item.resources = parseResources(item.resourcesRaw);
            item.hasMore = item.vocabTerms.length > 0 || item.deepParas.length > 0 || item.resources.length > 0;
            item.searchText = [item.area, item.level, item.strand, item.subStrand, item.subSubStrand,
                               item.statement, item.know, item.do, item.notes, item.vocab, item.deepDive,
                               item.resources.map(r => r.label).join(' ')].join(' ').toLowerCase();
            return item;
        });

    return { items, warnings };
}

/* =====================================================================
   Loading and identity
   ===================================================================== */

// Fetches a published-sheet CSV and returns its rows.
async function fetchCsvRows(url) {
const res = await fetch(url, { cache: 'no-store' });
if (!res.ok) throw new Error('HTTP status ' + res.status);
return parseCsv(await res.text());
}

// A key that identifies a curriculum record by its content, so saved plans survive
// rows being added, removed or re-ordered in the sheet.
const itemKey = i => [i.area, i.level, i.strand, i.subStrand, i.subSubStrand, i.statement].join('||');
