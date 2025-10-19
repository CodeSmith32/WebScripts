import { ExternalLinkIcon } from "lucide-preact";

export interface HelpUrlProps {
  url: string;
}

export const HelpUrl = ({ url }: HelpUrlProps) => {
  return (
    <a
      target="_blank"
      href={url}
      className="text-blue-500 hover:text-blue-400 active:text-blue-600"
    >
      Help documentation <ExternalLinkIcon className="inline-block" size={10} />
    </a>
  );
};
