"use client";

import Image from "next/image";

const galleryImages = [
    { src: "/gallery/image2.jpeg", alt: "Charity event background left" },
    { src: "/gallery/image1.jpeg", alt: "Charity event background center" },
    { src: "/gallery/image3.jpeg", alt: "Charity event background right" },
];

export function HomeHeroGallery() {
    return (
        <div className="absolute inset-0 z-0 overflow-hidden w-full h-full bg-background selection:bg-transparent">
            {/* 
        3-Image Seamless Crossfade Layout:
        - Image 1 (Left/Top) and Image 3 (Right/Bottom) are solid and lie underneath (z-10).
        - Image 2 (Center) is placed in the middle (z-20) and uses a CSS mask to fade out its edges,
          seamlessly blending into Image 1 and Image 3 on both sides.
      */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .hero-mask-center {
                    /* Mobile: fade top and bottom */
                    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
                    mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
                }
                @media (min-width: 768px) {
                    .hero-mask-center {
                        /* Desktop: fade left and right */
                        -webkit-mask-image: linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%);
                        mask-image: linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%);
                    }
                }
            `}} />

            <div className="relative w-full h-full">
                {/* 1. First Image (Left on Desktop, Top on Mobile) */}
                <div className="absolute top-0 left-0 w-full h-[40%] md:w-[40%] md:h-full z-10 group">
                    <Image
                        src={galleryImages[0].src}
                        alt={galleryImages[0].alt}
                        fill
                        className="object-cover w-full h-full filter brightness-[0.75] contrast-[1.15] saturate-[1.1] transition-all duration-[2000ms] ease-out group-hover:brightness-[0.9] group-hover:saturate-125 group-hover:scale-105"
                        priority
                    />
                </div>

                {/* 2. Middle Image (Center on Desktop, Center on Mobile) */}
                <div className="absolute top-[30%] left-0 w-full h-[40%] md:top-0 md:left-[30%] md:w-[40%] md:h-full z-20 group hero-mask-center">
                    <Image
                        src={galleryImages[1].src}
                        alt={galleryImages[1].alt}
                        fill
                        className="object-cover w-full h-full filter brightness-[0.75] contrast-[1.15] saturate-[1.1] transition-all duration-[2000ms] ease-out group-hover:brightness-[0.9] group-hover:saturate-125 group-hover:scale-105"
                    />
                </div>

                {/* 3. Last Image (Right on Desktop, Bottom on Mobile) */}
                <div className="absolute bottom-0 right-0 w-full h-[40%] md:w-[40%] md:h-full z-10 group">
                    <Image
                        src={galleryImages[1].src}
                        alt={galleryImages[1].alt}
                        fill
                        className="object-cover w-full h-full filter brightness-[0.75] contrast-[1.15] saturate-[1.1] transition-all duration-[2000ms] ease-out group-hover:brightness-[0.9] group-hover:saturate-125 group-hover:scale-105"
                    />
                </div>
            </div>

            {/* Master Overlays for text legibility & blending - "Light Wash but Reduced Glare" */}
            {/* Gentle Top to Bottom fade for text readability (reduced from /80 to /60) */}
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/20 to-transparent z-40 pointer-events-none" />

            {/* Even gentler Left/Right fade */}
            <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-background/40 z-40 pointer-events-none" />

            {/* Extremely heavy Bottom fade to completely erase the bottom border seamlessly into next section */}
            <div className="absolute bottom-0 left-0 w-full h-[40%] bg-gradient-to-t from-background via-background/80 to-transparent z-40 pointer-events-none" />

            {/* Reduced Radial focus white glare */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background))_200%)] opacity-60 z-40 pointer-events-none" />
        </div>
    );
}
