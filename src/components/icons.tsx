import React from 'react';

export const CricketBallIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
    <path
      d="M12 2 a10 10 0 0 0 0 20"
      stroke="hsl(var(--card-foreground))"
      strokeWidth="1"
      fill="none"
      strokeDasharray="2 3"
      transform="rotate(15 12 12)"
    />
     <path
      d="M12 2 a10 10 0 0 1 0 20"
      stroke="hsl(var(--card-foreground))"
      strokeWidth="1"
      fill="none"
      strokeDasharray="2 3"
      transform="rotate(-15 12 12)"
    />
  </svg>
);
