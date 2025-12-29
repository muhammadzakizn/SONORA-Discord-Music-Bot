"use client";

import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check, Code, Eye, MousePointer2 } from "lucide-react";

interface ElementInfo {
    tagName: string;
    className: string;
    id: string;
    textContent: string;
    rect: DOMRect;
    computedStyles: {
        backgroundColor: string;
        color: string;
        fontSize: string;
        padding: string;
        margin: string;
        display: string;
        position: string;
    };
    dataAttributes: Record<string, string>;
    reactInfo?: {
        componentName?: string;
        props?: Record<string, unknown>;
    };
}

interface ElementInspectorProps {
    isActive: boolean;
    onClose: () => void;
}

export function ElementInspector({ isActive, onClose }: ElementInspectorProps) {
    const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
    const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);
    const [copied, setCopied] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Get React component info from fiber
    const getReactInfo = useCallback((element: HTMLElement) => {
        try {
            // Try to find React fiber
            const fiberKey = Object.keys(element).find(
                (key) => key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$")
            );

            if (fiberKey) {
                const fiber = (element as unknown as Record<string, unknown>)[fiberKey] as {
                    type?: { name?: string; displayName?: string };
                    memoizedProps?: Record<string, unknown>;
                    return?: unknown;
                };

                // Traverse up to find component name
                let current: typeof fiber | null = fiber;
                let componentName = "";

                while (current) {
                    const fiberType = current.type as { name?: string; displayName?: string } | undefined;
                    if (fiberType && typeof fiberType === "object") {
                        componentName = fiberType.name || fiberType.displayName || "";
                        if (componentName && componentName !== "Anonymous") break;
                    }
                    current = current.return as typeof fiber;
                }

                return {
                    componentName: componentName || "Unknown Component",
                    props: fiber?.memoizedProps ?
                        Object.fromEntries(
                            Object.entries(fiber.memoizedProps).filter(
                                ([key]) => !key.startsWith("__") && key !== "children"
                            ).slice(0, 10)
                        ) : {}
                };
            }
        } catch {
            // Ignore errors when accessing React internals
        }
        return undefined;
    }, []);

    // Extract element info
    const getElementInfo = useCallback((element: HTMLElement): ElementInfo => {
        const styles = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        // Get data attributes
        const dataAttributes: Record<string, string> = {};
        Array.from(element.attributes).forEach((attr) => {
            if (attr.name.startsWith("data-")) {
                dataAttributes[attr.name] = attr.value;
            }
        });
        // className can be SVGAnimatedString for SVG elements, so convert to string
        const classNameStr = typeof element.className === 'string'
            ? element.className
            : ((element.className as unknown as { baseVal?: string })?.baseVal || element.getAttribute('class') || '');

        return {
            tagName: element.tagName.toLowerCase(),
            className: classNameStr,
            id: element.id,
            textContent: element.textContent?.slice(0, 100) || "",
            rect,
            computedStyles: {
                backgroundColor: styles.backgroundColor,
                color: styles.color,
                fontSize: styles.fontSize,
                padding: styles.padding,
                margin: styles.margin,
                display: styles.display,
                position: styles.position,
            },
            dataAttributes,
            reactInfo: getReactInfo(element),
        };
    }, [getReactInfo]);

    // Handle mouse move for hover highlight
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isActive) return;

        const target = e.target as HTMLElement;
        if (target && !target.closest(".element-inspector-overlay")) {
            setHoveredElement(target);
        }
    }, [isActive]);

    // Handle click to select element
    const handleClick = useCallback((e: MouseEvent) => {
        if (!isActive) return;

        const target = e.target as HTMLElement;
        if (target && !target.closest(".element-inspector-overlay")) {
            e.preventDefault();
            e.stopPropagation();
            setSelectedElement(getElementInfo(target));
            setHoveredElement(null);
        }
    }, [isActive, getElementInfo]);

    // Handle escape to close
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape") {
            if (selectedElement) {
                setSelectedElement(null);
            } else {
                onClose();
            }
        }
    }, [selectedElement, onClose]);

    // Add/remove event listeners
    useEffect(() => {
        if (isActive) {
            document.addEventListener("mousemove", handleMouseMove, true);
            document.addEventListener("click", handleClick, true);
            document.addEventListener("keydown", handleKeyDown);
            document.body.style.cursor = "crosshair";
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove, true);
            document.removeEventListener("click", handleClick, true);
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.cursor = "";
        };
    }, [isActive, handleMouseMove, handleClick, handleKeyDown]);

    // Generate copyable text for AI
    const generateCopyText = useCallback(() => {
        if (!selectedElement) return "";

        const lines = [
            "# Element Inspector Report",
            "",
            "## Element Details",
            `- Tag: <${selectedElement.tagName}>`,
            selectedElement.id ? `- ID: #${selectedElement.id}` : "",
            selectedElement.className ? `- Classes: .${selectedElement.className.split(" ").join(" .")}` : "",
            "",
            "## React Component",
            selectedElement.reactInfo?.componentName
                ? `- Component: ${selectedElement.reactInfo.componentName}`
                : "- Component: (Not detected)",
            "",
            "## Styles",
            `- Display: ${selectedElement.computedStyles.display}`,
            `- Position: ${selectedElement.computedStyles.position}`,
            `- Background: ${selectedElement.computedStyles.backgroundColor}`,
            `- Color: ${selectedElement.computedStyles.color}`,
            `- Font Size: ${selectedElement.computedStyles.fontSize}`,
            `- Padding: ${selectedElement.computedStyles.padding}`,
            `- Margin: ${selectedElement.computedStyles.margin}`,
            "",
            "## Dimensions",
            `- Width: ${Math.round(selectedElement.rect.width)}px`,
            `- Height: ${Math.round(selectedElement.rect.height)}px`,
            `- Position: (${Math.round(selectedElement.rect.x)}, ${Math.round(selectedElement.rect.y)})`,
        ];

        if (selectedElement.textContent) {
            lines.push("", "## Text Content", `"${selectedElement.textContent.trim().slice(0, 200)}..."`);
        }

        if (Object.keys(selectedElement.dataAttributes).length > 0) {
            lines.push("", "## Data Attributes");
            Object.entries(selectedElement.dataAttributes).forEach(([key, value]) => {
                lines.push(`- ${key}="${value}"`);
            });
        }

        if (selectedElement.reactInfo?.props && Object.keys(selectedElement.reactInfo.props).length > 0) {
            lines.push("", "## React Props");
            Object.entries(selectedElement.reactInfo.props).forEach(([key, value]) => {
                lines.push(`- ${key}: ${JSON.stringify(value)}`);
            });
        }

        return lines.filter(Boolean).join("\n");
    }, [selectedElement]);

    // Copy to clipboard
    const handleCopy = useCallback(async () => {
        const text = generateCopyText();
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [generateCopyText]);

    if (!mounted || !isActive) return null;

    return createPortal(
        <div className="element-inspector-overlay">
            {/* Hover highlight */}
            {hoveredElement && !selectedElement && (
                <div
                    className="fixed pointer-events-none border-2 border-pink-500 bg-pink-500/10 z-[99999]"
                    style={{
                        top: hoveredElement.getBoundingClientRect().top,
                        left: hoveredElement.getBoundingClientRect().left,
                        width: hoveredElement.getBoundingClientRect().width,
                        height: hoveredElement.getBoundingClientRect().height,
                    }}
                >
                    <div className="absolute -top-6 left-0 bg-pink-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {`<${hoveredElement.tagName.toLowerCase()}>`}
                        {(() => {
                            const cn = typeof hoveredElement.className === 'string'
                                ? hoveredElement.className
                                : ((hoveredElement.className as unknown as { baseVal?: string })?.baseVal || '');
                            return cn ? ` .${cn.split(" ")[0]}` : '';
                        })()}
                    </div>
                </div>
            )}

            {/* Selected element info panel */}
            {selectedElement && (
                <>
                    {/* Highlight selected element */}
                    <div
                        className="fixed pointer-events-none border-2 border-emerald-400 bg-emerald-400/10 z-[99998]"
                        style={{
                            top: selectedElement.rect.top,
                            left: selectedElement.rect.left,
                            width: selectedElement.rect.width,
                            height: selectedElement.rect.height,
                        }}
                    />

                    {/* Info panel */}
                    <div className="fixed bottom-4 right-4 w-96 max-h-[80vh] bg-neutral-900/95 backdrop-blur-lg border border-neutral-700 rounded-xl shadow-2xl z-[100000] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-neutral-700 bg-neutral-800/50">
                            <div className="flex items-center gap-2">
                                <Code size={18} className="text-pink-400" />
                                <span className="font-semibold text-white">Element Inspector</span>
                            </div>
                            <button
                                onClick={() => setSelectedElement(null)}
                                className="p-1 hover:bg-neutral-700 rounded transition-colors"
                            >
                                <X size={18} className="text-neutral-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh] text-sm">
                            {/* Tag & Classes */}
                            <div>
                                <div className="text-neutral-400 text-xs uppercase tracking-wide mb-1">Element</div>
                                <code className="text-emerald-400 bg-neutral-800 px-2 py-1 rounded text-xs">
                                    &lt;{selectedElement.tagName}&gt;
                                </code>
                                {selectedElement.id && (
                                    <code className="ml-2 text-yellow-400 bg-neutral-800 px-2 py-1 rounded text-xs">
                                        #{selectedElement.id}
                                    </code>
                                )}
                            </div>

                            {selectedElement.className && (
                                <div>
                                    <div className="text-neutral-400 text-xs uppercase tracking-wide mb-1">Classes</div>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedElement.className.split(" ").filter(Boolean).slice(0, 10).map((cls, i) => (
                                            <code key={i} className="text-blue-400 bg-neutral-800 px-2 py-1 rounded text-xs">
                                                .{cls}
                                            </code>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* React Info */}
                            {selectedElement.reactInfo?.componentName && (
                                <div>
                                    <div className="text-neutral-400 text-xs uppercase tracking-wide mb-1">React Component</div>
                                    <code className="text-pink-400 bg-neutral-800 px-2 py-1 rounded text-xs">
                                        {selectedElement.reactInfo.componentName}
                                    </code>
                                </div>
                            )}

                            {/* Dimensions */}
                            <div>
                                <div className="text-neutral-400 text-xs uppercase tracking-wide mb-1">Size</div>
                                <div className="text-white">
                                    {Math.round(selectedElement.rect.width)} × {Math.round(selectedElement.rect.height)} px
                                </div>
                            </div>

                            {/* Key Styles */}
                            <div>
                                <div className="text-neutral-400 text-xs uppercase tracking-wide mb-1">Styles</div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-neutral-500">display:</span>{" "}
                                        <span className="text-orange-400">{selectedElement.computedStyles.display}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500">position:</span>{" "}
                                        <span className="text-orange-400">{selectedElement.computedStyles.position}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer with copy button */}
                        <div className="p-4 border-t border-neutral-700 bg-neutral-800/50">
                            <button
                                onClick={handleCopy}
                                className="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white py-2 px-4 rounded-lg transition-colors"
                            >
                                {copied ? (
                                    <>
                                        <Check size={16} />
                                        Copied to Clipboard!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={16} />
                                        Copy for AI
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Instructions */}
            {!selectedElement && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-neutral-900/95 backdrop-blur-lg border border-neutral-700 rounded-lg px-4 py-2 z-[100000] flex items-center gap-3">
                    <MousePointer2 size={16} className="text-pink-400" />
                    <span className="text-white text-sm">Click any element to inspect</span>
                    <span className="text-neutral-500 text-sm">• ESC to exit</span>
                </div>
            )}
        </div>,
        document.body
    );
}

// Hook for easy integration
export function useElementInspector() {
    const [isActive, setIsActive] = useState(false);

    const toggle = useCallback(() => setIsActive((prev) => !prev), []);
    const close = useCallback(() => setIsActive(false), []);

    return { isActive, toggle, close };
}
