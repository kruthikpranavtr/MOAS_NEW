import React from "react";

interface MoasLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showSubtitle?: boolean;
  lightMode?: boolean;
}

export const MoasLogo: React.FC<MoasLogoProps> = ({
  className = "",
  size = "md",
  showSubtitle = true,
  lightMode = false,
}) => {
  const navyColor = lightMode ? "#FFFFFF" : "#0F2E4D";
  const tealColor = "#0D9488";
  const lightTeal = "#14B8A6";

  const sizeClasses = {
    sm: "h-8",
    md: "h-11",
    lg: "h-16",
    xl: "h-24",
  };

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox="0 0 420 160"
        className={`${sizeClasses[size]} w-auto transition-transform duration-200`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top 3-Person Team Graphic */}
        <g id="moas-team-icon">
          {/* Left Person (Navy) */}
          <circle cx="160" cy="24" r="10" fill={navyColor} />
          <path
            d="M144 46C144 38 152 35 160 35C168 35 176 38 176 46V50H144V46Z"
            fill={navyColor}
          />

          {/* Right Person (Navy) */}
          <circle cx="260" cy="24" r="10" fill={navyColor} />
          <path
            d="M244 46C244 38 252 35 260 35C268 35 276 38 276 46V50H244V46Z"
            fill={navyColor}
          />

          {/* Center Leader Person (Teal with White Tie) */}
          <circle cx="210" cy="18" r="13" fill={tealColor} />
          <path
            d="M190 48C190 38 200 34 210 34C220 34 230 38 230 48V52H190V48Z"
            fill={tealColor}
          />
          {/* Tie */}
          <polygon points="210,36 213,44 210,50 207,44" fill="#FFFFFF" />

          {/* Arc under team */}
          <path
            d="M120 54C160 42 260 42 300 54"
            stroke={lightTeal}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>

        {/* MOAS Letters */}
        <g id="moas-lettermark" transform="translate(15, 56)">
          {/* M */}
          <path
            d="M30 72V14H46L68 47L90 14H106V72H90V34L72 61H64L46 34V72H30Z"
            fill={navyColor}
          />

          {/* O - Target Bullseye with Arrow */}
          <g transform="translate(125, 43)">
            {/* Outer Teal Ring */}
            <circle cx="34" cy="0" r="33" fill={tealColor} />
            <circle cx="34" cy="0" r="23" fill={lightMode ? "#0F172A" : "#FFFFFF"} />

            {/* Inner Teal Ring */}
            <circle cx="34" cy="0" r="16" fill={tealColor} />
            <circle cx="34" cy="0" r="8" fill={lightMode ? "#0F172A" : "#FFFFFF"} />

            {/* Center Bullseye Dot */}
            <circle cx="34" cy="0" r="4.5" fill={tealColor} />

            {/* Target Arrow Piercing Diagonally (Bottom-Left to Upper-Right) */}
            <g transform="rotate(-45, 34, 0)">
              {/* Shaft */}
              <line
                x1="34"
                y1="40"
                x2="34"
                y2="-44"
                stroke={lightMode ? "#FFFFFF" : "#0F2E4D"}
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Arrow Head at Top */}
              <polygon
                points="34,-48 27,-36 34,-40 41,-36"
                fill={tealColor}
              />
              {/* Fletching at Bottom */}
              <path
                d="M34 38L26 44M34 38L42 44M34 32L26 38M34 32L42 38"
                stroke={tealColor}
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          </g>

          {/* A */}
          <path
            d="M228 72L254 14H274L300 72H282L276 57H252L246 72H228ZM257 44H271L264 26L257 44Z"
            fill={navyColor}
          />

          {/* S */}
          <path
            d="M322 60C326 68 335 73 346 73C358 73 366 67 366 59C366 50 357 47 344 44C327 40 316 34 316 22C316 12 326 5 342 5C355 5 365 11 370 19L358 29C354 23 349 19 342 19C334 19 329 23 329 28C329 35 338 38 351 41C369 45 380 52 380 64C380 75 370 82 352 82C337 82 325 74 319 63L322 60Z"
            fill={navyColor}
          />
        </g>

        {/* Subtitle with Dots and Lines */}
        {showSubtitle && (
          <g id="moas-subtitle" transform="translate(0, 142)">
            {/* Left Line */}
            <line x1="30" y1="4" x2="62" y2="4" stroke={tealColor} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="70" cy="4" r="3" fill={tealColor} />

            {/* Subtitle Text */}
            <text
              x="210"
              y="8"
              textAnchor="middle"
              fill={navyColor}
              fontSize="12.5"
              fontWeight="700"
              letterSpacing="3.5"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            >
              ML OPPORTUNITIES AND ALGORITHMIC SERVICES
            </text>

            {/* Right Line */}
            <circle cx="350" cy="4" r="3" fill={tealColor} />
            <line x1="358" y1="4" x2="390" y2="4" stroke={tealColor} strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  );
};
