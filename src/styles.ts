import { decl, css, injectGlobal } from 'styletakeout.macro';

declare module 'styletakeout.macro' {
  // It's not important to be able to see the value so use string to simplify
  // Numbers can't be object property names without ['100'] so prefix with 'c'
  type ColorScale = {
    [key in
      | 'c100'
      | 'c200'
      | 'c300'
      | 'c400'
      | 'c500'
      | 'c600'
      | 'c700'
      | 'c800'
      | 'c900']: string
  }
  interface Decl {
    // Remember that TS definitions are entirely for linting/intellisense
    // Values aren't real. Pick anything that helps you remember
    pageBackground: 'purple.100'
    bodyBackground: '#eee'
    color: {
      black: string
      white: string
      gray: ColorScale
      red: ColorScale
      orange: ColorScale
      yellow: ColorScale
      green: ColorScale
      teal: ColorScale
      blue: ColorScale
      indigo: ColorScale
      purple: ColorScale
      pink: ColorScale
    }
    size: {
      // Without the leading 0 autocomplete will order them wrong
      // Prefix with 's' for same reason as 'c'
      s00: '0'
      s01: '0.25re'
      s02: '0.5rem'
      s03: '0.75re'
      s04: '1rem'
      s05: '1.25re'
      s06: '1.5rem'
      s08: '2rem'
      s10: '2.5rem'
      s12: '3rem'
      s16: '4rem'
      s20: '5rem'
      s24: '6rem'
      s32: '8rem'
      s40: '10rem'
      s48: '12rem'
      s56: '14rem'
      s64: '16rem'
    }
  }
}

injectGlobal`
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    background-color: ${decl.bodyBackground};
    font-family: 'system-ui', sans-serif;
  }
  /* Text and sizing */
  .text-xs   { font-size: 0.75rem ; }
  .text-sm   { font-size: 0.875rem; }
  .text-base { font-size: 1rem    ; }
  .text-lg   { font-size: 1.125rem; }
  .text-xl   { font-size: 1.25rem ; }
  .text-2xl  { font-size: 1.5rem  ; }
  .text-3xl  { font-size: 1.875rem; }
  .text-4xl  { font-size: 2.25rem ; }
  .text-5xl  { font-size: 3rem    ; }
  .text-6xl  { font-size: 4rem    ; }
`;

const Page = css`
  background-color: ${decl.pageBackground};
  margin-bottom: 5px;
  padding: ${decl.size.s08};
  max-width: 800px;

  > * {
    margin-bottom: ${decl.size.s02};
  }
`;

const Link = css`
  color: ${decl.color.blue.c400};
  &:hover {
    color: ${decl.color.blue.c500};
    text-decoration: underline;
  }
`;

const DashBorder = css`
  border: 2px dashed ${decl.color.blue.c500};
`;

const styles = {
  Page,
  Link,
  DashBorder,
};

export { styles };
