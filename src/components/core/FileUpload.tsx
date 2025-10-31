import type { InputHTMLAttributes } from "preact";
import { useState } from "preact/hooks";
import { cn } from "../../includes/core/classes";

export interface FileUploadProps extends InputHTMLAttributes {
  disabled?: boolean;
  wrapperStyle?: string;
  className?: string;
  onFileSelect?: (file: FileList | null) => void;
}

export const FileUpload = ({
  disabled,
  wrapperStyle,
  className,
  onChange,
  onFileSelect,
  multiple,
  ...props
}: FileUploadProps) => {
  const [files, setFiles] = useState<FileList | null>(null);

  return (
    <div
      className={cn(
        "relative w-full min-h-60 text-text/70",
        files && "text-primary",
        wrapperStyle
      )}
    >
      <input
        disabled={disabled}
        className="absolute inset-0 opacity-0 cursor-pointer"
        multiple={multiple}
        onChange={(evt) => {
          onChange?.(evt);

          let files = (evt.target as HTMLInputElement).files;
          if (!files?.length) files = null;
          setFiles(files);
          onFileSelect?.(files);
        }}
        {...props}
        type="file"
      />
      <div
        className={cn(
          "absolute inset-0 border-2 border-text/70 border-dashed rounded-xl flex flex-col " +
            "justify-center items-center gap-2 text-center pointer-events-none",
          files && "border-primary",
          className
        )}
      >
        <p className="text-2xl">{multiple ? "Select Files" : "Select File"}</p>
        <p>
          {files
            ? multiple
              ? `${files.length} files selected.`
              : files[0].name
            : "Drop files or click to select."}
        </p>
      </div>
    </div>
  );
};
