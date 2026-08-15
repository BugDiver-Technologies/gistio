/**
 * Jest transform for .gs files.
 *
 * Google Apps Script files have no module system. This transform wraps each
 * file so that Jest can require() it: top-level function and var declarations
 * are exported via module.exports AND assigned to global so test files can
 * call them as plain globals (matching how GAS executes them).
 */
module.exports = {
  process(sourceCode) {
    const names = new Set();

    // Collect top-level function declarations
    const fnRegex = /^function\s+(\w+)\s*\(/gm;
    let m;
    while ((m = fnRegex.exec(sourceCode)) !== null) names.add(m[1]);

    // Collect top-level var declarations
    const varRegex = /^var\s+(\w+)/gm;
    while ((m = varRegex.exec(sourceCode)) !== null) names.add(m[1]);

    const exports = [...names].map(n =>
      `try { module.exports.${n} = ${n}; global.${n} = ${n}; } catch(_) {}`
    ).join('\n');

    return { code: `${sourceCode}\n${exports}` };
  },
};
