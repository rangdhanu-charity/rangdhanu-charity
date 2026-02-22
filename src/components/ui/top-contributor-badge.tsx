import React, { useMemo } from "react";

const PremiumBadgeSVG = ({ rank }: { rank?: number }) => {
    const zigzagPath = useMemo(() => {
        const numPoints = 16;
        return Array.from({ length: numPoints * 2 }).map((_, i) => {
            const r = i % 2 === 0 ? 48 : 38;
            const angle = (i * Math.PI) / numPoints - Math.PI / 2;
            const x = 50 + Math.cos(angle) * r;
            const y = 50 + Math.sin(angle) * r;
            return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
        }).join(' ') + ' Z';
    }, []);

    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full drop-shadow-md transition-transform hover:scale-110">
            <defs>
                <linearGradient id="gold-main" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFF4D0" />
                    <stop offset="30%" stopColor="#FFC824" />
                    <stop offset="100%" stopColor="#D48100" />
                </linearGradient>
                <linearGradient id="gold-inner" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FFDB3D" />
                    <stop offset="100%" stopColor="#FFAD0A" />
                </linearGradient>
            </defs>

            {/* Zigzag Outer Seal */}
            <path d={zigzagPath} fill="url(#gold-main)" />
            <path d={zigzagPath} fill="none" stroke="#FFF7A1" strokeWidth="2" opacity="0.6" />

            {/* Inner Circle */}
            <circle cx="50" cy="50" r="32" fill="url(#gold-inner)" stroke="#D48600" strokeWidth="1" />

            {/* Inner dashed/dotted accent ring */}
            <circle cx="50" cy="50" r="28" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2,3" opacity="0.8" />

            {/* Top Text */}
            <text x="50" y="44" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="15" fill="#FFFFFF" textAnchor="middle" letterSpacing="0.5">TOP</text>

            {/* Number */}
            <text x="50" y="74" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="34" fill="#FFFFFF" textAnchor="middle">
                {rank || 5}
            </text>

            {/* Subtle glow/highlight on top text */}
            <path d="M 30,30 Q 50,15 70,30 A 28 28 0 0 0 30,30 Z" fill="#FFFFFF" opacity="0.15" />
        </svg>
    );
};

export function TopContributorBadge({ rank, className = "w-6 h-6" }: { rank?: number, className?: string }) {
    return (
        <div
            className={`absolute z-10 flex items-center justify-center cursor-help ${className}`}
            title={!rank ? "Top Contributor" : `Top Contributor (#${rank})`}
        >
            <PremiumBadgeSVG rank={rank} />
        </div>
    );
}

export function TopContributorNameBadge({ rank, className = "w-4 h-4 ml-1 inline-flex items-center justify-center shrink-0" }: { rank?: number, className?: string }) {
    return (
        <div
            className={`cursor-help ${className}`}
            title={!rank ? "Top Contributor" : `Top Contributor (#${rank})`}
        >
            <PremiumBadgeSVG rank={rank} />
        </div>
    );
}
