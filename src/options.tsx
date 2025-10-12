import "./includes/monacoSetup";
import { render } from "preact";
import { OptionsPage } from "./routes/OptionsPage";
import { PopupManagerProvider } from "./components/popups/PopupManagerProvider";
import { PopupRenderer } from "./components/popups/PopupRenderer";

render(
  <PopupManagerProvider>
    <OptionsPage />
    <PopupRenderer />
  </PopupManagerProvider>,
  document.querySelector("#root")!
);
