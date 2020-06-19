import { ds } from './ds.js';

/** Return a pretty printed string for debugging */
const log = (x: unknown, subcall?: boolean): string => {
  if (Array.isArray(x)) {
    if (subcall) return 'Array[...]';
    return x.length <= 3
      ? `Array[${x.map(n => log(n, true)).join(',')}]`
      : `Array[${x.slice(0, 3).map(n => log(n, true)).join(',')},+${x.length - 3}]`;
  }

  if (x instanceof Element || x instanceof DocumentFragment) {
    let str = '';
    const isComp = ds.meta.get(x);
    const isGuard = ds.tree.get(x) && !isComp;
    if (isComp) {
      str = `<${isComp.fn.name}/>`;
    } else {
      const elName = x instanceof Element
        ? `<${x.tagName.toLowerCase()}>`
        : '[Fragment]';
      str = isGuard
        ? `Guard${elName}`
        : elName;
    }
    const isAttached = !subcall && typeof window !== 'undefined' && document.body.contains(x);
    if (isAttached) str = `📶${str}`;

    if (subcall || x.childNodes.length === 0) return str;
    const c = Array.from(x.childNodes);
    return c.length <= 3
      ? `${str}[${c.map(n => log(n, true)).join(',')}]`
      : `${str}[${c.slice(0, 3).map(n => log(n, true)).join(',')},+${c.length - 3}]`;
  }
  const str = (s: string) => {
    s = s.trim();
    return s.length <= 10
      ? `"${s}"`
      : `"${s.slice(0, 10)}"+${s.length - 10}`;
  };
  if (x instanceof Text) {
    if (!x.textContent) return '';
    return str(x.textContent);
  }
  if (typeof x === 'undefined')
    return '∅';

  if (typeof x === 'function')
    return '$o' in x
      ? '[Observable]'
      : '[Function]';

  // Try to show a startMark (key is minified)
  const o = x as Record<string, unknown>;
  const k = Object.keys(o);
  if (k.length === 1 && o[k[0]] instanceof Text)
    return '[StartMark]';

  // Default to [object DataType]
  return str(String(x));
};

export { log };
