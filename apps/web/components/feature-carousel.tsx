'use client';

import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

interface Feature {
    title: string;
    desc: string;
    icon: string;
    detail: string;
    image: string;
}

export function FeatureCarousel({ features }: { features: Feature[] }) {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
        Autoplay({ delay: 5000, stopOnInteraction: true }),
    ]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        emblaApi.on('select', onSelect);
        onSelect();
        return () => {
            emblaApi.off('select', onSelect);
        };
    }, [emblaApi, onSelect]);

    const scrollTo = useCallback(
        (index: number) => {
            emblaApi?.scrollTo(index);
        },
        [emblaApi],
    );

    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Carousel viewport */}
            <div className="relative rounded-xl overflow-hidden" ref={emblaRef}>
                <div className="flex">
                    {features.map((feature) => (
                        <div key={feature.title} className="flex-[0_0_100%] min-w-0 relative">
                            {/* Slide container — 16:9 aspect ratio */}
                            <div className="relative aspect-[16/9] overflow-hidden bg-gray-900">
                                {/* Screenshot image — top-aligned, full width, bottom crops */}
                                <img
                                    src={feature.image}
                                    alt={`${feature.title} screenshot`}
                                    className="w-full h-full object-cover object-top"
                                    loading="lazy"
                                />

                                {/* Gradient overlay + text at bottom */}
                                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 px-6 pb-5 pt-8">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xl">{feature.icon}</span>
                                        <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                                    </div>
                                    <p className="text-sm text-white/90 line-clamp-2">{feature.detail}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Prev / Next arrows */}
                <button
                    onClick={scrollPrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                    aria-label="Previous slide"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button
                    onClick={scrollNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                    aria-label="Next slide"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-2 mt-4">
                {features.map((feature, idx) => (
                    <button
                        key={feature.title}
                        onClick={() => scrollTo(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${idx === selectedIndex
                                ? 'bg-primary-600 dark:bg-primary-400'
                                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                            }`}
                        aria-label={`Go to slide ${idx + 1}: ${feature.title}`}
                    />
                ))}
            </div>
        </div>
    );
}
