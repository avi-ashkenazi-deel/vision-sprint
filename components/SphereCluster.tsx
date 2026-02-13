'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'

// Spread factor to push spheres further apart
const SPREAD = 1.6

const SPHERE_DATA = {
  radii: [
    1, 0.6, 0.8, 0.4, 0.9, 0.7, 0.9, 0.3, 0.2, 0.5,
    0.6, 0.4, 0.5, 0.6, 0.7, 0.3, 0.4, 0.8, 0.7, 0.5,
    0.4, 0.6, 0.35, 0.38, 0.9, 0.3, 0.6, 0.4, 0.2, 0.35,
    0.5, 0.15, 0.2, 0.25, 0.4, 0.8, 0.76, 0.8, 1, 0.8,
    0.7, 0.8, 0.3, 0.5, 0.6, 0.55, 0.42, 0.75, 0.66, 0.6,
  ],
  positions: [
    { x: 0, y: 0, z: 0 },
    { x: 1.2, y: 0.9, z: -0.5 },
    { x: 1.8, y: -0.3, z: 0 },
    { x: -1, y: -1, z: 0 },
    { x: -1, y: 1.62, z: 0 },
    { x: -1.65, y: 0, z: -0.4 },
    { x: -2.13, y: -1.54, z: -0.4 },
    { x: 0.8, y: 0.94, z: 0.3 },
    { x: 0.5, y: -1, z: 1.2 },
    { x: -0.16, y: -1.2, z: 0.9 },
    { x: 1.5, y: 1.2, z: 0.8 },
    { x: 0.5, y: -1.58, z: 1.4 },
    { x: -1.5, y: 1, z: 1.15 },
    { x: -1.5, y: -1.5, z: 0.99 },
    { x: -1.5, y: -1.5, z: -1.9 },
    { x: 1.85, y: 0.8, z: 0.05 },
    { x: 1.5, y: -1.2, z: -0.75 },
    { x: 0.9, y: -1.62, z: 0.22 },
    { x: 0.45, y: 2, z: 0.65 },
    { x: 2.5, y: 1.22, z: -0.2 },
    { x: 2.35, y: 0.7, z: 0.55 },
    { x: -1.8, y: -0.35, z: 0.85 },
    { x: -1.02, y: 0.2, z: 0.9 },
    { x: 0.2, y: 1, z: 1 },
    { x: -2.88, y: 0.7, z: 1 },
    { x: -2, y: -0.95, z: 1.5 },
    { x: -2.3, y: 2.4, z: -0.1 },
    { x: -2.5, y: 1.9, z: 1.2 },
    { x: -1.8, y: 0.37, z: 1.2 },
    { x: -2.4, y: 1.42, z: 0.05 },
    { x: -2.72, y: -0.9, z: 1.1 },
    { x: -1.8, y: -1.34, z: 1.67 },
    { x: -1.6, y: 1.66, z: 0.91 },
    { x: -2.8, y: 1.58, z: 1.69 },
    { x: -2.97, y: 2.3, z: 0.65 },
    { x: 1.1, y: -0.2, z: -1.45 },
    { x: -4, y: 1.78, z: 0.38 },
    { x: 0.12, y: 1.4, z: -1.29 },
    { x: -1.64, y: 1.4, z: -1.79 },
    { x: -3.5, y: -0.58, z: 0.1 },
    { x: -0.1, y: -1, z: -2 },
    { x: -4.5, y: 0.55, z: -0.5 },
    { x: -3.87, y: 0, z: 1 },
    { x: -4.6, y: -0.1, z: 0.65 },
    { x: -3, y: 1.5, z: -0.7 },
    { x: -0.5, y: 0.2, z: -1.5 },
    { x: -1.3, y: -0.45, z: -1.5 },
    { x: -3.35, y: 0.25, z: -1.5 },
    { x: -4.76, y: -1.26, z: 0.4 },
    { x: -4.32, y: 0.85, z: 1.4 },
  ].map(p => ({ x: p.x * SPREAD, y: p.y * SPREAD, z: p.z * SPREAD })),
}

const INIT_Y = -25
const REVOLUTION_RADIUS = 4
const REVOLUTION_DURATION = 2
const BREATHING_AMPLITUDE = 0.15
const BREATHING_SPEED = 0.002

export function SphereCluster() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const frameRef = useRef<number>(0)
  const loadingCompleteRef = useRef(false)
  const spheresRef = useRef<THREE.Mesh[]>([])
  const forcesRef = useRef<Map<string, THREE.Vector3>>(new Map())
  const mouseRef = useRef(new THREE.Vector2())

  const cleanup = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    if (rendererRef.current) {
      rendererRef.current.dispose()
      rendererRef.current = null
    }
    spheresRef.current = []
    forcesRef.current.clear()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(25, container.clientWidth / container.clientHeight, 0.1, 1000)
    camera.position.z = 30

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Material — purple theme with specular highlights
    const material = new THREE.MeshStandardMaterial({
      color: '#c4b5fd',
      emissive: '#4c1d95',
      emissiveIntensity: 0.3,
      metalness: 0.25,
      roughness: 0.35,
    })

    // Build spheres
    const group = new THREE.Group()
    const spheres: THREE.Mesh[] = []

    SPHERE_DATA.positions.forEach((pos, i) => {
      const radius = SPHERE_DATA.radii[i]
      const geo = new THREE.SphereGeometry(radius, 48, 48)
      const mesh = new THREE.Mesh(geo, material)
      mesh.position.set(pos.x, INIT_Y, pos.z)
      mesh.userData = { originalPosition: { ...pos }, radius }
      mesh.castShadow = true
      mesh.receiveShadow = true
      spheres.push(mesh)
      group.add(mesh)
    })
    scene.add(group)
    spheresRef.current = spheres

    // Lights — multi-source for depth and dimension
    // Soft ambient base
    const ambient = new THREE.AmbientLight(0xddd6fe, 0.4)
    scene.add(ambient)

    // Key light — bright from top-right front
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8)
    keyLight.position.set(10, 12, 15)
    keyLight.castShadow = true
    scene.add(keyLight)

    // Fill light — softer from left, purple tint
    const fillLight = new THREE.DirectionalLight(0xc4b5fd, 0.8)
    fillLight.position.set(-10, 4, 8)
    scene.add(fillLight)

    // Rim/back light — bright edge definition
    const rimLight = new THREE.DirectionalLight(0xe9d5ff, 1.2)
    rimLight.position.set(0, -6, -12)
    scene.add(rimLight)

    // Purple accent point light — atmospheric glow
    const purpleGlow = new THREE.PointLight(0x7c3aed, 2, 30, 1.5)
    purpleGlow.position.set(-4, 2, 6)
    scene.add(purpleGlow)

    // Warm highlight point light — top
    const warmHighlight = new THREE.PointLight(0xfdf4ff, 1.5, 25, 1.5)
    warmHighlight.position.set(6, 8, 4)
    scene.add(warmHighlight)

    // Loading animation
    spheres.forEach((sphere, i) => {
      const delay = i * 0.02
      const orig = sphere.userData.originalPosition

      gsap.timeline()
        .to(sphere.position, {
          duration: REVOLUTION_DURATION / 2,
          y: REVOLUTION_RADIUS,
          ease: 'power1.out',
          delay,
          onUpdate() {
            const progress = this.progress()
            sphere.position.z = orig.z + Math.sin(progress * Math.PI) * REVOLUTION_RADIUS
          },
        })
        .to(sphere.position, {
          duration: REVOLUTION_DURATION / 2,
          y: INIT_Y / 5,
          ease: 'power1.out',
          onUpdate() {
            const progress = this.progress()
            sphere.position.z = orig.z - Math.sin(progress * Math.PI) * REVOLUTION_RADIUS
          },
        })
        .to(sphere.position, {
          duration: 0.6,
          x: orig.x,
          y: orig.y,
          z: orig.z,
          ease: 'power1.out',
        })
    })

    setTimeout(() => {
      loadingCompleteRef.current = true
    }, (REVOLUTION_DURATION + 1) * 1000)

    // Raycaster for mouse interaction
    const raycaster = new THREE.Raycaster()
    const tempVec = new THREE.Vector3()

    const onMouseMove = (e: MouseEvent) => {
      if (!loadingCompleteRef.current) return
      const rect = container.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouseRef.current, camera)
      const hits = raycaster.intersectObjects(spheres)
      if (hits.length > 0) {
        const hit = hits[0]
        const force = new THREE.Vector3()
        force.subVectors(hit.point, hit.object.position).normalize().multiplyScalar(0.2)
        forcesRef.current.set(hit.object.uuid, force)
      }
    }
    container.addEventListener('mousemove', onMouseMove)

    // Collision
    function handleCollisions() {
      for (let i = 0; i < spheres.length; i++) {
        const a = spheres[i]
        const rA = a.userData.radius as number
        for (let j = i + 1; j < spheres.length; j++) {
          const b = spheres[j]
          const rB = b.userData.radius as number
          const dist = a.position.distanceTo(b.position)
          const minDist = (rA + rB) * 1.2
          if (dist < minDist) {
            tempVec.subVectors(b.position, a.position).normalize()
            const push = (minDist - dist) * 0.4
            a.position.sub(tempVec.clone().multiplyScalar(push))
            b.position.add(tempVec.clone().multiplyScalar(push))
          }
        }
      }
    }

    // Auto-rotation
    const autoRotationSpeed = 0.001

    // Animate
    function animate() {
      frameRef.current = requestAnimationFrame(animate)

      // Gentle auto-rotation
      group.rotation.y += autoRotationSpeed

      if (loadingCompleteRef.current) {
        const time = Date.now() * BREATHING_SPEED
        spheres.forEach((sphere, i) => {
          const offset = i * 0.2
          const bY = Math.sin(time + offset) * BREATHING_AMPLITUDE
          const bZ = Math.cos(time + offset) * BREATHING_AMPLITUDE * 0.5

          const force = forcesRef.current.get(sphere.uuid)
          if (force) {
            sphere.position.add(force)
            force.multiplyScalar(0.95)
            if (force.length() < 0.01) forcesRef.current.delete(sphere.uuid)
          }

          const orig = sphere.userData.originalPosition
          tempVec.set(orig.x, orig.y + bY, orig.z + bZ)
          sphere.position.lerp(tempVec, 0.018)
        })
        handleCollisions()
      }

      renderer.render(scene, camera)
    }
    animate()

    // Resize
    const ro = new ResizeObserver(() => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      container.removeEventListener('mousemove', onMouseMove)
      cleanup()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [cleanup])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '300px' }}
    />
  )
}
