export function createStore(initialState) {
  let state = initialState;
  const subscribers = new Set();

  function notify(prev, meta) {
    for (const subscriber of [...subscribers]) subscriber(state, prev, meta);
  }

  return {
    getState() {
      return state;
    },
    setState(patch, meta = {}) {
      const prev = state;
      const nextPatch = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...nextPatch };
      notify(prev, meta);
    },
    update(path, value, meta = {}) {
      const prev = state;
      const parts = path.split('.');
      const root = { ...state };
      let node = root;
      let oldNode = state;
      for (let i = 0; i < parts.length - 1; i++) {
        node[parts[i]] = { ...oldNode[parts[i]] };
        node = node[parts[i]];
        oldNode = oldNode[parts[i]];
      }
      const leaf = parts[parts.length - 1];
      node[leaf] = typeof value === 'function' ? value(oldNode[leaf]) : value;
      state = root;
      notify(prev, meta);
    },
    subscribe(subscriber) {
      subscribers.add(subscriber);
      subscriber(state, state, { initial: true });
      return () => subscribers.delete(subscriber);
    }
  };
}
