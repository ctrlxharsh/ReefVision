import React from "react";

interface ThreeDotsLoaderProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

export const ThreeDotsLoader: React.FC<ThreeDotsLoaderProps> = ({
  size = "md",
  color,
  className = "",
}) => {
  return (
    <div
      className={`three-dots-loader three-dots-${size} ${className}`}
      role="status"
      aria-label="Loading..."
    >
      <span
        className="three-dots-dot dot-1"
        style={color ? { backgroundColor: color } : undefined}
      />
      <span
        className="three-dots-dot dot-2"
        style={color ? { backgroundColor: color } : undefined}
      />
      <span
        className="three-dots-dot dot-3"
        style={color ? { backgroundColor: color } : undefined}
      />
    </div>
  );
};
