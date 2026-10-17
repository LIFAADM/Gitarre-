import { Fragment, type ReactNode } from 'react';

/**
 * Sehr kleiner Markdown-Renderer für Lektionstexte:
 * `## Überschrift`, `- Listenpunkt`, `> Tipp`, `**fett**`, `*kursiv*`, Absätze durch Leerzeilen.
 */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('**')) parts.push(<strong key={`${keyPrefix}-${i++}`} className="text-text font-semibold">{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) parts.push(<code key={`${keyPrefix}-${i++}`} className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[0.9em] text-gold-soft">{token.slice(1, -1)}</code>);
    else parts.push(<em key={`${keyPrefix}-${i++}`}>{token.slice(1, -1)}</em>);
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let quote: string[] = [];
  let key = 0;
  const flushParagraph = (): void => {
    if (paragraph.length) {
      blocks.push(<p key={key++} className="text-[15px] leading-relaxed text-text/90">{inline(paragraph.join(' '), `p${key}`)}</p>);
      paragraph = [];
    }
  };
  const flushList = (): void => {
    if (list.length) {
      blocks.push(
        <ul key={key++} className="space-y-1.5 pl-1">
          {list.map((item, i) => (
            <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-text/90">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              <span>{inline(item, `li${key}-${i}`)}</span>
            </li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  const flushQuote = (): void => {
    if (quote.length) {
      blocks.push(
        <div key={key++} className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-[15px] leading-relaxed">
          {inline(quote.join(' '), `q${key}`)}
        </div>,
      );
      quote = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === '') {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      flushQuote();
      blocks.push(<h3 key={key++} className="pt-2 text-base font-bold text-gold">{line.slice(3)}</h3>);
      continue;
    }
    if (line.startsWith('- ')) {
      flushParagraph();
      flushQuote();
      list.push(line.slice(2));
      continue;
    }
    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      quote.push(line.slice(2));
      continue;
    }
    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  flushQuote();
  return (
    <div className={className ? `${className} space-y-3` : 'space-y-3'}>
      {blocks.map((b, i) => (
        <Fragment key={i}>{b}</Fragment>
      ))}
    </div>
  );
}
