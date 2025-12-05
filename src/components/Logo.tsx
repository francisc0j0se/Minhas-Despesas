import React from 'react';

export const Logo = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="45" fill="#3b82f6" />
      <text
        x="50"
        y="68"
        fontSize="50"
        fontFamily="Arial, sans-serif"
        fill="white"
        textAnchor="middle"
        fontWeight="bold"
      >
        $
      </text>
    </svg>
  );
};