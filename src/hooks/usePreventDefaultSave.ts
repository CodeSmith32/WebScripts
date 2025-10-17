import { useEffect } from "preact/hooks";

export const usePreventDefaultSave = () => {
  useEffect(() => {
    const preventDefaultSave = (evt: KeyboardEvent) => {
      if (evt.ctrlKey && evt.key.toLowerCase() === "s") {
        // prevent save action
        evt.preventDefault();
      }
    };

    window.addEventListener("keydown", preventDefaultSave);

    return () => {
      window.removeEventListener("keydown", preventDefaultSave);
    };
  }, []);
};
