export function createEventBus() {
  const listeners = new Map();

  return {
    on(type, listener) {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
      return () => set.delete(listener);
    },
    emit(type, payload) {
      const set = listeners.get(type);
      if (!set) return;
      for (const listener of [...set]) listener(payload);
    }
  };
}
