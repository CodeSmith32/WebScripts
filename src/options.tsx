import "./includes/monacoSetup";
import { render } from "preact";
import { OptionsPage } from "./routes/OptionsPage";
import { PopupManagerProvider } from "./components/popupCore/PopupManagerProvider";
import { PopupRenderer } from "./components/popupCore/PopupRenderer";

render(
  <PopupManagerProvider>
    <OptionsPage />
    <PopupRenderer />
  </PopupManagerProvider>,
  document.querySelector("#root")!
);
