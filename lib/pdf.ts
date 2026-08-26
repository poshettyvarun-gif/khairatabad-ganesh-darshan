export type PassDetails = {
  bookingId: string;
  fullName: string;
  mobile: string;
  date: string;
  startTime: string;
  endTime: string;
  persons: number;
  approvedAt: string | null;
};

export type ReportRow = PassDetails & {
  username: string;
  email: string;
  status: string;
  createdAt: string;
};

const saffron = "#8f2f0c";
const gold = "#fbbf24";
const ink = "#2d221f";
const muted = "#70635d";
const encoder = new TextEncoder();

function ascii(value: unknown) {
  return String(value ?? "").normalize("NFKD").replace(/[^\x20-\x7e]/g, "?");
}

function escaped(value: unknown) {
  return ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function rgb(hex: string) {
  const value = hex.replace("#", "");
  return [0, 2, 4]
    .map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel.toFixed(3))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

function formatTime(value: string) {
  const [hourText, minute = "00"] = value.slice(0, 5).split(":");
  const hour = Number(hourText);
  return `${String(hour % 12 || 12).padStart(2, "0")}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

class Canvas {
  readonly commands: string[] = [];
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  fill(color: string) {
    this.commands.push(`${rgb(color)} rg`);
    return this;
  }

  stroke(color: string, width = 1) {
    this.commands.push(`${rgb(color)} RG ${width} w`);
    return this;
  }

  rect(x: number, y: number, width: number, height: number, color: string) {
    this.fill(color);
    this.commands.push(`${x} ${this.height - y - height} ${width} ${height} re f`);
    return this;
  }

  line(x1: number, y1: number, x2: number, y2: number, color: string, width = 1) {
    this.stroke(color, width);
    this.commands.push(`${x1} ${this.height - y1} m ${x2} ${this.height - y2} l S`);
    return this;
  }

  circle(x: number, y: number, radius: number, color: string) {
    const k = radius * 0.5522847498;
    const cy = this.height - y;
    this.fill(color);
    this.commands.push(`${x + radius} ${cy} m ${x + radius} ${cy + k} ${x + k} ${cy + radius} ${x} ${cy + radius} c ${x - k} ${cy + radius} ${x - radius} ${cy + k} ${x - radius} ${cy} c ${x - radius} ${cy - k} ${x - k} ${cy - radius} ${x} ${cy - radius} c ${x + k} ${cy - radius} ${x + radius} ${cy - k} ${x + radius} ${cy} c f`);
    return this;
  }

  text(value: unknown, x: number, y: number, options: { bold?: boolean; color?: string; size?: number; align?: "left" | "center"; width?: number } = {}) {
    const size = options.size ?? 12;
    const clean = ascii(value);
    const estimatedWidth = clean.length * size * 0.53;
    const textX = options.align === "center" && options.width ? x + Math.max(0, (options.width - estimatedWidth) / 2) : x;
    this.commands.push(`BT /${options.bold ? "F2" : "F1"} ${size} Tf ${rgb(options.color ?? ink)} rg 1 0 0 1 ${textX.toFixed(2)} ${(this.height - y - size).toFixed(2)} Tm (${escaped(clean)}) Tj ET`);
    return this;
  }

  textLines(value: unknown, x: number, y: number, width: number, options: { bold?: boolean; color?: string; size?: number; lineGap?: number } = {}) {
    const size = options.size ?? 10;
    const maxChars = Math.max(10, Math.floor(width / (size * 0.53)));
    const words = ascii(value).split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    const spacing = size + (options.lineGap ?? 3);
    lines.forEach((entry, index) => this.text(entry, x, y + index * spacing, options));
    return this;
  }
}

function background(canvas: Canvas, heading: string, subtitle: string) {
  canvas.rect(0, 0, canvas.width, canvas.height, "#fffaf4");
  canvas.rect(0, 0, canvas.width, 176, saffron);
  for (let x = 15; x < canvas.width; x += 24) for (let y = 14; y < 176; y += 24) canvas.circle(x, y, 1.1, "#d97706");
  canvas.text("KHAIRATABAD GANESH DARSHANAM", 42, 35, { bold: true, color: gold, size: 11 });
  canvas.text(heading, 42, 64, { bold: true, color: "#ffffff", size: 27 });
  canvas.text(subtitle, 42, 103, { color: "#fde68a", size: 11 });
  canvas.circle(canvas.width - 73, 78, 34, gold);
  canvas.text("OM", canvas.width - 105, 66, { bold: true, color: saffron, size: 23, align: "center", width: 64 });
}

function field(canvas: Canvas, x: number, y: number, label: string, value: string, width = 210) {
  canvas.text(label.toUpperCase(), x, y, { bold: true, color: muted, size: 8 });
  canvas.textLines(value, x, y + 14, width, { bold: true, color: ink, size: 12, lineGap: 2 });
}

function buildPdf(pages: Canvas[]) {
  const pageRefs = pages.map((_, index) => 5 + index * 2);
  const contentRefs = pages.map((_, index) => 6 + index * 2);
  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  pages.forEach((page, index) => {
    const stream = page.commands.join("\n");
    objects[pageRefs[index]] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentRefs[index]} 0 R >>`;
    objects[contentRefs[index]] = `<< /Length ${encoder.encode(stream).byteLength} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = "%PDF-1.4\n%PDF-GANESH\n";
  const offsets: number[] = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = encoder.encode(pdf).byteLength;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = encoder.encode(pdf).byteLength;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return encoder.encode(pdf);
}

export async function makeBookingPassPdf(data: PassDetails) {
  const page = new Canvas(595, 842);
  background(page, "Approved Darshan Pass", "Please present this pass at the Darshan entry point.");
  page.rect(40, 150, 515, 500, "#ffffff");
  page.rect(40, 150, 515, 7, gold);
  page.text("BOOKING ID", 68, 190, { bold: true, color: saffron, size: 9 });
  page.text(data.bookingId, 68, 207, { bold: true, color: saffron, size: 25 });
  page.rect(417, 190, 104, 27, "#166534");
  page.text("APPROVED", 417, 198, { bold: true, color: "#ffffff", size: 10, align: "center", width: 104 });
  page.line(68, 255, 526, 255, "#e7ded9");
  field(page, 68, 284, "Devotee name", data.fullName);
  field(page, 323, 284, "Mobile number", data.mobile, 170);
  field(page, 68, 365, "Darshan date", formatDate(data.date));
  field(page, 323, 365, "Darshan timing", `${formatTime(data.startTime)} - ${formatTime(data.endTime)}`, 190);
  field(page, 68, 446, "Number of persons", String(data.persons));
  field(page, 323, 446, "Approved on", formatDateTime(data.approvedAt), 190);
  page.rect(68, 526, 459, 78, "#fff7ed");
  page.text("IMPORTANT", 86, 543, { bold: true, color: saffron, size: 10 });
  page.textLines("Carry this pass and a valid photo ID. Entry is subject to on-site verification and the allotted time slot.", 86, 560, 422, { color: ink, size: 10, lineGap: 3 });
  page.text("Official Khairatabad Ganesh Darshanam booking portal", 40, 703, { color: muted, size: 8, align: "center", width: 515 });
  return buildPdf([page]);
}

function makeReportPage(rows: ReportRow[], pageNumber: number) {
  const page = new Canvas(842, 595);
  background(page, "Booking Report", `Authorized administrative export - page ${pageNumber}`);
  const columns = [42, 140, 275, 420, 500, 610];
  const headers = ["Booking ID", "Devotee", "Darshan", "Persons", "Status", "Approved"];
  page.rect(34, 153, 774, 27, "#fff1df");
  headers.forEach((header, index) => page.text(header, columns[index], 163, { bold: true, color: saffron, size: 8 }));
  let y = 197;
  rows.forEach((row) => {
    page.line(34, y - 7, 808, y - 7, "#f5eee9");
    page.text(row.bookingId, columns[0], y, { bold: true, color: ink, size: 8 });
    page.textLines(`${row.fullName} @${row.username} ${row.mobile}`, columns[1], y, 122, { color: ink, size: 7.5, lineGap: 2 });
    page.textLines(`${formatDate(row.date)} ${formatTime(row.startTime)} - ${formatTime(row.endTime)}`, columns[2], y, 130, { color: ink, size: 7.5, lineGap: 2 });
    page.text(String(row.persons), columns[3], y, { color: ink, size: 8 });
    page.text(row.status.toUpperCase(), columns[4], y, { color: ink, size: 8 });
    page.textLines(formatDateTime(row.approvedAt), columns[5], y, 150, { color: ink, size: 7.5, lineGap: 2 });
    y += 48;
  });
  return page;
}

export async function makeAdminReportPdf(rows: ReportRow[]) {
  if (!rows.length) {
    const page = new Canvas(842, 595);
    background(page, "Booking Report", "Authorized administrative export");
    page.text("No booking records found.", 0, 250, { color: muted, size: 14, align: "center", width: 842 });
    return buildPdf([page]);
  }
  const chunks: ReportRow[][] = [];
  for (let index = 0; index < rows.length; index += 7) chunks.push(rows.slice(index, index + 7));
  return buildPdf(chunks.map((chunk, index) => makeReportPage(chunk, index + 1)));
}
