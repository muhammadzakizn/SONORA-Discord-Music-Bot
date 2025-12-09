"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronRight,
    ChevronLeft,
    X,
    LayoutDashboard,
    Server,
    Settings,
    Music,
    Shield,
    Zap,
    CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TutorialStep {
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
}

const tutorialSteps: TutorialStep[] = [
    {
        icon: Shield,
        title: "Welcome to SONORA Admin!",
        description: "You're now logged in as an admin. This dashboard lets you manage the SONORA bot across all servers where you have admin permissions.",
        color: "from-purple-500 to-cyan-500",
    },
    {
        icon: LayoutDashboard,
        title: "Dashboard Overview",
        description: "The main dashboard shows your managed servers, bot status, system health, and recent activity. Keep an eye on voice connections and uptime.",
        color: "from-blue-500 to-purple-500",
    },
    {
        icon: Server,
        title: "Server Management",
        description: "In the Servers section, you can view all servers where the bot is active. Control music playback, manage queues, and configure settings per server.",
        color: "from-cyan-500 to-blue-500",
    },
    {
        icon: Music,
        title: "Music Controls",
        description: "Each server has its own music controls. Play, pause, skip, or stop tracks. View the current queue and manage playback from here.",
        color: "from-green-500 to-cyan-500",
    },
    {
        icon: Settings,
        title: "Settings & Profile",
        description: "Customize your experience in Settings. Update your display name, manage notifications, and configure language preferences.",
        color: "from-orange-500 to-rose-500",
    },
    {
        icon: Zap,
        title: "You're All Set!",
        description: "That's everything you need to know! If you need help, check the support section in the settings panel. Enjoy using SONORA!",
        color: "from-purple-500 to-pink-500",
    },
];

interface TutorialOverlayProps {
    isOpen: boolean;
    onComplete: () => void;
    onSkip: () => void;
}

export function TutorialOverlay({ isOpen, onComplete, onSkip }: TutorialOverlayProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(1);

    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === tutorialSteps.length - 1;
    const step = tutorialSteps[currentStep];
    const Icon = step.icon;

    const goNext = () => {
        if (isLastStep) {
            onComplete();
        } else {
            setDirection(1);
            setCurrentStep((prev) => prev + 1);
        }
    };

    const goPrev = () => {
        if (!isFirstStep) {
            setDirection(-1);
            setCurrentStep((prev) => prev - 1);
        }
    };

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 100 : -100,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction > 0 ? -100 : 100,
            opacity: 0,
        }),
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-2xl bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                    <div className="text-sm text-zinc-500">
                        Step {currentStep + 1} of {tutorialSteps.length}
                    </div>
                    <button
                        onClick={onSkip}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 min-h-[350px] flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={currentStep}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="flex flex-col items-center"
                        >
                            {/* Icon */}
                            <div className={cn(
                                "w-24 h-24 rounded-3xl bg-gradient-to-br flex items-center justify-center mb-6",
                                step.color
                            )}>
                                <Icon className="w-12 h-12 text-white" />
                            </div>

                            {/* Title */}
                            <h2 className="text-2xl font-bold mb-4">{step.title}</h2>

                            {/* Description */}
                            <p className="text-zinc-400 max-w-md leading-relaxed">
                                {step.description}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Progress Dots */}
                <div className="flex justify-center gap-2 pb-4">
                    {tutorialSteps.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                setDirection(index > currentStep ? 1 : -1);
                                setCurrentStep(index);
                            }}
                            className={cn(
                                "w-2 h-2 rounded-full transition-all duration-300",
                                index === currentStep
                                    ? "w-6 bg-gradient-to-r from-purple-500 to-cyan-500"
                                    : "bg-zinc-700 hover:bg-zinc-600"
                            )}
                        />
                    ))}
                </div>

                {/* Footer / Navigation */}
                <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
                    <button
                        onClick={goPrev}
                        disabled={isFirstStep}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                            isFirstStep
                                ? "text-zinc-600 cursor-not-allowed"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                        )}
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span>Previous</span>
                    </button>

                    <button
                        onClick={onSkip}
                        className="text-sm text-zinc-500 hover:text-white transition-colors"
                    >
                        Skip Tutorial
                    </button>

                    <button
                        onClick={goNext}
                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                        <span>{isLastStep ? "Get Started" : "Next"}</span>
                        {isLastStep ? (
                            <CheckCircle className="w-5 h-5" />
                        ) : (
                            <ChevronRight className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// Hook to manage tutorial state
export function useTutorial() {
    const [showTutorial, setShowTutorial] = useState(false);

    useEffect(() => {
        // Check if user has completed tutorial
        const tutorialCompleted = localStorage.getItem("sonora-tutorial-completed");
        if (!tutorialCompleted) {
            // Show tutorial after a short delay for first-time users
            const timer = setTimeout(() => {
                setShowTutorial(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, []);

    const completeTutorial = () => {
        localStorage.setItem("sonora-tutorial-completed", "true");
        setShowTutorial(false);
    };

    const skipTutorial = () => {
        localStorage.setItem("sonora-tutorial-completed", "true");
        setShowTutorial(false);
    };

    const resetTutorial = () => {
        localStorage.removeItem("sonora-tutorial-completed");
        setShowTutorial(true);
    };

    return {
        showTutorial,
        completeTutorial,
        skipTutorial,
        resetTutorial,
    };
}

export default TutorialOverlay;
