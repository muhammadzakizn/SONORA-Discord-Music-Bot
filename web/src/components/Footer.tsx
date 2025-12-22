"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUp } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

export function Footer() {
    const { isDark, t } = useSettings();

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <footer className={`mt-24 md:mt-32 py-10 md:py-16 px-4 border-t ${isDark ? 'border-zinc-800 bg-black' : 'border-gray-200 bg-white'}`}>
            <div className="max-w-6xl mx-auto">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand Section */}
                    <div className="md:col-span-1">
                        <Image
                            src="/sonora-logo.png"
                            alt="SONORA"
                            width={150}
                            height={60}
                            className="h-10 w-auto logo-adaptive mb-4"
                        />
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {t('hero.description') || 'Experience crystal-clear music with advanced features. Fast, reliable, and easy to use.'}
                        </p>
                    </div>

                    {/* Navigation Links */}
                    <div>
                        <h4 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {t('nav.explore') || 'Explore'}
                        </h4>
                        <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            <li>
                                <Link href="/" className="hover:text-[#7B1E3C] transition-colors">
                                    {t('nav.home') || 'Home'}
                                </Link>
                            </li>
                            <li>
                                <Link href="/login" className="hover:text-[#7B1E3C] transition-colors">
                                    {t('nav.dashboard') || 'Dashboard'}
                                </Link>
                            </li>
                            <li>
                                <a
                                    href="https://discord.com/oauth2/authorize?client_id=1091025686553034804&permissions=3147776&scope=bot%20applications.commands"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-[#7B1E3C] transition-colors"
                                >
                                    {t('hero.addBot') || 'Add SONORA Now'}
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h4 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {t('footer.legal') || 'Legal'}
                        </h4>
                        <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            <li>
                                <Link href="/terms" className="hover:text-[#7B1E3C] transition-colors">
                                    {t('legal.terms') || 'Terms of Service'}
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="hover:text-[#7B1E3C] transition-colors">
                                    {t('legal.privacy') || 'Privacy Policy'}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources Links */}
                    <div>
                        <h4 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {t('footer.resources') || 'Resources'}
                        </h4>
                        <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            <li>
                                <Link href="/docs" className="hover:text-[#7B1E3C] transition-colors">
                                    {t('docs.title') || 'Documentation'}
                                </Link>
                            </li>
                            <li>
                                <Link href="/support" className="hover:text-[#7B1E3C] transition-colors">
                                    {t('support.title') || 'Support'}
                                </Link>
                            </li>
                            <li>
                                <a
                                    href="https://github.com/muhammadzakizn/SONORA-Discord-Music-Bot"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-[#7B1E3C] transition-colors"
                                >
                                    GitHub
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Divider and Bottom Section */}
                <div className={`border-t ${isDark ? 'border-zinc-800' : 'border-gray-200'} pt-6`}>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            © 2024-2026 SONORA Bot. {t('footer.rights') || 'All rights reserved.'}
                        </p>

                        {/* Scroll to Top Button */}
                        <button
                            onClick={scrollToTop}
                            className={`p-2 rounded-full border transition-colors ${isDark
                                ? 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800'
                                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-100'
                                }`}
                            aria-label="Scroll to top"
                        >
                            <ArrowUp className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        </button>

                        <div className={`flex gap-4 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <span>{t('footer.createdBy') || 'Created by'} Muhammad Zaky</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
