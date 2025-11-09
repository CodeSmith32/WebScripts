import { ExternalLinkIcon } from "lucide-preact";
import { Anchor } from "./core/Anchor";

export interface HelpUrlProps {
  url: string;
}

export const HelpUrl = ({ url }: HelpUrlProps) => {
  return (
    <Anchor href={url}>
      Help documentation <ExternalLinkIcon className="inline-block" size={10} />
    </Anchor>
  );
};
