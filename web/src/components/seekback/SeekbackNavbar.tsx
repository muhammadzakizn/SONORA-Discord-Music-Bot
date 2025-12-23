"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SeekbackNavbarProps {
    selectedYear: number;
    selectedMonth: number;
    onMonthChange: (month: number) => void;
    onYearChange: (year: number) => void;
    isScrolled: boolean;
}

const MONTHS = [
    { short: "Jan", full: "January" },
    { short: "Feb", full: "February" },
    { short: "Mar", full: "March" },
    { short: "Apr", full: "April" },
    { short: "May", full: "May" },
    { short: "Jun", full: "June" },
    { short: "Jul", full: "July" },
    { short: "Aug", full: "August" },
    { short: "Sep", full: "September" },
    { short: "Oct", full: "October" },
    { short: "Nov", full: "November" },
    { short: "Dec", full: "December" },
];

export function SeekbackNavbar({
    selectedYear,
    selectedMonth,
    onMonthChange,
    onYearChange,
    isScrolled,
}: SeekbackNavbarProps) {
    const monthsContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    // Check scroll position for chevrons
    const checkScroll = () => {
        if (monthsContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = monthsContainerRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        checkScroll();
        const container = monthsContainerRef.current;
        if (container) {
            container.addEventListener("scroll", checkScroll);
            return () => container.removeEventListener("scroll", checkScroll);
        }
    }, []);

    const scrollMonths = (direction: "left" | "right") => {
        if (monthsContainerRef.current) {
            const scrollAmount = 200;
            monthsContainerRef.current.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth",
            });
        }
    };

    // Get current year's last 2 digits
    const yearShort = `'${selectedYear.toString().slice(-2)}`;

    return (
        <nav
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                isScrolled
                    ? "bg-black/60 backdrop-blur-xl border-b border-white/10"
                    : "bg-transparent"
            )}
        >
            {/* Top Row - Logos */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3">
                {/* Left - Seekback Logo */}
                <div className="flex items-center gap-2">
                    <Image
                        src="/seekback-logo.png"
                        alt="Seekback"
                        width={28}
                        height={28}
                        className="invert"
                    />
                    <span className="text-white font-semibold text-lg tracking-tight">
                        Seekback{yearShort}
                    </span>
                </div>

                {/* Right - SONORA Logo */}
                <Image
                    src="/sonora-logo.png"
                    alt="SONORA"
                    width={90}
                    height={28}
                    className="h-6 w-auto brightness-0 invert"
                />
            </div>

            {/* Bottom Row - Year and Months */}
            <div className="flex items-center px-4 sm:px-6 pb-3">
                {/* Year */}
                <button
                    onClick={() => onYearChange(selectedYear)}
                    className="flex items-center gap-1 text-amber-400 font-bold text-sm mr-2 shrink-0"
                >
                    {selectedYear}
                </button>

                {/* Left Chevron */}
                <button
                    onClick={() => scrollMonths("left")}
                    className={cn(
                        "p-1 shrink-0 transition-opacity",
                        canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                >
                    <ChevronLeft className="w-4 h-4 text-white/60" />
                </button>

                {/* Months */}
                <div
                    ref={monthsContainerRef}
                    className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 px-1"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                    {MONTHS.map((month, index) => {
                        const monthNum = index + 1;
                        const isSelected = selectedMonth === monthNum;

                        return (
                            <button
                                key={month.short}
                                onClick={() => onMonthChange(monthNum)}
                                className="relative px-3 py-1.5 shrink-0"
                            >
                                {/* Active indicator pill */}
                                {isSelected && (
                                    <motion.div
                                        layoutId="month-indicator"
                                        className="absolute inset-0 bg-[#7B1E3C] rounded-full"
                                        transition={{
                                            type: "spring",
                                            stiffness: 400,
                                            damping: 30,
                                        }}
                                    />
                                )}
                                <span
                                    className={cn(
                                        "relative z-10 text-sm font-medium transition-colors",
                                        isSelected ? "text-white" : "text-white/60 hover:text-white/80"
                                    )}
                                >
                                    {month.short}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Right Chevron */}
                <button
                    onClick={() => scrollMonths("right")}
                    className={cn(
                        "p-1 shrink-0 transition-opacity",
                        canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                >
                    <ChevronRight className="w-4 h-4 text-white/60" />
                </button>
            </div>
        </nav>
    );
}
