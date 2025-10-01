import React from "react";
import { cn } from "@/lib/utils";

export const Spotlight = ({
  className,
  fill = "#6366f1",
  opacity = 0.18,
  blur = 180,
  gradient = true,
  mode = "light" // light | dark option for subtle differences
}) => {
  // We swap filter id per instance using a stable hash from fill to prevent collisions if multiple on page.
  const filterId = React.useMemo(() => `spotlight-filter-${fill.replace(/[^a-zA-Z0-9]/g, '')}-${blur}`, [fill, blur]);
  const finalOpacity = opacity;
  return (
    <svg
      className={cn(
        "pointer-events-none absolute z-[1] h-[140%] w-[160%] lg:w-[100%] opacity-0 animate-spotlight transition-opacity duration-700",
        mode === "dark" && "mix-blend-screen",
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
      aria-hidden="true"
      role="presentation"
    >
      <g filter={`url(#${filterId})`}>
        {gradient ? (
          <ellipse
            cx="1924.71"
            cy="273.501"
            rx="1924.71"
            ry="273.501"
            transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
            fill={`url(#grad-${filterId})`}
            fillOpacity={finalOpacity}
          />
        ) : (
          <ellipse
            cx="1924.71"
            cy="273.501"
            rx="1924.71"
            ry="273.501"
            transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
            fill={fill}
            fillOpacity={finalOpacity}
          />
        )}
      </g>
      <defs>
        <filter
          id={filterId}
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation={blur} result="effect1_foregroundBlur" />
        </filter>
        {gradient && (
          <radialGradient id={`grad-${filterId}`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1924.71 273.501) rotate(90) scale(273.501 1924.71)">
            <stop offset="0%" stopColor={fill} stopOpacity="0.9" />
            <stop offset="45%" stopColor={fill} stopOpacity="0.55" />
            <stop offset="80%" stopColor={fill} stopOpacity="0.15" />
            <stop offset="100%" stopColor={fill} stopOpacity="0" />
          </radialGradient>
        )}
      </defs>
    </svg>
  );
};
