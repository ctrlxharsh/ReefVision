import React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";

interface InfoTooltipProps {
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, side = "top" }) => {
  return (
    <Tooltip.Provider delayDuration={100}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className="info-tooltip-btn"
            aria-label="More information"
            onClick={(e) => e.preventDefault()}
          >
            <Info size={12} />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="info-tooltip-content"
            side={side}
            sideOffset={5}
          >
            {content}
            <Tooltip.Arrow className="info-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
