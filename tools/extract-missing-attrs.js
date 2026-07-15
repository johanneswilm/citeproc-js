const fs = require('fs');
const src = fs.readFileSync('/dev/stdin', 'utf8');
const missing = [
    'default-locale', 'default-locale-sort', 'demote-non-dropping-particle',
    'display', 'entry-spacing', 'if-short', 'initialize-with-hyphen',
    'institution-parts', 'katakana-display', 'near-note-distance',
    'page-range-format', 'reverse-order', 'stop-first', 'stop-last',
    'substitute-use-first', 'substring', 'text-case', 'use-first',
    'use-last', 'year-range-format'
];
for (const attr of missing) {
    const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rex = new RegExp(
        'CSL\\.Attributes\\["@' + escaped + '"\\]\\s*=\\s*function\\([^)]+\\)\\s*\\{[^}]+\\};',
        'm'
    );
    const m = src.match(rex);
    if (m) {
        console.log(m[0].replace(/^CSL\.Attributes/, 'Attributes'));
        console.log('');
    } else {
        console.log('// NOT FOUND via simple regex: @' + attr);
    }
}
