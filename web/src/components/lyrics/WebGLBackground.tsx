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

    // Create blurred image from artwork
    const createBlurredTexture = useCallback(async (url: string): Promise<THREE.Texture | null> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                // Create canvas for blur effect
                const size = isLowPower ? 256 : 512; // Lower resolution for mobile
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    resolve(null);
                    return;
                }

                // Draw and blur
                ctx.filter = `blur(${isLowPower ? 30 : 40}px)`;
                ctx.drawImage(img, 0, 0, size, size);

                const texture = new THREE.CanvasTexture(canvas);
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
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Create renderer with performance settings
        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: !isLowPower, // Disable antialiasing on mobile
            powerPreference: isLowPower ? "low-power" : "high-performance"
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(isLowPower ? 1 : Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Create scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Create camera
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        // Create shader material
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uBlurredArt: { value: null },
                uResolution: { value: new THREE.Vector2(width, height) },
                uBackgroundOrigin: { value: new THREE.Vector2(width / 2, height / 2) },
                uBackgroundRadius: { value: Math.max(width, height) * 1.5 },
                uCenterOrigin: { value: new THREE.Vector2(width / 2, height / 2) },
                uCenterRadius: { value: Math.max(width, height) },
                uLeftOrigin: { value: new THREE.Vector2(0, height) },
                uLeftRadius: { value: Math.max(width, height) * 0.75 },
                uRightOrigin: { value: new THREE.Vector2(width, 0) },
                uRightRadius: { value: Math.max(width, height) * 0.65 },
            },
            vertexShader,
            fragmentShader,
        });
        materialRef.current = material;

        // Create mesh
        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // Animation loop with frame limiting for mobile
        let lastFrame = 0;
        const targetFPS = isLowPower ? 30 : 60;
        const frameInterval = 1000 / targetFPS;

        const animate = (time: number) => {
            animationRef.current = requestAnimationFrame(animate);

            // Frame limiting
            if (time - lastFrame < frameInterval) return;
            lastFrame = time;

            material.uniforms.uTime.value = time / 3500;
            renderer.render(scene, camera);
        };
        animationRef.current = requestAnimationFrame(animate);

        // Handle resize
        const handleResize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            const pixelRatio = isLowPower ? 1 : Math.min(window.devicePixelRatio, 2);
            const scaledW = w * pixelRatio;
            const scaledH = h * pixelRatio;
            const maxAxis = Math.max(scaledW, scaledH);

            renderer.setSize(w, h);
            material.uniforms.uResolution.value.set(w, h);
            material.uniforms.uBackgroundOrigin.value.set(scaledW / 2, scaledH / 2);
            material.uniforms.uBackgroundRadius.value = maxAxis * 1.5;
            material.uniforms.uCenterOrigin.value.set(scaledW / 2, scaledH / 2);
            material.uniforms.uCenterRadius.value = maxAxis;
            material.uniforms.uLeftOrigin.value.set(0, scaledH);
            material.uniforms.uLeftRadius.value = maxAxis * 0.75;
            material.uniforms.uRightOrigin.value.set(scaledW, 0);
            material.uniforms.uRightRadius.value = maxAxis * 0.65;
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
            container.removeChild(renderer.domElement);
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
