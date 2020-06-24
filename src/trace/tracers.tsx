import type { HyperscriptApi } from 'sinuous/h';

// Must be an interface; type doesn't work for module augmentation
interface RenderStackFrame { name: string }

type El = Element | DocumentFragment | Node
type InstanceMeta = RenderStackFrame
type DataStore = {
  stack: RenderStackFrame[]
  tree: WeakMap<El, Set<El>>
  meta: WeakMap<El, InstanceMeta>
}

const ds: DataStore = {
  /** Functions write here during render. Data is moved to ds.meta after */
  stack: [],
  /** Tree of all connections (Components+Guards) */
  tree: new WeakMap(),
  /** Component metadata */
  meta: new WeakMap(),
};

// Note about ds.tree
// All connections between components and children are kept in ds.tree. Elements
// that aren't components but have children who are must also be in the tree so
// the component children can be re-parented to a parent component later on.
// Every component is in the tree, even those with no children.

const api = {} as HyperscriptApi;
const emptyFn = () => {};
// For sharing fragments between nested h() and add() calls
const refDF: DocumentFragment[] = [];

type hTracer = typeof api.h & { onCreate(fn: () => El, el: El): void }
const h: hTracer = (...args) => {
  const fn = args[0] as () => El;
  if (typeof fn !== 'function') {
    const retH = api.h(...args);
    if (retH instanceof DocumentFragment) refDF.push(retH);
    return retH;
  }
  const renderData = { name: fn.name } as RenderStackFrame;
  ds.stack.push(renderData);
  const el = api.h(...args);
  ds.stack.pop();

  // Not Element or DocumentFragment
  if (!(el instanceof Node)) return el;

  // Elements will already be in the tree if they had any children
  if (!ds.tree.has(el)) ds.tree.set(el, new Set<El>());

  // Register as a component
  ds.meta.set(el, renderData);

  h.onCreate(fn, el);
  return el;
};
h.onCreate = emptyFn;

// Sinuous' api.add isn't purely a subcall of api.h. If given an array, it will
// call api.h again to create a fragment (never returned). To see the fragment
// here, tracer.h sets refDF. It's empty since insertBefore() clears child nodes
type addTracer = typeof api.add & { onAttach(parent: El, child: El): void }
const add: addTracer = (parent: El, value: El, endMark) => {
  const ret = api.add(parent, value, endMark);
  if (Array.isArray(value) && refDF.length)
    value = refDF.pop() as DocumentFragment;
  if (!(value instanceof Node)) {
    return ret;
  }
  const searchForAdoptiveParent = (children: Set<El>) => {
    let cursor: El | null = parent;
    // eslint-disable-next-line no-cond-assign
    while (cursor = cursor.parentElement) {
      const c = ds.tree.get(cursor);
      if (c) return children.forEach(x => c.add(x));
    }
    // Didn't find a suitable parent walking up tree. Default to <body/>
    const body = ds.tree.get(document.body);
    if (body) children.forEach(x => body.add(x));
    else ds.tree.set(document.body, children);
  };
  const parentChildren = ds.tree.get(parent);
  const valueChildren = ds.tree.get(value);
  // If <Any><-El, no action
  // If inTree<-Comp, parent also guards val
  // If inTree<-Guard, parent also guards val's children and val is no longer a guard
  // If El<-Comp, parent is now a guard of val
  // If El<-Guard, parent is now a guard of val's children and val is no longer a guard
  if (!valueChildren) return ret;

  const valueComp = ds.meta.has(value);
  if (parentChildren) {
    if (valueComp)
      parentChildren.add(value);
    else
      valueChildren.forEach(x => parentChildren.add(x));
  } else {
    const children = valueComp ? new Set([value]) : valueChildren;
    if (!parent.parentElement || parent === document.body)
      ds.tree.set(parent, children);
    else
    // Value is being added to a connected tree. Look for a ds.tree parent
      searchForAdoptiveParent(children);
  }
  add.onAttach(parent, value);
  // Delete _after_ attaching. Value wasn't a component
  if (!valueComp) ds.tree.delete(value);
  return ret;
};
add.onAttach = emptyFn;

type rmTracer = typeof api.rm & { onDetach(parent: El, child: El): void }
const rm: rmTracer = (parent, start, end) => {
  const children = ds.tree.get(parent as El);
  if (children)
    for (let c: Node | null = start; c && c !== end; c = c.nextSibling) {
      children.delete(c);
      rm.onDetach(parent, c);
    }
  return api.rm(parent, start, end);
};
rm.onDetach = emptyFn;

// Avoid writing tracers wrapper functions by swapping out the api on load
type Tracers = { h: hTracer, add: addTracer, rm: rmTracer };
const setup = (live: HyperscriptApi): Tracers => {
  api.h = live.h;
  live.h = h;

  api.add = live.add;
  live.add = add;

  api.rm = live.rm;
  live.rm = rm;

  return { h, add, rm };
};

const tree = { ds, setup };

export { El, RenderStackFrame, InstanceMeta, Tracers }; // Types
export { tree, ds };
