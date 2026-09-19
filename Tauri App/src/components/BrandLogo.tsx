import React from "react";
import appIcon from "../assets/app_icon.png";

interface BrandLogoProps {
  isSidebar?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ isSidebar = false }) => {
  if (isSidebar) {
    return (
      <div className="sidebar-header">
        <img src={appIcon} alt="App Icon" className="sidebar-logo-img" />
        <div>
          <div className="sidebar-logo-text">
            ANDROME!DA<span className="tm">™</span>
          </div>
          <div className="sidebar-brand-sub">Reef Vision Studio</div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-brand-col">
      <img src={appIcon} alt="Andromeida" className="portal-icon" />
      <div className="andromeida-text-brand">
        ANDROME!DA<span className="tm">™</span>
      </div>
      <div className="login-title">Reef Vision Studio</div>
      <div className="login-subtitle">
        Autonomous multi-model coral reef instance segmentation, taxonomy, and condition assessment.
      </div>
    </div>
  );
};
