"use client";

import { useRef, useEffect, useMemo, useCallback } from "react";
import * as THREE from "three";

interface WebGLBackgroundProps {
    artworkUrl?: string;
    className?: string;
}

// GLSL Shaders (adapted from beautiful-lyrics)
const vertexShader = `
void main() {
    gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform sampler2D uBlurredArt;
uniform vec2 uResolution;

uniform vec2 uBackgroundOrigin;
uniform float uBackgroundRadius;

uniform vec2 uCenterOrigin;
uniform float uCenterRadius;

uniform vec2 uLeftOrigin;
uniform float uLeftRadius;

uniform vec2 uRightOrigin;
uniform float uRightRadius;

const vec2 rotateCenter = vec2(0.5, 0.5);

vec2 rotateAroundCenter(vec2 point, float angle) {
    vec2 offset = point - rotateCenter;
    float s = sin(angle);
    float c = cos(angle);
    mat2 rotation = mat2(c, -s, s, c);
    offset = rotation * offset;
    return rotateCenter + offset;
}

void main() {
    vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
    
    // Background circle (largest, slowest rotation)
    vec2 bgOffset = gl_FragCoord.xy - uBackgroundOrigin;
    if (length(bgOffset) <= uBackgroundRadius) {
        vec2 uv = ((bgOffset / uBackgroundRadius) + 1.0) * 0.5;
        color = texture2D(uBlurredArt, rotateAroundCenter(uv, uTime * -0.25));
        color.a = 1.0;
    }
    
    // Center circle (medium size, medium rotation)
    vec2 centerOffset = gl_FragCoord.xy - uCenterOrigin;
    if (length(centerOffset) <= uCenterRadius) {
        vec2 uv = ((centerOffset / uCenterRadius) + 1.0) * 0.5;
        vec4 newColor = texture2D(uBlurredArt, rotateAroundCenter(uv, uTime * 0.5));
        newColor.a *= 0.75;
        color.rgb = newColor.rgb * newColor.a + color.rgb * (1.0 - newColor.a);
        color.a = newColor.a + color.a * (1.0 - newColor.a);
    }
    
    // Left circle (bottom-left, fastest rotation)
    vec2 leftOffset = gl_FragCoord.xy - uLeftOrigin;
    if (length(leftOffset) <= uLeftRadius) {
        vec2 uv = ((leftOffset / uLeftRadius) + 1.0) * 0.5;
        vec4 newColor = texture2D(uBlurredArt, rotateAroundCenter(uv, uTime * 1.0));
        newColor.a *= 0.5;
        color.rgb = newColor.rgb * newColor.a + color.rgb * (1.0 - newColor.a);
        color.a = newColor.a + color.a * (1.0 - newColor.a);
    }
    
    // Right circle (top-right, reverse rotation)
    vec2 rightOffset = gl_FragCoord.xy - uRightOrigin;
    if (length(rightOffset) <= uRightRadius) {
        vec2 uv = ((rightOffset / uRightRadius) + 1.0) * 0.5;
        vec4 newColor = texture2D(uBlurredArt, rotateAroundCenter(uv, uTime * -0.75));
        newColor.a *= 0.5;
        color.rgb = newColor.rgb * newColor.a + color.rgb * (1.0 - newColor.a);
        color.a = newColor.a + color.a * (1.0 - newColor.a);
    }
    
    // Brightness boost (35% increase)
    color.rgb *= 1.35;
    
    gl_FragColor = color;
}
`;

export default function WebGLBackground({ artworkUrl, className = "" }: WebGLBackgroundProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const materialRef = useRef<THREE.ShaderMaterial | null>(null);
    const animationRef = useRef<number>(0);
    const textureRef = useRef<THREE.Texture | null>(null);

    // Detect if device is low-powered (mobile)
    const isLowPower = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
    }, []);

    // Create blurred image from artwork with circular mask (beautiful-lyrics style)
    const createBlurredTexture = useCallback(async (url: string): Promise<THREE.Texture | null> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                // 1. Create a square, circular clipped version of the image
                const originalSize = Math.min(img.width, img.height);
                const circleCanvas = document.createElement('canvas');
                circleCanvas.width = originalSize;
                circleCanvas.height = originalSize;
                const circleCtx = circleCanvas.getContext('2d');

                if (!circleCtx) {
                    resolve(null);
                    return;
                }

                // Create circular clipping mask
                circleCtx.beginPath();
                circleCtx.arc(originalSize / 2, originalSize / 2, originalSize / 2, 0, Math.PI * 2);
                circleCtx.closePath();
                circleCtx.clip();

                // Draw image centered
                circleCtx.drawImage(
                    img,
                    (img.width - originalSize) / 2, (img.height - originalSize) / 2,
                    originalSize, originalSize,
                    0, 0,
                    originalSize, originalSize
                );

                // 2. Create the final blurred texture with padding
                const blurExtent = 40; // Fixed blur amount from reference
                const padding = blurExtent * 2; // Extra padding to avoid clipping blur
                const finalSize = isLowPower ? 256 : 512; // Resample to power of 2 for performance

                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = finalSize;
                finalCanvas.height = finalSize;
                const finalCtx = finalCanvas.getContext('2d');

                if (!finalCtx) {
                    resolve(null);
                    return;
                }

                // Apply blur and draw the circular image centered
                // We draw the high-res circleCanvas onto the finalCanvas, scaling it down
                finalCtx.filter = `blur(${isLowPower ? 20 : 30}px)`; // Slightly reduced blur for smaller final texture

                // Calculate draw dimensions to keep aspect ratio and centering
                const drawSize = finalSize - (padding * (finalSize / 512)); // Scale padding relative to final size
                const offset = (finalSize - drawSize) / 2;

                finalCtx.drawImage(circleCanvas, offset, offset, drawSize, drawSize);

                const texture = new THREE.CanvasTexture(finalCanvas);
                // Use LinearFilter for smooth scaling
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                resolve(texture);
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }, [isLowPower]);

    // Initialize Three.js
    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        let width = container.clientWidth;
        let height = container.clientHeight;

        // Create renderer with performance settings
        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: !isLowPower,
            powerPreference: isLowPower ? "low-power" : "high-performance"
        });
        renderer.setSize(width, height);
        // Use device pixel ratio for sharp rendering, capped at 2
        const pixelRatio = isLowPower ? 1 : Math.min(window.devicePixelRatio, 2);
        renderer.setPixelRatio(pixelRatio);

        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Create scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Create camera
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        // Initial sizing calculations matching reference
        const scaledW = width * pixelRatio;
        const scaledH = height * pixelRatio;
        const maxAxis = Math.max(scaledW, scaledH);
        const largestAxisName = scaledW > scaledH ? "X" : "Y";

        // Create shader material
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uBlurredArt: { value: null },
                uResolution: { value: new THREE.Vector2(width, height) },

                // Background Circle (Center, 1.5x max)
                uBackgroundOrigin: { value: new THREE.Vector2(scaledW / 2, scaledH / 2) },
                uBackgroundRadius: { value: maxAxis * 1.5 },

                // Center Circle (Center, 1x or 0.75x max)
                uCenterOrigin: { value: new THREE.Vector2(scaledW / 2, scaledH / 2) },
                uCenterRadius: { value: maxAxis * (largestAxisName === "X" ? 1.0 : 0.75) },

                // Left Circle (Bottom-Left, 0.75x max)
                uLeftOrigin: { value: new THREE.Vector2(0, scaledH) },
                uLeftRadius: { value: maxAxis * 0.75 },

                // Right Circle (Top-Right, 0.65x or 0.5x max)
                uRightOrigin: { value: new THREE.Vector2(scaledW, 0) },
                uRightRadius: { value: maxAxis * (largestAxisName === "X" ? 0.65 : 0.5) },
            },
            vertexShader,
            fragmentShader,
        });
        materialRef.current = material;

        // Create mesh
        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // Animation loop
        let lastFrame = 0;
        const targetFPS = isLowPower ? 30 : 60;
        const frameInterval = 1000 / targetFPS;

        // Time divisor: larger = slower animation
        // High-performance: 45% faster (timeDivisor = 3000 * 0.55 ≈ 1650)
        // Low-power: 20% of normal speed (timeDivisor = 3000 * 5 = 15000)
        // Mobile high-perf: slightly slower than desktop for smoother experience
        const isMobile = width <= 640;
        const timeDivisor = isLowPower ? 15000 : (isMobile ? 2000 : 1650);

        const animate = (time: number) => {
            animationRef.current = requestAnimationFrame(animate);

            if (time - lastFrame < frameInterval) return;
            lastFrame = time;

            material.uniforms.uTime.value = time / timeDivisor;
            renderer.render(scene, camera);
        };
        animationRef.current = requestAnimationFrame(animate);

        // Handle resize
        const handleResize = () => {
            if (!container) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            const pRatio = isLowPower ? 1 : Math.min(window.devicePixelRatio, 2);
            const sW = w * pRatio;
            const sH = h * pRatio;
            const mAxis = Math.max(sW, sH);
            const lAxisName = sW > sH ? "X" : "Y";

            renderer.setSize(w, h);
            renderer.setPixelRatio(pRatio);

            material.uniforms.uResolution.value.set(w, h);

            material.uniforms.uBackgroundOrigin.value.set(sW / 2, sH / 2);
            material.uniforms.uBackgroundRadius.value = mAxis * 1.5;

            material.uniforms.uCenterOrigin.value.set(sW / 2, sH / 2);
            material.uniforms.uCenterRadius.value = mAxis * (lAxisName === "X" ? 1.0 : 0.75);

            material.uniforms.uLeftOrigin.value.set(0, sH);
            material.uniforms.uLeftRadius.value = mAxis * 0.75;

            material.uniforms.uRightOrigin.value.set(sW, 0);
            material.uniforms.uRightRadius.value = mAxis * (lAxisName === "X" ? 0.65 : 0.5);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            cancelAnimationFrame(animationRef.current);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            geometry.dispose();
            material.dispose();
            if (textureRef.current) textureRef.current.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, [isLowPower]);

    // Load texture when artwork changes
    useEffect(() => {
        if (!artworkUrl || !materialRef.current) return;

        createBlurredTexture(artworkUrl).then((texture) => {
            if (texture && materialRef.current) {
                if (textureRef.current) textureRef.current.dispose();
                textureRef.current = texture;
                materialRef.current.uniforms.uBlurredArt.value = texture;
            }
        });
    }, [artworkUrl, createBlurredTexture]);

    return (
        <div
            ref={containerRef}
            className={`absolute inset-0 overflow-hidden ${className}`}
            style={{ zIndex: 0 }}
        />
    );
}
