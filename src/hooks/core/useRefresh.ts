import { useState } from "preact/hooks";

export const useRefresh = () => {
  const [, rawRefresh] = useState({});

  return () => rawRefresh({});
};
