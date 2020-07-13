import { createMacro } from 'babel-plugin-macros';
import * as t from '@babel/types';
import { stripIndent } from 'common-tags';
import * as fs from 'fs';
import * as path from 'path';

import type { MacroHandler } from 'babel-plugin-macros';

/** CSS classes start with this: i.e `css-index.tsx#32:16` */
const classPrefix = 'css-';
/** Indent string for extracted CSS classes */
const cssIndent = '  ';
/** Path to CSS output file */
const outFile = 'serve/takeout.css';

const injectGlobalSnippets: string[] = [];
const cssSnippets: string[] = [];

let processExitHook = () => {};
process.on('exit', () => processExitHook());

const mergeTemplateExpression = (node: t.TaggedTemplateExpression): string => {
  let string = '';
  const { quasis, expressions } = node.quasi;
  for (let i = 0; i < expressions.length; i++) {
    string += quasis[i].value.raw;
    string += expressions[i];
  }
  // There's always one more `quasis` than `expressions`
  string += quasis[quasis.length - 1].value.raw;
  return stripIndent(string);
};

const styleTakeoutMacro: MacroHandler = ({ references, state }) => {
  const { injectGlobal, css } = references;
  if (injectGlobal) injectGlobal.forEach(referencePath => {
    const { parentPath } = referencePath;
    const { node } = parentPath;
    if (!t.isTaggedTemplateExpression(node)) {
      throw new Error(`Expected "injectGlobal" to be a TagTemplateExpression instead was "${node.type}"`);
    }
    const styles = mergeTemplateExpression(node);
    // TODO: Do stylis work with global namespace plugin
    injectGlobalSnippets.push(styles);

    // XXX: Why? Need to see the AST
    parentPath.remove();
  });
  if (css) css.forEach(referencePath => {
    const { parentPath } = referencePath;
    const { node } = parentPath;
    if (!t.isTaggedTemplateExpression(node)) {
      throw new Error(`Expected "css" to be a TagTemplateExpression instead was "${node.type}"`);
    }
    if (!node.loc) {
      throw new Error('Node didn\'t have location info as "node.loc"');
    }
    const { filename } = state;
    const { line, column } = node.loc.start;
    const tag = `${path.basename(filename)}#${line}:${column}`;
    const tagSafe = tag.replace(/([.#:])/g, (_, match) => `\\${match}`);

    const styles = mergeTemplateExpression(node);
    // TODO: Do stylis work with autogenerated class name

    const indentedStyles = cssIndent + styles.replace(/\n/g, `\n${cssIndent}`);
    cssSnippets.push(`.${tagSafe} {\n${indentedStyles}\n}`);

    parentPath.replaceWith(t.stringLiteral(`${classPrefix}${tag}`));
  });

  processExitHook = () => {
    const total = injectGlobalSnippets.length + cssSnippets.length;
    console.log(`Moved ${total} snippets of CSS into:`, outFile);
    // Add last newline
    injectGlobalSnippets.push('');
    cssSnippets.push('');
  fs.writeFileSync(outFile, injectGlobalSnippets.join('\n'));
  fs.appendFileSync(outFile, cssSnippets.join('\n'));
};
};

// Since `createMacro` is typed as `() => any`...
export function css(statics: TemplateStringsArray, ...variables: string[]): string { return ''; }
export function injectGlobal(statics: TemplateStringsArray, ...variables: string[]): void {}

export default createMacro(styleTakeoutMacro);
