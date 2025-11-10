const createWorker = (prefix) =>
  new Worker(`./monaco-workers/${prefix}.worker.js`);

const getWorker = (_, label) => {
  // javascript / typescript
  if (label === "javascript" || label === "typescript") {
    return createWorker("ts");
  }

  // editorWorkerService
  if (label === "editorWorkerService") {
    return createWorker("editor");
  }

  throw new Error(`Failed to load worker for '${label}'`);
};

self.MonacoEnvironment = { getWorker };
