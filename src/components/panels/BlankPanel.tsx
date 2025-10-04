export const BlankPanel = () => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40">
      <h1 className="text-center text-4xl font-bold opacity-20">WebScripts</h1>
      <p className="text-center text-balance text-xl opacity-20">
        Pick or add a script from the left.
      </p>
    </div>
  );
};
