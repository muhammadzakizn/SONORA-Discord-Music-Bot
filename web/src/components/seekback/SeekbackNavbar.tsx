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
                    ? "bg-black/70 backdrop-blur-xl border-b border-white/10"
                    : "bg-transparent"
            )}
        >
            {/* Container with max width for large screens */}
            <div className="max-w-6xl mx-auto">
                {/* Top Row - Logos */}
                <div className="flex items-center justify-between px-6 pt-4 pb-2">
                    {/* Left - Seekback Logo + Year */}
                    <div className="flex items-center gap-1">
                        <Image
                            src="/seekback-logo.png"
                            alt="Seekback"
                            width={148}
                            height={148}
                            className="-mr-2"
                        />
                        <span className="text-white font-medium text-2xl tracking-tight">
                            {yearShort}
                        </span>
                    </div>

                    {/* Right - SONORA Logo */}
                    <Image
                        src="/sonora-logo.png"
                        alt="SONORA"
                        width={252}
                        height={80}
                        className="h-14 w-auto brightness-0 invert opacity-80"
                    />
                </div>

                {/* Bottom Row - Year and Months */}
                <div className="flex items-center px-6 pb-4 gap-4">
                    {/* Year */}
                    <button
                        onClick={() => onYearChange(selectedYear)}
                        className="text-amber-400 font-bold text-base shrink-0"
                    >
                        {selectedYear}
                    </button>

                    {/* Months Row */}
                    <div className="flex items-center gap-2 flex-1 overflow-hidden">
                        {/* Left Chevron - only show when can scroll */}
                        <button
                            onClick={() => scrollMonths("left")}
                            className={cn(
                                "p-1 shrink-0 transition-opacity",
                                canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
                            )}
                        >
                            <ChevronLeft className="w-5 h-5 text-white/60" />
                        </button>

                        {/* Months */}
                        <div
                            ref={monthsContainerRef}
                            className="flex items-center gap-10 overflow-x-auto scrollbar-hide"
                            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                        >
                            {MONTHS.map((month, index) => {
                                const monthNum = index + 1;
                                const isSelected = selectedMonth === monthNum;

                                return (
                                    <button
                                        key={month.short}
                                        onClick={() => onMonthChange(monthNum)}
                                        className="relative px-4 py-1.5 shrink-0"
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
                                                "relative z-10 text-base font-medium transition-colors",
                                                isSelected ? "text-white" : "text-white/50 hover:text-white/70"
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
                            <ChevronRight className="w-5 h-5 text-white/60" />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
