const createWorker = (prefix) =>
  new Worker(`./monaco-workers/${prefix}.worker.js`);

const getWorker = (_, label) => {
  // javascript / typescript
  if (label === "javascript" || label === "typescript") {
    return createWorker("ts");
  }

  // json
  if (label === "json") {
    return createWorker("json");
  }

  // editorWorkerService
  return createWorker("editor");
};

self.MonacoEnvironment = { getWorker };
