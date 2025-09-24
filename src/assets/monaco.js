const createWorker = (prefix) =>
  new Worker(`./monaco-workers/${prefix}.worker.js`);

const getWorker = (_, label) => {
  if (label === "javascript" || label === "typescript") {
    return createWorker("ts");
  }
  if (label === "json") {
    return createWorker("json");
  }
  return createWorker("editor");
};

self.MonacoEnvironment = { getWorker };
