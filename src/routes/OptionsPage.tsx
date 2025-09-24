import { Monaco } from "../components/Monaco";

export const OptionsPage = () => {
  return (
    <div className="text-white fixed inset-0 bg-neutral-900 flex flex-col">
      <div className="h-20 flex flex-row justify-center items-center gap-4">
        <img className="w-16 h-16" src="img/icon.svg" />
        <p className="text-4xl font-bold">WebScripts</p>
      </div>

      <div className="grow flex flex-row">
        <div className="w-0 grow-[1] flex"></div>

        <div className="w-0 grow-[4] flex">
          <Monaco initialValue="const x = 1;" language="typescript" />
        </div>
      </div>
    </div>
  );
};
