import { Fragment } from "react";
function inline(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^\s)]+\))/g)
    .map((s, i) => {
      if (s.startsWith("**") && s.endsWith("**"))
        return <strong key={i}>{s.slice(2, -2)}</strong>;
      if (s.startsWith("*") && s.endsWith("*"))
        return <em key={i}>{s.slice(1, -1)}</em>;
      const link = s.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link && /^(https:\/\/|\/(?!\/))/.test(link[2]))
        return (
          <a key={i} href={link[2]} rel="noreferrer">
            {link[1]}
          </a>
        );
      return <Fragment key={i}>{s}</Fragment>;
    });
}
export default function FormattedText({ text }: { text: string }) {
  return (
    <div className="formatted-text">
      {text.split(/\n\n+/).map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^[-*] /.test(l)))
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.slice(2))}</li>
              ))}
            </ul>
          );
        if (lines.every((l) => /^\d+\. /.test(l)))
          return (
            <ol key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\d+\. /, ""))}</li>
              ))}
            </ol>
          );
        return (
          <p key={i}>
            {lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
