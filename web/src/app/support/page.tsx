"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
    ArrowLeft, HelpCircle, MessageCircle, ChevronDown, ChevronUp,
    ExternalLink, Mail, Phone, Music, Zap, Shield, Clock
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

// Discord Icon
const DiscordIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
);

// WhatsApp Icon
const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

// FAQ Data
const faqData = [
    {
        question: "How do I add SONORA to my server?",
        answer: "Click the 'Add SONORA' button on our homepage or use the direct invite link. You'll need 'Manage Server' permission to add bots to a Discord server.",
        icon: Music
    },
    {
        question: "Why isn't SONORA playing music?",
        answer: "Make sure you're in a voice channel, the bot has permission to connect and speak, and the music source is available. Try using /play with a different source if one doesn't work.",
        icon: Zap
    },
    {
        question: "Is SONORA free to use?",
        answer: "Yes! SONORA is completely free. We don't have premium tiers or paid features - all functionality is available to everyone.",
        icon: Shield
    },
    {
        question: "What music sources are supported?",
        answer: "SONORA supports Spotify, YouTube, YouTube Music, and Apple Music. Simply paste a link or search by name.",
        icon: Music
    },
    {
        question: "How do I control who can use the bot?",
        answer: "Enable DJ-only mode in your server settings. This restricts playback controls to users with the 'DJ' role. Server admins always have full control.",
        icon: Shield
    },
    {
        question: "Why is there a delay before music starts?",
        answer: "SONORA needs to fetch and process the audio. Usually this takes 1-2 seconds. If it takes longer, the source might be experiencing issues.",
        icon: Clock
    },
    {
        question: "Can I play playlists?",
        answer: "Yes! Just paste a playlist link from Spotify, YouTube, or Apple Music. Use /playlist command or just /play with the playlist URL.",
        icon: Music
    },
    {
        question: "How do I report a bug or request a feature?",
        answer: "Contact us via Discord (@thixxert) or WhatsApp. We actively monitor feedback and continuously improve SONORA.",
        icon: HelpCircle
    }
];

export default function SupportPage() {
    const { isDark } = useSettings();

    return (
        <div className={`min-h-screen ${isDark ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
            {/* Header */}
            <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${isDark ? 'bg-black/80 border-white/10' : 'bg-white/80 border-gray-200'
                }`}>
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link
                        href="/"
                        className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                            }`}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Image
                            src="/sonora-logo.png"
                            alt="SONORA"
                            width={100}
                            height={40}
                            className="h-8 w-auto"
                        />
                    </div>
                </div>
            </header>

            {/* Content */}
            <motion.main
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto px-4 py-12 pb-32"
            >
                {/* Title Section */}
                <div className="text-center mb-12">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 ${isDark ? 'bg-[#7B1E3C]/20' : 'bg-[#7B1E3C]/10'
                        }`}>
                        <HelpCircle className="w-8 h-8 text-[#7B1E3C]" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">Support</h1>
                    <p className={isDark ? 'text-white/60' : 'text-gray-500'}>
                        Get help with SONORA or reach out to our team
                    </p>
                </div>

                {/* Contact Cards */}
                <div className="grid md:grid-cols-2 gap-4 mb-12">
                    <ContactCard
                        icon={<DiscordIcon />}
                        platform="Discord"
                        handle="@thixxert"
                        description="Best for quick questions"
                        href="https://discord.com/users/thixxert"
                        color="#5865F2"
                        isDark={isDark}
                    />
                    <ContactCard
                        icon={<WhatsAppIcon />}
                        platform="WhatsApp"
                        handle="+62 851-5611-0231"
                        description="For urgent support"
                        href="https://wa.me/6285156110231"
                        color="#25D366"
                        isDark={isDark}
                    />
                </div>

                {/* FAQ Section */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <MessageCircle className="w-6 h-6 text-[#7B1E3C]" />
                        Frequently Asked Questions
                    </h2>
                    <div className="space-y-3">
                        {faqData.map((faq, index) => (
                            <FAQItem key={index} {...faq} isDark={isDark} />
                        ))}
                    </div>
                </section>

                {/* Quick Links */}
                <section>
                    <h2 className="text-2xl font-bold mb-6">Quick Links</h2>
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <QuickLink
                            href="/docs"
                            title="Documentation"
                            description="Setup guides & commands"
                            isDark={isDark}
                        />
                        <QuickLink
                            href="/terms"
                            title="Terms of Service"
                            description="Usage terms"
                            isDark={isDark}
                        />
                        <QuickLink
                            href="/privacy"
                            title="Privacy Policy"
                            description="How we handle data"
                            isDark={isDark}
                        />
                    </div>
                </section>
            </motion.main>
        </div>
    );
}

// Contact Card Component
function ContactCard({ icon, platform, handle, description, href, color, isDark }: {
    icon: React.ReactNode;
    platform: string;
    handle: string;
    description: string;
    href: string;
    color: string;
    isDark: boolean;
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`block p-6 rounded-2xl transition-all group ${isDark
                    ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                    : 'bg-white hover:bg-gray-50 border border-gray-200 shadow-sm'
                }`}
        >
            <div className="flex items-start gap-4">
                <div
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: color + '20' }}
                >
                    <div style={{ color }}>{icon}</div>
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{platform}</h3>
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="font-medium" style={{ color }}>{handle}</p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        {description}
                    </p>
                </div>
            </div>
        </a>
    );
}

// FAQ Item Component
function FAQItem({ question, answer, icon: Icon, isDark }: {
    question: string;
    answer: string;
    icon: React.ElementType;
    isDark: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-white/5' : 'bg-white border border-gray-200'
            }`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 flex items-center gap-4 text-left transition-colors hover:bg-black/5"
            >
                <div className={`p-2 rounded-lg ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                    <Icon className="w-4 h-4 text-[#7B1E3C]" />
                </div>
                <span className="flex-1 font-medium">{question}</span>
                {isOpen ? (
                    <ChevronUp className={`w-5 h-5 ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
                ) : (
                    <ChevronDown className={`w-5 h-5 ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
                )}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className={`px-4 pb-4 pl-16 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                            {answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Quick Link Component
function QuickLink({ href, title, description, isDark }: {
    href: string;
    title: string;
    description: string;
    isDark: boolean;
}) {
    return (
        <Link
            href={href}
            className={`block p-4 rounded-xl transition-all ${isDark
                    ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
        >
            <h3 className="font-medium mb-1">{title}</h3>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                {description}
            </p>
        </Link>
    );
}
