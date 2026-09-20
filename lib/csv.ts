export function csvDownload(name: string, rows: unknown[][]) {
  const safe = (value: unknown) =>
    '"' +
    String(value ?? "")
      .replace(/^[\s]*[=+@-]/, "'")
      .replaceAll('"', '""') +
    '"';
  const text = "\ufeff" + rows.map((r) => r.map(safe).join(";")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
