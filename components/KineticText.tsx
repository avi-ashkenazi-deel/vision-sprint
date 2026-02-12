'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT_SHADER = `
  varying vec2 vUv;
  varying vec3 vPos;
  uniform sampler2D uTexture;
  uniform float uTime;

  void main() {
    float time = uTime * 0.4;
    vec2 repeat = vec2(8.0, 3.0);
    vec2 uv = fract(vUv * repeat - vec2(time, 0.0));

    vec3 tex = texture2D(uTexture, uv).rgb;

    // Depth-based shadow for 3D feel
    float shadow = clamp(vPos.z / 6.0, 0.0, 1.0);
    shadow = shadow * 0.85 + 0.15;

    vec3 color = tex * shadow;

    // Slight purple tint on highlights
    color += tex * vec3(0.15, 0.05, 0.3) * shadow;

    gl_FragColor = vec4(color, 1.0);
  }
`

export function KineticText() {
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // ---- Renderer ----
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    // ---- Main scene ----
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    camera.position.z = 28

    // ---- Create text texture via canvas ----
    const textCanvas = document.createElement('canvas')
    const ctx = textCanvas.getContext('2d')!
    textCanvas.width = 2048
    textCanvas.height = 512

    // Black background, white text
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, textCanvas.width, textCanvas.height)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 280px Inter, system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('VISION', textCanvas.width / 2, textCanvas.height / 2)

    const textTexture = new THREE.CanvasTexture(textCanvas)
    textTexture.wrapS = THREE.RepeatWrapping
    textTexture.wrapT = THREE.RepeatWrapping

    // ---- Torus knot with text ----
    const geometry = new THREE.TorusKnotGeometry(6, 2.2, 400, 3, 4, 3)
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: textTexture },
      },
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // ---- Slow rotation ----
    const clock = new THREE.Clock()

    function animate() {
      const elapsed = clock.getElapsedTime()

      material.uniforms.uTime.value = elapsed

      // Gentle continuous rotation
      mesh.rotation.x = elapsed * 0.08
      mesh.rotation.y = elapsed * 0.12

      renderer.render(scene, camera)
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)

    // ---- Resize ----
    function onResize() {
      const w = container!.clientWidth
      const h = container!.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      textTexture.dispose()
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full relative z-10"
      style={{ height: '320px' }}
    />
  )
}
