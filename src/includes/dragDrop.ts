export type InsertPosition = -1 | 0 | 1;

/** Run a drag-drop process and resolve with the offset to move the dragged element.
 *
 * 0 means item did not move. -1 means it moved up by one. 1 means it moved down by one. */
export const dragDrop = async ({
  item,
  container,
  onEnter,
  onLeave,
}: {
  item: HTMLElement;
  container: HTMLElement;
  onEnter?: (element: HTMLElement, side: -1 | 1) => void;
  onLeave?: (element: HTMLElement) => void;
}): Promise<number> => {
  // array of listener-removing functions
  const dispose: (() => void)[] = [];

  return new Promise<number>((resolve) => {
    // get / set if an event has been handled (for global catching)
    const getEvtHandled = (evt: Event): boolean => {
      return !!(evt as unknown as { __dragDropHandleData?: boolean })
        .__dragDropHandleData;
    };
    const setEvtHandled = (evt: Event) => {
      (
        evt as unknown as { __dragDropHandleData?: boolean }
      ).__dragDropHandleData = true;
    };

    // current drag-over element / side
    let currentOver: HTMLElement | null = null;
    let currentSide: InsertPosition = 0;

    // hook to window to listen for drag-out
    const globalHandler = (evt: DragEvent) => {
      if (getEvtHandled(evt)) return;

      if (currentOver) onLeave?.(currentOver);

      currentOver = null;
      currentSide = 0;

      // if dropped outside list, cancel
      if (evt.type === "drop" || evt.type === "dragend") {
        resolve(0);
      }
    };
    window.addEventListener("dragover", globalHandler);
    window.addEventListener("drop", globalHandler);
    window.addEventListener("dragend", globalHandler);
    dispose.push(() => {
      window.removeEventListener("dragover", globalHandler);
      window.removeEventListener("drop", globalHandler);
    });

    let dragFromIndex = NaN;

    // hook up dragover / drop listeners
    for (let i = 0; i < container.children.length; i++) {
      const element = container.children[i] as HTMLElement;
      if (element === item) dragFromIndex = i;

      // listener definition
      const handleDragDrop = (evt: DragEvent) => {
        evt.preventDefault();
        setEvtHandled(evt);

        // get drop-side of element
        const box = element.getBoundingClientRect();
        const insert: InsertPosition =
          evt.clientY < box.top + box.height / 2 ? -1 : 1;

        if (evt.type === "dragover") {
          if (currentOver === element && currentSide === insert) return;

          if (currentOver) onLeave?.(currentOver);

          currentOver = element;
          currentSide = insert;

          onEnter?.(element, insert);
        } else if (evt.type === "drop") {
          if (currentOver) onLeave?.(currentOver);
          currentOver = null;
          currentSide = 0;

          let dropIndex = i + (insert > 0 ? 1 : 0);
          if (dropIndex > dragFromIndex) dropIndex--;

          resolve(dropIndex - dragFromIndex);
        }
      };

      // hook
      element.addEventListener("dragover", handleDragDrop);
      element.addEventListener("drop", handleDragDrop);

      // add dispose function
      dispose.push(() => {
        element.removeEventListener("dragover", handleDragDrop);
        element.removeEventListener("drop", handleDragDrop);
      });
    }
  }).finally(() => {
    // finally, dispose all listeners
    for (const fn of dispose) fn();
  });
};
