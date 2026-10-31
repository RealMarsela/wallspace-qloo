import { MemoryStore, emptyData, type MemoryData } from "./memory";

/** Dev driver (`next dev`, scripts): the memory store persisted as one JSON file. Node only; imported lazily so Workers never load it. */
export class FileStore extends MemoryStore {
  readonly driver = "file" as const;
  constructor(private readonly path: string) {
    super();
  }
  protected async load(): Promise<void> {
    const { readFile } = await import("node:fs/promises");
    try {
      this.data = { ...emptyData(), ...(JSON.parse(await readFile(this.path, "utf8")) as Partial<MemoryData>) };
    } catch {
      this.data = emptyData();
    }
  }
  protected async persist(): Promise<void> {
    const { mkdir, writeFile, rename } = await import("node:fs/promises");
    const { dirname } = await import("node:path");
    await mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(this.data));
    await rename(tmp, this.path);
  }
}
