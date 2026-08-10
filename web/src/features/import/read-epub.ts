export interface ParsedEpub {
  title: string;
  text: string;
}

interface ZipEntry {
  method: number;
  compressedSize: number;
  localOffset: number;
}

export async function readEpub(file: File): Promise<ParsedEpub> {
  const archive = await readZip(await file.arrayBuffer());
  const container = await archive.text("META-INF/container.xml");
  const containerDocument = new DOMParser().parseFromString(container, "application/xml");
  const packagePath = containerDocument
    .querySelector("rootfile")
    ?.getAttribute("full-path");
  if (!packagePath) throw new Error("EPUB package document is missing");

  const packageXml = await archive.text(packagePath);
  const packageDocument = new DOMParser().parseFromString(packageXml, "application/xml");
  const basePath = packagePath.split("/").slice(0, -1).join("/");
  const title = textOfLocalName(packageDocument, "title");
  const manifest = new Map<string, { href: string; mediaType: string }>();

  for (const item of elementsByLocalName(packageDocument, "item")) {
    const id = item.getAttribute("id");
    if (!id) continue;
    manifest.set(id, {
      href: item.getAttribute("href") ?? "",
      mediaType: item.getAttribute("media-type") ?? ""
    });
  }

  const spineIds = elementsByLocalName(packageDocument, "itemref")
    .map((item) => item.getAttribute("idref"))
    .filter((id): id is string => Boolean(id));
  const chapters: string[] = [];

  for (const id of spineIds) {
    const item = manifest.get(id);
    if (!item || !/(xhtml|html)/i.test(`${item.mediaType} ${item.href}`)) continue;
    const chapterPath = cleanPath(`${basePath ? `${basePath}/` : ""}${decodeHref(item.href)}`);
    try {
      const chapter = parseChapter(await archive.text(chapterPath));
      if (chapter) chapters.push(chapter);
    } catch {
      // A broken optional chapter should not make the whole book unreadable.
    }
  }

  const text = chapters.join("\n\n").trim();
  if (!text) throw new Error("EPUB contains no readable text");
  return { title, text };
}

function parseChapter(html: string): string {
  const document = new DOMParser().parseFromString(html, "text/html");
  document.querySelectorAll("script,style,nav,svg,noscript").forEach((node) => node.remove());
  const heading = (document.querySelector("h1,h2,h3,title")?.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const paragraphs = [...document.body.querySelectorAll("h1,h2,h3,p,li,blockquote")]
    .map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim())
    .filter((text) => text.length > 1);
  const content = paragraphs.join("\n\n");
  return content ? `${heading ? `## ${heading}\n\n` : ""}${content}` : "";
}

function elementsByLocalName(document: Document, name: string): Element[] {
  return [...document.getElementsByTagName("*")].filter((node) => node.localName === name);
}

function textOfLocalName(document: Document, name: string): string {
  return (elementsByLocalName(document, name)[0]?.textContent ?? "").trim();
}

function decodeHref(value: string): string {
  try {
    return decodeURIComponent(value.split("#", 1)[0] ?? value);
  } catch {
    return value.split("#", 1)[0] ?? value;
  }
}

function cleanPath(path: string): string {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

async function readZip(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let directoryEnd = -1;
  for (let offset = bytes.length - 22; offset >= 0 && offset > bytes.length - 66_000; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      directoryEnd = offset;
      break;
    }
  }
  if (directoryEnd < 0) throw new Error("Invalid EPUB archive");

  const entryCount = view.getUint16(directoryEnd + 10, true);
  let pointer = view.getUint32(directoryEnd + 16, true);
  const entries = new Map<string, ZipEntry>();
  const decoder = new TextDecoder();

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(pointer, true) !== 0x02014b50) break;
    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localOffset = view.getUint32(pointer + 42, true);
    const name = cleanPath(decoder.decode(bytes.slice(pointer + 46, pointer + 46 + nameLength)));
    entries.set(name, { method, compressedSize, localOffset });
    pointer += 46 + nameLength + extraLength + commentLength;
  }

  return {
    text: async (name: string) => {
      const data = await zipBytes(entries.get(cleanPath(name)), bytes, view);
      return decoder.decode(data);
    }
  };
}

async function zipBytes(
  entry: ZipEntry | undefined,
  bytes: Uint8Array,
  view: DataView
): Promise<Uint8Array> {
  if (!entry) throw new Error("EPUB file entry is missing");
  const nameLength = view.getUint16(entry.localOffset + 26, true);
  const extraLength = view.getUint16(entry.localOffset + 28, true);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const compressed = bytes.slice(start, start + entry.compressedSize);
  if (entry.method === 0) return compressed;
  if (entry.method === 8) return inflateRaw(compressed);
  throw new Error("Unsupported EPUB compression");
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (!("DecompressionStream" in window)) {
    throw new Error("This browser cannot decompress EPUB files");
  }
  const stream = new Blob([Uint8Array.from(data).buffer]).stream().pipeThrough(
    new DecompressionStream("deflate-raw" as CompressionFormat)
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
