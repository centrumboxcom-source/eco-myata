"use client";
import { useRef, useState } from "react";
import FormattedText from "./formatted-text";
export default function TextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  function format(before: string, after = "") {
    const el = ref.current;
    if (!el) return;
    const a = el.selectionStart,
      b = el.selectionEnd;
    onChange(
      value.slice(0, a) + before + value.slice(a, b) + after + value.slice(b),
    );
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + before.length, b + before.length);
    });
  }
  return (
    <div className="text-editor">
      <div className="editor-toolbar">
        {[
          ["B", "**", "**"],
          ["I", "*", "*"],
          ["• Список", "\n- ", ""],
          ["1. Список", "\n1. ", ""],
          ["Посилання", "[", "](/catalog)"],
        ].map(([label, a, b]) => (
          <button
            key={label}
            type="button"
            disabled={preview}
            onClick={() => format(a, b)}
          >
            {label}
          </button>
        ))}
        <button type="button" onClick={() => setPreview(!preview)}>
          {preview ? "Редагувати" : "Перегляд"}
        </button>
      </div>
      {preview ? (
        <div className="text-preview">
          <FormattedText text={value} />
        </div>
      ) : (
        <textarea
          ref={ref}
          rows={7}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Опис товару"
        />
      )}
    </div>
  );
}
