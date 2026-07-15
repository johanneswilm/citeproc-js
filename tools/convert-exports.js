#!/usr/bin/env node
/**
 * Convert bare side-effect imports (import './foo') to named exports.
 * Processes each file, finds top-level CSL.xxx assignments,
 * converts them to export declarations, and updates index.ts.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const CSL_IMPORT_REGEX = /^import\s*\{\s*CSL\s*\}\s*from\s['"]\.\.?\/csl['"];?/m;

function processFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf-8');
  const lines = source.split('\n');
  const result = [];
  const exports = new Map(); // name → { line, kind: 'const'|'function'|'class' }

  // If file has no CSL assignments or is already exporting, skip
  if (!source.includes('CSL.')) return null;

  // Check each line for CSL.xxx = ... patterns
  let converted = false;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      result.push(line);
      i++;
      continue;
    }

    // Match: CSL.xxx = function(...) { ... }
    // or: CSL.xxx = { ... }
    // or: CSL.xxx = [...]
    // or: CSL.xxx.prototype.method = ...
    // or: CSL.xxx.SUBCLASS = ...
    // or: CSL.xxx.yyy = ...

    // Complex cases need AST analysis. Let me handle them manually.
    result.push(line);
    i++;
  }

  return null; // TODO: implement properly
}

// Instead of complex AST, let me just do simple text replacements
// for the common patterns
function convertSimplePatterns(filePath) {
  let source = fs.readFileSync(filePath, 'utf-8');
  const basename = path.basename(filePath, '.ts');
  const oldLines = source.split('\n');
  const newLines = [];
  const allExports = [];

  let i = 0;
  while (i < oldLines.length) {
    const line = oldLines[i];
    const trimmed = line.trim();

    // Skip comments and type declarations
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || 
        trimmed.startsWith('import') || trimmed.startsWith('///') || trimmed.startsWith('/*global')) {
      newLines.push(line);
      i++;
      continue;
    }

    // Handle multi-line CSL.xxx = function/y
  
    // Try to find CSL. values at module scope (no indentation or 4-space indent for module scope)
    if (/^\s*CSL\.\w+\s*[=:]/.test(trimmed) || /^\s*CSL\.\w+\.\w+\s*[=:]/.test(trimmed)) {
      // Find the full statement (might span multiple lines)
      let stmtLines = [line];
      let j = i + 1;
      // Count braces to find end of statement
      let braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      while (j < oldLines.length && braceCount > 0) {
        const next = oldLines[j];
        stmtLines.push(next);
        braceCount += (next.match(/{/g) || []).length;
        braceCount -= (next.match(/}/g) || []).length;
        j++;
      }
      i = j;
      const stmt = stmtLines.join('\n');

      // Extract the CSL path
      const match = stmt.match(/^\s*CSL\.(\w+(?:\.\w+)*)\s*[=:]/);
      if (match) {
        const cslPath = match[1]; // e.g. "Node.group" or "DateParser"
        const exportName = cslPath.replace(/\./g, '_'); // e.g. "Node_group"
        const afterEquals = stmt.slice(stmt.indexOf('=') + 1).trim();

        // Determine export type
        if (afterEquals.startsWith('{') || afterEquals.startsWith('[')) {
          // Object/array literal — export const
          newLines.push(`export const ${exportName} = ${afterEquals}`);
        } else if (afterEquals.startsWith('function')) {
          // Function expression
          const fnMatch = afterEquals.match(/^function\s*(?:\w+)?\s*\(/);
          newLines.push(`export ${afterEquals}`);
        } else if (/^class\s/.test(afterEquals)) {
          newLines.push(`export ${afterEquals}`);
        } else if (/^new\s/.test(afterEquals)) {
          newLines.push(`export const ${exportName} = ${afterEquals}`);
        } else {
          // Other expression
          newLines.push(`export const ${exportName} = ${afterEquals}`);
        }
        
        allExports.push({ cslPath, exportName });
        converted = true;
      } else {
        newLines.push(line);
        i++;
      }
    } else if (/^\s*\}\s*$/.test(trimmed) && i > 0 && /^\s*CSL\./.test(oldLines[i-1])) {
      // Closing brace of a CSL assignment — skip, already handled
      newLines.push(line);
      i++;
    } else {
      newLines.push(line);
      i++;
    }
  }

  if (allExports.length === 0) return { file: filePath, exports: [] };

  // Check if file needs import { CSL } removed (no more runtime CSL references)
  const newSource = newLines.join('\n');
  const stillNeedsCSL = /\bCSL\./.test(newSource.replace(/^(import|export)/m, ''));

  let finalSource;
  if (!stillNeedsCSL) {
    // Remove the CSL import
    finalSource = newSource.replace(/^import\s*\{\s*CSL\s*\}\s*from\s.*csl.*;?\n?/m, '');
  } else {
    finalSource = newSource;
  }

  fs.writeFileSync(filePath, finalSource, 'utf-8');
  return { file: filePath, exports: allExports };
}

// Main
const srcDir = path.join(__dirname, '..', 'src');
const indexFile = path.join(srcDir, 'index.ts');

// Read index.ts to find all bare imports
let indexSource = fs.readFileSync(indexFile, 'utf-8');
const bareImports = [];
const indexLines = indexSource.split('\n');
for (const line of indexLines) {
  const m = line.match(/^import '\.\/(.+?)';$/);
  if (m) {
    bareImports.push(m[1]);
  }
}

console.log(`Found ${bareImports.length} bare imports in index.ts`);

const allNewImports = [];

for (const impPath of bareImports) {
  const fullPath = path.join(srcDir, impPath + '.ts');
  if (!fs.existsSync(fullPath)) {
    console.log(`  SKIP (not found): ${impPath}`);
    continue;
  }
  const result = convertSimplePatterns(fullPath);
  if (result && result.exports.length > 0) {
    allNewImports.push(result);
    console.log(`  CONVERT: ${impPath} → { ${result.exports.map(e => e.exportName).join(', ')} }`);
  } else {
    console.log(`  SKIP (no CSL exports): ${impPath}`);
  }
}

// Update index.ts
let newIndexLines = [];
for (const line of indexLines) {
  const m = line.match(/^import '\.\/(.+?)';$/);
  if (m) {
    const impPath = m[1];
    const result = allNewImports.find(r => {
      const rPath = path.relative(srcDir, r.file).replace(/\.ts$/, '');
      return rPath === impPath;
    });
    if (result && result.exports.length > 0) {
      const exportNames = result.exports.map(e => e.exportName).join(', ');
      const relPath = path.relative(srcDir, result.file).replace(/\.ts$/, '');
      newIndexLines.push(`import { ${exportNames} } from './${relPath}';`);
      for (const exp of result.exports) {
        newIndexLines.push(`CSL.${exp.cslPath} = ${exp.exportName};`);
      }
    } else {
      // Keep as-is if we couldn't convert
      newIndexLines.push(line);
    }
  } else {
    newIndexLines.push(line);
  }
}

fs.writeFileSync(indexFile, newIndexLines.join('\n'), 'utf-8');
console.log('\nUpdated index.ts');

// Verify
console.log('\nRunning tsc --noEmit...');
try {
  require('child_process').execSync('npx tsc --noEmit', { 
    cwd: path.join(__dirname, '..'), 
    stdio: 'inherit' 
  });
} catch (e) {
  console.log('tsc reported errors.');
}
