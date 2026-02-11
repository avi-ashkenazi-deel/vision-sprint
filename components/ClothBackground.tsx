'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ---- Cloth simulation parameters ----
const CLOTH_W = 60        // segments width
const CLOTH_H = 40        // segments height  
const CLOTH_SIZE_X = 30   // world units width
const CLOTH_SIZE_Y = 20   // world units height
const DAMPING = 0.97
const GRAVITY = new THREE.Vector3(0, -0.08, 0)
const TIMESTEP_SQ = (18 / 1000) * (18 / 1000) // ~18ms timestep squared
const CONSTRAINT_ITERATIONS = 15

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
      30,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, -2, 32)
    camera.lookAt(0, -2, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    container.appendChild(renderer.domElement)

    // ---- Lighting ----
    const ambientLight = new THREE.AmbientLight(0x222228, 1.5)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xdde0ff, 0.8)
    keyLight.position.set(5, 8, 10)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x8888aa, 0.3)
    fillLight.position.set(-5, 3, 8)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0x556677, 0.4)
    rimLight.position.set(0, -5, -10)
    scene.add(rimLight)

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
        // Structural: right neighbor
        if (x < CLOTH_W) {
          constraints.push(new Constraint(particles[y][x], particles[y][x + 1]))
        }
        // Structural: bottom neighbor
        if (y < CLOTH_H) {
          constraints.push(new Constraint(particles[y][x], particles[y + 1][x]))
        }
        // Shear: diagonal down-right
        if (x < CLOTH_W && y < CLOTH_H) {
          constraints.push(new Constraint(particles[y][x], particles[y + 1][x + 1]))
        }
        // Shear: diagonal down-left
        if (x > 0 && y < CLOTH_H) {
          constraints.push(new Constraint(particles[y][x], particles[y + 1][x - 1]))
        }
      }
    }

    // ---- Cloth mesh ----
    const clothGeometry = new THREE.PlaneGeometry(
      CLOTH_SIZE_X,
      CLOTH_SIZE_Y,
      CLOTH_W,
      CLOTH_H
    )

    const clothMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x111115,
      roughness: 0.65,
      metalness: 0.05,
      side: THREE.DoubleSide,
      clearcoat: 0.15,
      clearcoatRoughness: 0.4,
      sheen: 1.0,
      sheenColor: new THREE.Color(0x222233),
      sheenRoughness: 0.3,
    })

    const clothMesh = new THREE.Mesh(clothGeometry, clothMaterial)
    scene.add(clothMesh)

    // ---- Wind ----
    let windTime = 0
    function getWind(time: number, x: number, y: number): THREE.Vector3 {
      // Slowly varying wind with spatial coherence
      const windStrength = 0.4 + 0.25 * Math.sin(time * 0.3) + 0.15 * Math.sin(time * 0.17 + 2.0)
      const gustX = Math.sin(time * 0.7 + x * 0.3) * 0.15
      const gustY = Math.cos(time * 0.5 + y * 0.2) * 0.05
      const gustZ = windStrength * (
        1.0
        + 0.4 * Math.sin(time * 0.23 + x * 0.5 + y * 0.3)
        + 0.2 * Math.sin(time * 0.41 + x * 0.7 - y * 0.5)
      )
      return new THREE.Vector3(gustX, gustY, gustZ)
    }

    // ---- Raycaster for mouse interaction ----
    const raycaster = new THREE.Raycaster()
    const mouseInfluenceRadius = 4
    const mouseForceStrength = 0.6

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
      windTime += 0.016

      // Apply forces
      for (let y = 0; y <= CLOTH_H; y++) {
        for (let x = 0; x <= CLOTH_W; x++) {
          const p = particles[y][x]
          if (p.pinned) continue

          // Gravity
          p.addForce(GRAVITY)

          // Wind - apply to front face, strength increases toward bottom
          const windFalloff = (y / CLOTH_H) // more wind effect further from pin
          const wind = getWind(windTime, x / CLOTH_W, y / CLOTH_H)
          wind.multiplyScalar(windFalloff)
          p.addForce(wind)
        }
      }

      // Mouse interaction - push cloth with the mouse
      raycaster.setFromCamera(mouseRef.current, camera)
      const mouseDelta = new THREE.Vector2().subVectors(mouseRef.current, prevMouseRef.current)
      const mouseSpeed = mouseDelta.length()

      if (mouseSpeed > 0.001) {
        // Find intersection with the cloth plane (roughly z=0 plane)
        const planeNormal = new THREE.Vector3(0, 0, 1)
        const plane = new THREE.Plane(planeNormal, 0)
        const intersectPoint = new THREE.Vector3()
        raycaster.ray.intersectPlane(plane, intersectPoint)

        if (intersectPoint) {
          for (let y = 0; y <= CLOTH_H; y++) {
            for (let x = 0; x <= CLOTH_W; x++) {
              const p = particles[y][x]
              if (p.pinned) continue

              const dist = p.position.distanceTo(intersectPoint)
              if (dist < mouseInfluenceRadius) {
                const influence = 1 - dist / mouseInfluenceRadius
                const force = new THREE.Vector3(
                  mouseDelta.x * mouseForceStrength * influence,
                  mouseDelta.y * mouseForceStrength * influence,
                  influence * 0.3
                )
                p.addForce(force)
              }
            }
          }
        }
      }

      // Integrate particles
      for (let y = 0; y <= CLOTH_H; y++) {
        for (let x = 0; x <= CLOTH_W; x++) {
          particles[y][x].integrate()
        }
      }

      // Satisfy constraints
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

    // ---- Resize handler ----
    function onResize() {
      const w = container!.clientWidth
      const h = container!.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // ---- Animation loop ----
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
