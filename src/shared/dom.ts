/**
 * Tiny DOM helpers used by the popup and options pages.
 *
 * Deliberately avoids innerHTML / outerHTML / insertAdjacentHTML so the bundle
 * stays clean of patterns the AMO linter flags. SVG icons are built with
 * createElementNS for the same reason.
 */

type Style = Partial<CSSStyleDeclaration>;
type Attrs = Record<string, unknown>;
export type Child = Node | string | number | null | undefined | false;

/**
 * Build an HTML element with attributes, styles, and children.
 *
 * - `style: {...}` is applied via Object.assign to el.style (no innerHTML risk).
 * - `class: '...'` or `className: '...'` sets className.
 * - `on<Event>: fn` registers an event listener (e.g. `onclick`, `oninput`).
 * - Any other key is set via setAttribute, except boolean DOM props
 *   (`checked`, `disabled`, `value`) which are set on the element directly.
 * - Children may be Nodes, strings (auto-wrapped in text nodes), numbers,
 *   or nullish (skipped).
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Child[] | Child = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const key of Object.keys(attrs)) {
    const v = attrs[key];
    if (v == null || v === false) continue;
    if (key === 'style' && typeof v === 'object') {
      Object.assign(node.style, v as Style);
    } else if (key === 'class' || key === 'className') {
      node.className = String(v);
    } else if (key === 'text') {
      node.textContent = String(v);
    } else if (key.startsWith('on') && typeof v === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), v as EventListener);
    } else if (key === 'checked' || key === 'disabled' || key === 'value' || key === 'selected') {
      // Native boolean / value props belong on the element, not the attribute.
      (node as unknown as Record<string, unknown>)[key] = v;
    } else {
      node.setAttribute(key, String(v));
    }
  }
  appendChildren(node, Array.isArray(children) ? children : [children]);
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Build an SVG element. Same shape as `el` but uses createElementNS so it
 * lands in the SVG namespace.
 */
export function svg(
  tag: string,
  attrs: Attrs = {},
  children: Child[] | Child = [],
): SVGElement {
  const node = document.createElementNS(SVG_NS, tag) as SVGElement;
  for (const key of Object.keys(attrs)) {
    const v = attrs[key];
    if (v == null || v === false) continue;
    if (key === 'style' && typeof v === 'object') {
      Object.assign((node as unknown as { style: CSSStyleDeclaration }).style, v as Style);
    } else {
      node.setAttribute(key, String(v));
    }
  }
  appendChildren(node, Array.isArray(children) ? children : [children]);
  return node;
}

/** Remove every child from a node. */
export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Mount/replace: clear `parent` then append `node`. */
export function mount(parent: Node, node: Node): void {
  clear(parent);
  parent.appendChild(node);
}

function appendChildren(parent: Node, children: Child[]): void {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (typeof c === 'string' || typeof c === 'number') {
      parent.appendChild(document.createTextNode(String(c)));
    } else {
      parent.appendChild(c);
    }
  }
}
