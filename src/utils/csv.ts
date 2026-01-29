export const buildCsv = (rows: Record<string, string | number | null | undefined>[]) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    const line = headers
      .map((key) => {
        const raw = row[key];
        const value = raw === null || raw === undefined ? "" : String(raw);
        const escaped = value.includes(",") || value.includes("\n") ? `"${value.replace(/"/g, '""')}"` : value;
        return escaped;
      })
      .join(",");
    lines.push(line);
  });
  return lines.join("\n");
};

export const parseCsv = (content: string) => {
  const cleaned = content.trim();
  if (!cleaned) return [] as Record<string, string>[];
  const normalized = cleaned.replace(/;+/g, ",");
  const lines = normalized.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = cells[idx] || "";
    });
    return record;
  });
};
