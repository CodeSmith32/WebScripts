import "./includes/services/monacoService";
import { render } from "preact";
import { OptionsPage } from "./routes/OptionsPage";
import { PopupManagerProvider } from "./components/core/popups/PopupManagerProvider";
import { PopupRenderer } from "./components/core/popups/PopupRenderer";

render(
  <PopupManagerProvider>
    <OptionsPage />
    <PopupRenderer />
  </PopupManagerProvider>,
  document.querySelector("#root")!
);
