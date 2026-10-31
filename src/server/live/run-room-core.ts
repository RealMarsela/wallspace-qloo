import type { RunStep } from "@/contract";

// Persistence for one run room: ordered steps (upserted by id, so a retried Workflow step never duplicates a row) and a final status.
export interface RoomStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put<T = unknown>(key: string, value: T): Promise<void>;
  list<T = unknown>(opts?: { prefix?: string; limit?: number }): Promise<Map<string, T>>;
}

export type RoomStatus = "running" | "done" | "failed";

const pad = (n: number) => String(n).padStart(6, "0");

export class RunRoomCore {
  constructor(private readonly storage: RoomStorage) {}

  // Returns the step as stored; `fresh` is false when this id was already recorded (a retry), so callers can skip the broadcast.
  async addStep(step: RunStep): Promise<{ seq: number; fresh: boolean }> {
    const known = await this.storage.get<number>(`id:${step.id}`);
    if (known !== undefined) {
      await this.storage.put(`step:${pad(known)}`, step);
      return { seq: known, fresh: false };
    }
    const seq = ((await this.storage.get<number>("count")) ?? 0) + 1;
    await this.storage.put("count", seq);
    await this.storage.put(`id:${step.id}`, seq);
    await this.storage.put(`step:${pad(seq)}`, step);
    return { seq, fresh: true };
  }

  async steps(): Promise<RunStep[]> {
    const rows = await this.storage.list<RunStep>({ prefix: "step:" });
    return [...rows.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v);
  }

  async setStatus(status: RoomStatus): Promise<void> {
    await this.storage.put("status", status);
  }

  async status(): Promise<RoomStatus> {
    return (await this.storage.get<RoomStatus>("status")) ?? "running";
  }
}
