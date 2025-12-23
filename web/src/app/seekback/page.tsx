"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
import { SeekbackNavbar } from "@/components/seekback/SeekbackNavbar";

export default function SeekbackPage() {
    const { isDark } = useSettings();
    const [isScrolled, setIsScrolled] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    // Handle scroll for navbar frosted effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div
            className={cn(
                "min-h-screen w-full",
                "bg-black"
            )}
        >
            {/* Navbar */}
            <SeekbackNavbar
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                onYearChange={setSelectedYear}
                isScrolled={isScrolled}
            />

            {/* Content placeholder with padding for navbar */}
            <div className="pt-28">
                {/* Content will go here */}
            </div>
        </div>
    );
}
