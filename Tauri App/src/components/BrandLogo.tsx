import React from "react";
import appIcon from "../assets/app_icon.png";

interface BrandLogoProps {
  variant?: "portal" | "topbar" | "sidebar";
  /** @deprecated use variant='sidebar' instead */
  isSidebar?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant,
  isSidebar = false,
}) => {
  const mode = variant || (isSidebar ? "sidebar" : "portal");

  if (mode === "topbar") {
    return (
      <div className="flex items-center gap-2.5 select-none shrink-0">
        <img
          src={appIcon}
          alt="Andromeida Logo"
          className="h-7 w-7 max-h-7 max-w-7 rounded-lg object-contain shadow-xs shrink-0"
        />
        <div className="flex items-baseline gap-1.5">
          <span className="font-extrabold text-sm tracking-tight text-[#0f1e4a]">
            ANDROME!DA<span className="text-[10px] align-super text-[#0d7c85] ml-0.5">™</span>
          </span>
          <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
            Reef Vision Studio
          </span>
        </div>
      </div>
    );
  }

  if (mode === "sidebar") {
    return (
      <div className="flex items-center gap-2 select-none px-4 py-3 border-b border-border">
        <img
          src={appIcon}
          alt="App Icon"
          className="h-6 w-6 max-h-6 max-w-6 rounded-md object-contain shrink-0"
        />
        <div>
          <div className="text-xs font-extrabold text-[#0f1e4a]">
            ANDROME!DA<span className="text-[9px] align-super text-[#0d7c85]">™</span>
          </div>
          <div className="text-[10px] font-medium text-slate-500">Reef Vision Studio</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col select-none mb-2.5">
      <img
        src={appIcon}
        alt="Andromeida"
        className="h-11 w-11 max-h-11 max-w-11 rounded-xl object-contain shadow-xs mb-2"
      />
      <div className="text-[11px] font-bold tracking-wider text-[#0d7c85] uppercase">
        ANDROME!DA<span className="text-[9px] align-super">™</span>
      </div>
      <h1 className="text-xl font-black text-[#0f1e4a] tracking-tight">
        Reef Vision Studio
      </h1>
      <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs leading-snug">
        Autonomous multi-model coral reef instance segmentation, taxonomy, and condition assessment.
      </p>
    </div>
  );
};
