'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ---- Cloth simulation parameters ----
const CLOTH_W = 50        // segments width
const CLOTH_H = 50        // segments height  
const CLOTH_SIZE_X = 50   // world units width — fills viewport
const CLOTH_SIZE_Y = 40   // world units height
const DAMPING = 0.97
const GRAVITY = new THREE.Vector3(0, -0.06, 0)
const TIMESTEP_SQ = (18 / 1000) * (18 / 1000)
const CONSTRAINT_ITERATIONS = 12

// ---- Particle class (Verlet integration) ----
class Particle {
  position: THREE.Vector3
  previous: THREE.Vector3
  original: THREE.Vector3
  acceleration: THREE.Vector3
  mass: number
  invMass: number
  pinned: boolean

  constructor(x: number, y: number, z: number, mass = 1) {
    this.position = new THREE.Vector3(x, y, z)
    this.previous = new THREE.Vector3(x, y, z)
    this.original = new THREE.Vector3(x, y, z)
    this.acceleration = new THREE.Vector3(0, 0, 0)
    this.mass = mass
    this.invMass = 1 / mass
    this.pinned = false
  }

  addForce(force: THREE.Vector3) {
    this.acceleration.add(force.clone().multiplyScalar(this.invMass))
  }

  integrate() {
    if (this.pinned) return

    const newPos = new THREE.Vector3()
    newPos.subVectors(this.position, this.previous)
    newPos.multiplyScalar(DAMPING)
    newPos.add(this.position)
    newPos.add(this.acceleration.clone().multiplyScalar(TIMESTEP_SQ))

    this.previous.copy(this.position)
    this.position.copy(newPos)
    this.acceleration.set(0, 0, 0)
  }
}

// ---- Spring constraint ----
class Constraint {
  p1: Particle
  p2: Particle
  restDistance: number

  constructor(p1: Particle, p2: Particle) {
    this.p1 = p1
    this.p2 = p2
    this.restDistance = p1.position.distanceTo(p2.position)
  }

  satisfy() {
    const diff = new THREE.Vector3().subVectors(this.p2.position, this.p1.position)
    const currentDist = diff.length()
    if (currentDist === 0) return

    const correction = diff.multiplyScalar(1 - this.restDistance / currentDist)
    const correctionHalf = correction.multiplyScalar(0.5)

    if (!this.p1.pinned) {
      this.p1.position.add(correctionHalf)
    }
    if (!this.p2.pinned) {
      this.p2.position.sub(correctionHalf)
    }
  }
}

export function ClothBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)
  const mouseRef = useRef(new THREE.Vector2(0, 0))
  const prevMouseRef = useRef(new THREE.Vector2(0, 0))

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // ---- Three.js setup ----
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, -4, 28)
    camera.lookAt(0, -4, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)

    // ---- Lighting — much brighter to reveal folds ----
    const ambientLight = new THREE.AmbientLight(0x334, 3.0)
    scene.add(ambientLight)

    // Key light: strong, slightly warm, from upper-right
    const keyLight = new THREE.DirectionalLight(0xeeeeff, 2.5)
    keyLight.position.set(8, 12, 15)
    scene.add(keyLight)

    // Fill light: cool, from the left
    const fillLight = new THREE.DirectionalLight(0x8899bb, 1.2)
    fillLight.position.set(-10, 5, 10)
    scene.add(fillLight)

    // Back/rim light: highlights cloth edges
    const rimLight = new THREE.DirectionalLight(0x667799, 1.0)
    rimLight.position.set(0, -8, -12)
    scene.add(rimLight)

    // Top light for the upper folds
    const topLight = new THREE.DirectionalLight(0xaabbdd, 0.8)
    topLight.position.set(0, 15, 5)
    scene.add(topLight)

    // ---- Create particles ----
    const particles: Particle[][] = []
    const constraints: Constraint[] = []

    for (let y = 0; y <= CLOTH_H; y++) {
      particles[y] = []
      for (let x = 0; x <= CLOTH_W; x++) {
        const px = (x / CLOTH_W - 0.5) * CLOTH_SIZE_X
        const py = -(y / CLOTH_H - 0.5) * CLOTH_SIZE_Y
        const pz = 0
        particles[y][x] = new Particle(px, py, pz)
      }
    }

    // Pin the top row
    for (let x = 0; x <= CLOTH_W; x++) {
      particles[0][x].pinned = true
    }

    // ---- Create constraints (structural + shear) ----
    for (let y = 0; y <= CLOTH_H; y++) {
      for (let x = 0; x <= CLOTH_W; x++) {
        if (x < CLOTH_W) {
          constraints.push(new Constraint(particles[y][x], particles[y][x + 1]))
        }
        if (y < CLOTH_H) {
          constraints.push(new Constraint(particles[y][x], particles[y + 1][x]))
        }
        if (x < CLOTH_W && y < CLOTH_H) {
          constraints.push(new Constraint(particles[y][x], particles[y + 1][x + 1]))
        }
        if (x > 0 && y < CLOTH_H) {
          constraints.push(new Constraint(particles[y][x], particles[y + 1][x - 1]))
        }
      }
    }

    // ---- Cloth mesh — brighter, visible dark fabric ----
    const clothGeometry = new THREE.PlaneGeometry(
      CLOTH_SIZE_X,
      CLOTH_SIZE_Y,
      CLOTH_W,
      CLOTH_H
    )

    const clothMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a2e,       // dark navy — visible against black
      roughness: 0.55,
      metalness: 0.1,
      side: THREE.DoubleSide,
      clearcoat: 0.3,
      clearcoatRoughness: 0.3,
      sheen: 1.0,
      sheenColor: new THREE.Color(0x4444aa),  // subtle blue sheen
      sheenRoughness: 0.25,
    })

    const clothMesh = new THREE.Mesh(clothGeometry, clothMaterial)
    scene.add(clothMesh)

    // ---- Continuous wind — always blowing ----
    let windTime = 0
    function getWind(time: number, x: number, y: number): THREE.Vector3 {
      // Base wind always present, pushing cloth out toward the camera
      const baseStrength = 1.2

      // Slow oscillations for natural feel
      const swell = 0.4 * Math.sin(time * 0.25) + 0.3 * Math.sin(time * 0.13 + 1.5)

      // Spatial variation — waves traveling across the cloth
      const wave1 = Math.sin(time * 0.6 + x * 4.0 + y * 2.0) * 0.35
      const wave2 = Math.sin(time * 0.35 + x * 2.5 - y * 3.0 + 5.0) * 0.25
      const wave3 = Math.sin(time * 0.9 + x * 6.0 + y * 1.5 + 2.5) * 0.15

      // Gusts — occasional stronger pushes
      const gust = Math.max(0, Math.sin(time * 0.15)) * 0.6

      const windZ = (baseStrength + swell + gust) * (1.0 + wave1 + wave2 + wave3)

      // Lateral sway
      const windX = Math.sin(time * 0.4 + y * 2.0) * 0.3
        + Math.sin(time * 0.7 + x * 3.0) * 0.15
      const windY = Math.cos(time * 0.3 + x * 1.5) * 0.1

      return new THREE.Vector3(windX, windY, windZ)
    }

    // ---- Mouse interaction ----
    const raycaster = new THREE.Raycaster()
    const mouseInfluenceRadius = 6
    const mousePushStrength = 1.5      // constant repulsion when hovering
    const mouseSwipeStrength = 1.2     // extra force from fast mouse movement
    const mouseWorldPos = new THREE.Vector3()  // smoothed world position of mouse

    function onMouseMove(e: MouseEvent) {
      const rect = container!.getBoundingClientRect()
      prevMouseRef.current.copy(mouseRef.current)
      mouseRef.current.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      )
    }
    window.addEventListener('mousemove', onMouseMove)

    // ---- Physics step ----
    function simulate() {
      windTime += 0.018

      for (let y = 0; y <= CLOTH_H; y++) {
        for (let x = 0; x <= CLOTH_W; x++) {
          const p = particles[y][x]
          if (p.pinned) continue

          // Gravity
          p.addForce(GRAVITY)

          // Wind — continuous, stronger further from the pinned top
          const falloff = Math.pow(y / CLOTH_H, 0.7)
          const wind = getWind(windTime, x / CLOTH_W, y / CLOTH_H)
          wind.multiplyScalar(falloff)
          p.addForce(wind)
        }
      }

      // Mouse interaction — always active where the cursor is
      raycaster.setFromCamera(mouseRef.current, camera)
      const mouseDelta = new THREE.Vector2().subVectors(mouseRef.current, prevMouseRef.current)
      const mouseSpeed = mouseDelta.length()

      // Find where the mouse ray hits the cloth plane (z=average cloth z)
      const planeNormal = new THREE.Vector3(0, 0, 1)
      const plane = new THREE.Plane(planeNormal, 0)
      const intersectPoint = new THREE.Vector3()
      raycaster.ray.intersectPlane(plane, intersectPoint)

      if (intersectPoint) {
        // Smooth the target position to avoid jitter
        mouseWorldPos.lerp(intersectPoint, 0.3)

        for (let y = 0; y <= CLOTH_H; y++) {
          for (let x = 0; x <= CLOTH_W; x++) {
            const p = particles[y][x]
            if (p.pinned) continue

            const dist = p.position.distanceTo(mouseWorldPos)
            if (dist < mouseInfluenceRadius) {
              const influence = (1 - dist / mouseInfluenceRadius)
              const smoothInfluence = influence * influence  // quadratic falloff — soft edge

              // 1) Constant push: cloth bulges away from mouse (toward camera)
              const pushForce = new THREE.Vector3(0, 0, smoothInfluence * mousePushStrength)
              p.addForce(pushForce)

              // 2) Swipe force: extra push in the direction of mouse movement
              if (mouseSpeed > 0.001) {
                const swipeForce = new THREE.Vector3(
                  mouseDelta.x * mouseSwipeStrength * smoothInfluence * 15,
                  mouseDelta.y * mouseSwipeStrength * smoothInfluence * 15,
                  smoothInfluence * 0.5
                )
                p.addForce(swipeForce)
              }

              // 3) Radial repulsion: push particles away from mouse center
              const radialDir = new THREE.Vector3().subVectors(p.position, mouseWorldPos)
              radialDir.z = 0 // only lateral repulsion
              const radialLen = radialDir.length()
              if (radialLen > 0.01) {
                radialDir.normalize()
                p.addForce(radialDir.multiplyScalar(smoothInfluence * 0.15))
              }
            }
          }
        }
      }

      // Integrate
      for (let y = 0; y <= CLOTH_H; y++) {
        for (let x = 0; x <= CLOTH_W; x++) {
          particles[y][x].integrate()
        }
      }

      // Constraints
      for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
        for (const constraint of constraints) {
          constraint.satisfy()
        }
      }

      // Update geometry
      const positionAttr = clothGeometry.attributes.position as THREE.BufferAttribute
      for (let y = 0; y <= CLOTH_H; y++) {
        for (let x = 0; x <= CLOTH_W; x++) {
          const idx = y * (CLOTH_W + 1) + x
          const p = particles[y][x]
          positionAttr.setXYZ(idx, p.position.x, p.position.y, p.position.z)
        }
      }
      positionAttr.needsUpdate = true
      clothGeometry.computeVertexNormals()
    }

    // ---- Resize ----
    function onResize() {
      const w = container!.clientWidth
      const h = container!.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // ---- Animate ----
    function animate() {
      simulate()
      renderer.render(scene, camera)
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)

    // ---- Cleanup ----
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouseMove)
      renderer.dispose()
      clothGeometry.dispose()
      clothMaterial.dispose()
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  )
}
