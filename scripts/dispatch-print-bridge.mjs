import { execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { PDFDocument } from "pdf-lib";

const execFileAsync = promisify(execFile);
const HOST = "127.0.0.1";
const PORT = 47831;
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const PRINTER = "Printer_ITPP130";
const TOKEN = randomBytes(32).toString("hex");
let jobsAccepted = 0;
const ALLOWED_ORIGINS = new Set(["https://foldforge.xyz", "https://www.foldforge.xyz", "http://localhost:3000", "http://127.0.0.1:3000"]);

function headers(origin) {
  return { "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Private-Network": "true", "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8", "Vary": "Origin" };
}

function send(response, status, body, origin = "") {
  response.writeHead(status, headers(origin));
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("Print job exceeds the local bridge limit");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function validatePdf(bytes, expectedCount) {
  if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("Print payload is not a PDF");
  if (!Number.isInteger(expectedCount) || expectedCount < 1 || expectedCount > 100) throw new Error("Print job must contain between 1 and 100 labels");
  const pdf = await PDFDocument.load(bytes);
  if (pdf.getPageCount() !== expectedCount) throw new Error("Print payload page count does not match the selected labels");
  for (const page of pdf.getPages()) {
    if (Math.abs(page.getWidth() - 75 * 72 / 25.4) > 0.05 || Math.abs(page.getHeight() - 50 * 72 / 25.4) > 0.05) throw new Error("Every print page must be exactly 75 x 50 mm");
  }
}

async function print(pdfBytes) {
  const directory = await mkdtemp(join(tmpdir(), "foldforge-dispatch-"));
  const path = join(directory, `${randomUUID()}.pdf`);
  try {
    await writeFile(path, pdfBytes, { mode: 0o600 });
    const { stdout } = await execFileAsync("/usr/bin/lp", ["-d", PRINTER, "-o", "PageSize=w216h144", "-o", "Rotate=3", "-o", "scaling=100", "-o", "job-sheets=none", path]);
    return stdout.match(/request id is ([^\s]+)/)?.[1] || "accepted";
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const server = createServer(async (request, response) => {
  const origin = String(request.headers.origin || "");
  if (!ALLOWED_ORIGINS.has(origin)) return send(response, 403, { error: "Origin is not allowed" });
  if (request.method === "OPTIONS") return send(response, 204, {}, origin);
  if (request.method !== "POST" || request.url !== "/v1/print") return send(response, 404, { error: "Not found" }, origin);
  if (request.headers.authorization !== `Bearer ${TOKEN}`) return send(response, 401, { error: "Pairing token is invalid" }, origin);
  try {
    const payload = await readJson(request);
    if (payload?.schema !== "foldforge-dispatch-print/v1") throw new Error("Unsupported local print schema");
    const count = Number(payload.label_count);
    const pdfBytes = Buffer.from(String(payload.pdf_base64 || ""), "base64");
    await validatePdf(pdfBytes, count);
    const jobID = await print(pdfBytes);
    jobsAccepted += 1;
    send(response, 200, { status: "accepted", job_id: jobID, label_count: count, jobs_accepted: jobsAccepted }, origin);
    process.stdout.write(`${jobID}: ${count} label${count === 1 ? "" : "s"} accepted (${jobsAccepted} batch${jobsAccepted === 1 ? "" : "es"} this session).\n`);
  } catch (error) {
    send(response, 400, { error: error instanceof Error ? error.message : "Local print job failed" }, origin);
  }
});

server.listen(PORT, HOST, async () => {
  const url = `https://foldforge.xyz/dispatch/#bridge=${TOKEN}`;
  process.stdout.write("FoldForge Dispatch bridge active until this process is stopped.\n");
  if (process.env.DISPATCH_NO_OPEN === "1") process.stdout.write(`${url}\n`);
  else await execFileAsync("/usr/bin/open", [url]);
});
