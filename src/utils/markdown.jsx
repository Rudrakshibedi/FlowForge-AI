import React from "react";

/**
 * Minimal Markdown renderer covering exactly what the backend's
 * markdown_generator / dict_to_markdown_sections tools produce: headings
 * (#, ##, ###), bullet lists (- item), bold (**text**), inline code
 * (`code`), and plain paragraphs. Deliberately dependency-free — this is a
 * developer-facing artifact preview, not a general-purpose Markdown engine.
 */

function renderInline(text, keyPrefix) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${keyPrefix}-${i}`}
          className="px-1 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[0.85em] font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>;
  });
}

export function renderMarkdown(markdown) {
  if (!markdown) return null;

  const lines = String(markdown).replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let listBuffer = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    const items = listBuffer;
    listBuffer = [];
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1 my-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed">
            {renderInline(item, `li-${blocks.length}-${i}`)}
          </li>
        ))}
      </ul>
    );
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const Tag = level === 1 ? "h1" : level === 2 ? "h2" : level === 3 ? "h3" : "h4";
      const sizeClass =
        level === 1
          ? "text-lg font-bold mt-4 mb-2"
          : level === 2
          ? "text-base font-semibold mt-4 mb-1.5"
          : "text-sm font-semibold mt-3 mb-1 text-slate-700 dark:text-slate-300";
      blocks.push(
        <Tag key={idx} className={sizeClass}>
          {renderInline(heading[2], `h-${idx}`)}
        </Tag>
      );
      return;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      listBuffer.push(bullet[1]);
      return;
    }

    flushList();

    if (line.trim() === "") {
      return;
    }

    blocks.push(
      <p key={idx} className="text-sm leading-relaxed my-1.5">
        {renderInline(line, `p-${idx}`)}
      </p>
    );
  });

  flushList();
  return <div className="prose-sm max-w-none">{blocks}</div>;
}
