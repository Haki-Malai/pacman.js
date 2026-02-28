type SelectorMatcher = (_element: FakeElement) => boolean;

function toTokens(value: string): string[] {
  return value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function createSelectorMatcher(selector: string): SelectorMatcher {
  const trimmed = selector.trim();

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    const equalsIndex = inner.indexOf('=');

    if (equalsIndex === -1) {
      const attributeName = inner;
      return (element) => element.getAttribute(attributeName) !== null;
    }

    const attributeName = inner.slice(0, equalsIndex).trim();
    const rawValue = inner.slice(equalsIndex + 1).trim();
    const attributeValue = rawValue.replace(/^['"]|['"]$/g, '');
    return (element) => element.getAttribute(attributeName) === attributeValue;
  }

  const tagName = trimmed.toLowerCase();
  return (element) => element.tagName === tagName;
}

function collectMatches(root: FakeElement, matcher: SelectorMatcher, matches: FakeElement[]): void {
  for (const child of root.children) {
    if (matcher(child)) {
      matches.push(child);
    }
    collectMatches(child, matcher, matches);
  }
}

export class FakeClassList {
  constructor(private readonly owner: FakeElement) {}

  add(...tokens: string[]): void {
    tokens.forEach((token) => this.owner.addClassToken(token));
  }

  remove(...tokens: string[]): void {
    tokens.forEach((token) => this.owner.removeClassToken(token));
  }

  contains(token: string): boolean {
    return this.owner.hasClassToken(token);
  }

  toggle(token: string, force?: boolean): boolean {
    const shouldAdd = force ?? !this.contains(token);
    if (shouldAdd) {
      this.add(token);
    } else {
      this.remove(token);
    }
    return shouldAdd;
  }
}

export class FakeElement {
  private readonly classTokens = new Set<string>();
  private readonly attributes = new Map<string, string>();

  readonly children: FakeElement[] = [];
  readonly classList: FakeClassList;
  readonly style: Record<string, string> = {};
  parentElement: FakeElement | null = null;
  textContent = '';
  src = '';
  alt = '';

  constructor(readonly tagName: string) {
    this.classList = new FakeClassList(this);
  }

  get className(): string {
    return [...this.classTokens].join(' ');
  }

  set className(value: string) {
    this.classTokens.clear();
    toTokens(value).forEach((token) => this.classTokens.add(token));
  }

  append(...nodes: Array<FakeElement | string>): void {
    nodes.forEach((node) => {
      if (typeof node === 'string') {
        this.textContent += node;
        return;
      }
      this.appendChild(node);
    });
  }

  appendChild(node: FakeElement): FakeElement {
    node.parentElement?.removeChild(node);
    node.parentElement = this;
    this.children.push(node);
    return node;
  }

  replaceChildren(...nodes: FakeElement[]): void {
    this.children.forEach((child) => {
      child.parentElement = null;
    });
    this.children.length = 0;
    nodes.forEach((node) => {
      this.appendChild(node);
    });
  }

  remove(): void {
    this.parentElement?.removeChild(this);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  querySelector(selector: string): FakeElement | null {
    const matcher = createSelectorMatcher(selector);
    const matches: FakeElement[] = [];
    collectMatches(this, matcher, matches);
    return matches[0] ?? null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const matcher = createSelectorMatcher(selector);
    const matches: FakeElement[] = [];
    collectMatches(this, matcher, matches);
    return matches;
  }

  addClassToken(token: string): void {
    if (token) {
      this.classTokens.add(token);
    }
  }

  removeClassToken(token: string): void {
    this.classTokens.delete(token);
  }

  hasClassToken(token: string): boolean {
    return this.classTokens.has(token);
  }

  private removeChild(node: FakeElement): void {
    const index = this.children.indexOf(node);
    if (index === -1) {
      return;
    }
    this.children.splice(index, 1);
    node.parentElement = null;
  }
}

export class FakeDocument {
  readonly body = new FakeElement('body');

  createElement(tagName: string): FakeElement {
    return new FakeElement(tagName.toLowerCase());
  }

  querySelector(selector: string): FakeElement | null {
    return this.body.querySelector(selector);
  }
}
