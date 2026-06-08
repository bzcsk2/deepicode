import type { MemoryStore, MemoryUpdateOp } from "../runtime/memory-store.js"

export class StateKV {
  constructor(private store: MemoryStore) {}

  async get<T = unknown>(scope: string, key: string): Promise<T | null> {
    return this.store.get<T>(scope, key)
  }

  async set<T = unknown>(scope: string, key: string, value: T): Promise<T> {
    return this.store.set<T>(scope, key, value)
  }

  async update<T = unknown>(scope: string, key: string, ops: Array<{ type: string; path: string; value?: unknown }>): Promise<T> {
    const mapped: MemoryUpdateOp[] = ops.map(o => ({
      op: o.type === "set" ? "set" : o.type === "delete" ? "delete" : "append",
      path: o.path,
      value: o.value,
    }))
    return this.store.update<T>(scope, key, mapped)
  }

  async delete(scope: string, key: string): Promise<void> {
    return this.store.delete(scope, key)
  }

  async list<T = unknown>(scope: string): Promise<T[]> {
    return this.store.list<T>(scope)
  }
}
