"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
    ArrowLeft, BookOpen, Play, Settings, Command, Server,
    Music, List, Volume2, Repeat, Shuffle, Search, Plus,
    ChevronRight, Terminal, Globe, Sparkles
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

export default function DocumentationPage() {
    const { isDark } = useSettings();

    return (
        <div className={`min-h-screen ${isDark ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
            {/* Header */}
            <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${isDark ? 'bg-black/80 border-white/10' : 'bg-white/80 border-gray-200'
                }`}>
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
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
                className="max-w-5xl mx-auto px-4 py-12 pb-32"
            >
                {/* Title Section */}
                <div className="text-center mb-12">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 ${isDark ? 'bg-[#7B1E3C]/20' : 'bg-[#7B1E3C]/10'
                        }`}>
                        <BookOpen className="w-8 h-8 text-[#7B1E3C]" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">Documentation</h1>
                    <p className={isDark ? 'text-white/60' : 'text-gray-500'}>
                        Everything you need to know to use SONORA in your Discord server
                    </p>
                </div>

                {/* Quick Start Cards */}
                <div className="grid md:grid-cols-3 gap-4 mb-12">
                    <QuickStartCard
                        icon={Plus}
                        title="Getting Started"
                        description="Add SONORA to your server"
                        href="#getting-started"
                        isDark={isDark}
                    />
                    <QuickStartCard
                        icon={Command}
                        title="Commands"
                        description="View all bot commands"
                        href="#commands"
                        isDark={isDark}
                    />
                    <QuickStartCard
                        icon={Settings}
                        title="Configuration"
                        description="Customize bot settings"
                        href="#configuration"
                        isDark={isDark}
                    />
                </div>

                {/* Documentation Sections */}
                <div className="space-y-12">
                    {/* Getting Started */}
                    <Section id="getting-started" title="Getting Started" icon={Sparkles} isDark={isDark}>
                        <p>
                            Follow these steps to add SONORA to your Discord server and start playing music:
                        </p>

                        <Step number={1} title="Invite SONORA to Your Server" isDark={isDark}>
                            <p>Click the button below or use the invite link to add SONORA to your server:</p>
                            <a
                                href="https://discord.com/oauth2/authorize?client_id=1443855259536461928&permissions=2534224044489536&integration_type=0&scope=bot+applications.commands"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 mt-2 rounded-xl bg-[#7B1E3C] text-white font-medium hover:bg-[#9B2E4C] transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add SONORA to Server
                            </a>
                        </Step>

                        <Step number={2} title="Join a Voice Channel" isDark={isDark}>
                            <p>Join any voice channel in your server. SONORA will automatically connect when you play music.</p>
                        </Step>

                        <Step number={3} title="Play Your First Song" isDark={isDark}>
                            <p>Use the <code className={`px-2 py-1 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>/play</code> command followed by a song name, URL, or playlist link:</p>
                            <CodeBlock isDark={isDark}>
                                /play Blinding Lights The Weeknd{'\n'}
                                /play https://open.spotify.com/track/...{'\n'}
                                /play https://www.youtube.com/watch?v=...
                            </CodeBlock>
                        </Step>
                    </Section>

                    {/* Commands */}
                    <Section id="commands" title="Commands Reference" icon={Terminal} isDark={isDark}>
                        <p>SONORA uses Discord slash commands. Type <code className={`px-2 py-1 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>/</code> to see all available commands.</p>

                        <CommandCategory title="Playback Commands" isDark={isDark}>
                            <CommandItem cmd="/play" args="<query>" desc="Play a song or add to queue" isDark={isDark} />
                            <CommandItem cmd="/pause" desc="Pause the current track" isDark={isDark} />
                            <CommandItem cmd="/resume" desc="Resume playback" isDark={isDark} />
                            <CommandItem cmd="/stop" desc="Stop playback and clear queue" isDark={isDark} />
                            <CommandItem cmd="/skip" desc="Skip to the next track" isDark={isDark} />
                            <CommandItem cmd="/previous" desc="Go back to the previous track" isDark={isDark} />
                            <CommandItem cmd="/seek" args="<timestamp>" desc="Jump to a specific time (e.g., 1:30)" isDark={isDark} />
                        </CommandCategory>

                        <CommandCategory title="Queue Commands" isDark={isDark}>
                            <CommandItem cmd="/queue" desc="View the current queue" isDark={isDark} />
                            <CommandItem cmd="/shuffle" desc="Shuffle the queue" isDark={isDark} />
                            <CommandItem cmd="/loop" args="[off|track|queue]" desc="Set loop mode" isDark={isDark} />
                            <CommandItem cmd="/move" args="<from> <to>" desc="Move a track in the queue" isDark={isDark} />
                            <CommandItem cmd="/remove" args="<position>" desc="Remove a track from queue" isDark={isDark} />
                            <CommandItem cmd="/clear" desc="Clear the entire queue" isDark={isDark} />
                        </CommandCategory>

                        <CommandCategory title="Audio Commands" isDark={isDark}>
                            <CommandItem cmd="/volume" args="<0-100>" desc="Set the playback volume" isDark={isDark} />
                            <CommandItem cmd="/nowplaying" desc="Show the current track" isDark={isDark} />
                            <CommandItem cmd="/lyrics" desc="Display lyrics for current song" isDark={isDark} />
                        </CommandCategory>

                        <CommandCategory title="Search Commands" isDark={isDark}>
                            <CommandItem cmd="/search" args="<query>" desc="Search and select from results" isDark={isDark} />
                            <CommandItem cmd="/playlist" args="<url>" desc="Load an entire playlist" isDark={isDark} />
                        </CommandCategory>
                    </Section>

                    {/* Configuration */}
                    <Section id="configuration" title="Configuration" icon={Settings} isDark={isDark}>
                        <p>
                            Customize SONORA for your server through the web dashboard or using commands.
                        </p>

                        <SubSection title="Web Dashboard" isDark={isDark}>
                            <p>
                                Access the <Link href="/login" className="text-[#7B1E3C] hover:underline">admin dashboard</Link> to
                                configure server-specific settings including:
                            </p>
                            <ul>
                                <li>Default volume level</li>
                                <li>DJ-only mode (restrict controls to DJ role)</li>
                                <li>Track announcements</li>
                                <li>Auto-play suggestions</li>
                                <li>Music channel restrictions</li>
                            </ul>
                        </SubSection>

                        <SubSection title="DJ Role" isDark={isDark}>
                            <p>
                                Enable DJ-only mode to restrict playback controls to users with the "DJ" role.
                                Server admins always have full control.
                            </p>
                        </SubSection>

                        <SubSection title="Music Channel" isDark={isDark}>
                            <p>
                                Optionally restrict bot commands to a specific text channel to keep your
                                server organized.
                            </p>
                        </SubSection>
                    </Section>

                    {/* Supported Platforms */}
                    <Section id="platforms" title="Supported Platforms" icon={Globe} isDark={isDark}>
                        <p>SONORA supports music from multiple platforms:</p>

                        <div className="grid md:grid-cols-3 gap-4 mt-4">
                            <PlatformCard
                                name="Spotify"
                                description="Tracks, albums, and playlists"
                                color="#1DB954"
                                isDark={isDark}
                            />
                            <PlatformCard
                                name="YouTube"
                                description="Videos and playlists"
                                color="#FF0000"
                                isDark={isDark}
                            />
                            <PlatformCard
                                name="Apple Music"
                                description="Tracks and albums"
                                color="#FC3C44"
                                isDark={isDark}
                            />
                        </div>

                        <div className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                            <p className={`text-sm ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                                <strong>Note:</strong> SONORA uses a 3-tier fallback system. If a track isn't
                                available on one platform, it automatically searches alternatives to ensure
                                playback success.
                            </p>
                        </div>
                    </Section>
                </div>
            </motion.main>
        </div>
    );
}

// Quick Start Card
function QuickStartCard({ icon: Icon, title, description, href, isDark }: {
    icon: React.ElementType;
    title: string;
    description: string;
    href: string;
    isDark: boolean;
}) {
    return (
        <a
            href={href}
            className={`block p-6 rounded-2xl transition-all group ${isDark
                    ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
        >
            <Icon className="w-8 h-8 text-[#7B1E3C] mb-3" />
            <h3 className="font-semibold mb-1 flex items-center gap-2">
                {title}
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{description}</p>
        </a>
    );
}

// Section Component
function Section({ id, title, icon: Icon, children, isDark }: {
    id: string;
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    isDark: boolean;
}) {
    return (
        <section id={id} className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-[#7B1E3C]/20' : 'bg-[#7B1E3C]/10'}`}>
                    <Icon className="w-6 h-6 text-[#7B1E3C]" />
                </div>
                <h2 className="text-2xl font-bold">{title}</h2>
            </div>
            <div className={`space-y-4 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                {children}
            </div>
        </section>
    );
}

// SubSection Component
function SubSection({ title, children, isDark }: { title: string; children: React.ReactNode; isDark: boolean }) {
    return (
        <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
            <h3 className="font-semibold mb-2">{title}</h3>
            <div className={isDark ? 'text-white/70' : 'text-gray-600'}>
                {children}
            </div>
        </div>
    );
}

// Step Component
function Step({ number, title, children, isDark }: {
    number: number;
    title: string;
    children: React.ReactNode;
    isDark: boolean;
}) {
    return (
        <div className="mt-6 flex gap-4">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isDark ? 'bg-[#7B1E3C] text-white' : 'bg-[#7B1E3C] text-white'
                }`}>
                {number}
            </div>
            <div className="flex-1">
                <h3 className="font-semibold mb-2">{title}</h3>
                <div className={isDark ? 'text-white/70' : 'text-gray-600'}>
                    {children}
                </div>
            </div>
        </div>
    );
}

// Code Block Component
function CodeBlock({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
    return (
        <pre className={`mt-2 p-4 rounded-xl overflow-x-auto font-mono text-sm ${isDark ? 'bg-white/5 text-white/80' : 'bg-gray-900 text-gray-100'
            }`}>
            {children}
        </pre>
    );
}

// Command Category
function CommandCategory({ title, children, isDark }: {
    title: string;
    children: React.ReactNode;
    isDark: boolean;
}) {
    return (
        <div className="mt-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Command className="w-4 h-4 text-[#7B1E3C]" />
                {title}
            </h3>
            <div className={`space-y-2 ${isDark ? 'bg-white/5' : 'bg-gray-100'} rounded-xl p-4`}>
                {children}
            </div>
        </div>
    );
}

// Command Item
function CommandItem({ cmd, args, desc, isDark }: {
    cmd: string;
    args?: string;
    desc: string;
    isDark: boolean;
}) {
    return (
        <div className="flex items-center gap-4 py-2">
            <code className={`px-2 py-1 rounded font-mono text-sm ${isDark ? 'bg-black/30 text-[#7B1E3C]' : 'bg-white text-[#7B1E3C]'
                }`}>
                {cmd}
                {args && <span className={isDark ? 'text-white/50' : 'text-gray-400'}> {args}</span>}
            </code>
            <span className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{desc}</span>
        </div>
    );
}

// Platform Card
function PlatformCard({ name, description, color, isDark }: {
    name: string;
    description: string;
    color: string;
    isDark: boolean;
}) {
    return (
        <div className={`p-4 rounded-xl border-2 ${isDark ? 'bg-white/5' : 'bg-white'}`} style={{ borderColor: color + '40' }}>
            <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-semibold">{name}</span>
            </div>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{description}</p>
        </div>
    );
}
