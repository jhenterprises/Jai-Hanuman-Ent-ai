import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Globe as GlobeIcon } from 'lucide-react';

const GlobeMesh = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x += 0.002;
    }
  });

  return (
    <group>
      <Sphere ref={meshRef} args={[1, 64, 64]}>
        <MeshDistortMaterial
          color="#3b82f6"
          attach="material"
          distort={0.3}
          speed={2}
          roughness={0}
          metalness={0.8}
        />
      </Sphere>
      {/* Wireframe overlay */}
      <Sphere args={[1.05, 32, 32]}>
        <meshBasicMaterial color="#60a5fa" wireframe transparent opacity={0.1} />
      </Sphere>
    </group>
  );
};

const GlobeFallback = () => (
  <div className="w-full h-full flex items-center justify-center relative">
    <div className="absolute w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full animate-pulse" />
    <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-blue-600 via-cyan-400 to-purple-500 shadow-2xl shadow-blue-500/40 flex items-center justify-center overflow-hidden group">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      <GlobeIcon size={80} className="text-white/80 group-hover:scale-110 transition-transform duration-700" />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
    </div>
  </div>
);

import ErrorBoundary from './ErrorBoundary';

const Globe = () => {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const handleContextError = (e: Event) => {
      setWebglAvailable(false);
    };
    window.addEventListener('webglcontextcreationerror', handleContextError);
    
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const options = { 
          failIfMajorPerformanceCaveat: true,
          preserveDrawingBuffer: false,
          alpha: true,
          powerPreference: 'high-performance'
        };
        
        const gl = canvas.getContext('webgl', options) || 
                   canvas.getContext('experimental-webgl', options);
        
        if (!gl || !(gl instanceof WebGLRenderingContext) || gl.isContextLost()) {
          setWebglAvailable(false);
          return;
        }
        
        // Functional test: Try to create a buffer. 
        // Some contexts (like the one in the error) fail during actual resource allocation.
        const buffer = gl.createBuffer();
        if (!buffer) {
          setWebglAvailable(false);
          return;
        }
        gl.deleteBuffer(buffer);
        
        // Check for specific problematic renderers or old D3D versions
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          if (renderer && (
            renderer.includes('Disabled') || 
            renderer.includes('Software') || 
            renderer.includes('SwiftShader') ||
            renderer.includes('Microsoft Basic Render Driver') ||
            renderer.includes('Direct3D9') || // Blacklist old D3D9 renderers which often fail
            renderer.includes('Direct3D 9')
          )) {
            setWebglAvailable(false);
            return;
          }
        }

        // ULTIMATE TEST: Try to actually render a frame and read pixels
        // This catches cases where the context is created but resource allocation fails
        gl.clearColor(1, 0, 0, 1); // Red
        gl.clear(gl.COLOR_BUFFER_BIT);
        const pixel = new Uint8Array(4);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        
        if (pixel[0] !== 255) { // If it's not red, rendering failed
          setWebglAvailable(false);
          return;
        }
        
        setWebglAvailable(true);
      } catch (e) {
        setWebglAvailable(false);
      }
    };
    checkWebGL();

    return () => window.removeEventListener('webglcontextcreationerror', handleContextError);
  }, []);

  if (webglAvailable === false) {
    return (
      <div className="w-full h-[400px] md:h-[600px]">
        <GlobeFallback />
      </div>
    );
  }

  // While checking, show nothing or a loader
  if (webglAvailable === null) {
    return <div className="w-full h-[400px] md:h-[600px]" />;
  }

  return (
    <div className="w-full h-[400px] md:h-[600px] cursor-grab active:cursor-grabbing">
      <ErrorBoundary fallback={<GlobeFallback />} onError={() => setWebglAvailable(false)}>
        <Canvas gl={{ antialias: true, powerPreference: 'high-performance' }} onError={() => setWebglAvailable(false)}>
          <PerspectiveCamera makeDefault position={[0, 0, 3]} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
          <Float speed={2} rotationIntensity={1} floatIntensity={1}>
            <GlobeMesh />
          </Float>
        </Canvas>
      </ErrorBoundary>
    </div>
  );
};

export default Globe;
