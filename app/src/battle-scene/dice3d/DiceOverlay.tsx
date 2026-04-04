/* eslint-disable functional/immutable-data, no-magic-numbers, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-non-null-assertion */
/**
 * 3D dice overlay for the battle field.
 * Renders a Three.js canvas that floats over the SVG battlefield,
 * showing animated dice rolls for attacks, saves, and damage.
 *
 * Vendored from react-3d-dice v0.1.0 (MIT) — adapted for our overlay use case.
 */
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

import { buildDieMesh, FACE_LABELED, SETTLE_SECS, settleQuat } from "./diceEngine.ts"

export interface DiceRollCue {
  /** Die type: 4, 6, 8, 10, 12, 20 */
  readonly sides: number
  /** Pre-determined results (one per die) */
  readonly results: ReadonlyArray<number>
  /** Hex color for the dice */
  readonly color: number
}

const SPIN_DURATION_MS = 600
const SETTLE_DURATION_MS = SETTLE_SECS * 1000
const TOTAL_DURATION_MS = SPIN_DURATION_MS + SETTLE_DURATION_MS + 400 // linger briefly

interface InternalState {
  scene: THREE.Scene | null
  camera: THREE.OrthographicCamera | null
  renderer: THREE.WebGLRenderer | null
  meshes: Array<THREE.Mesh>
  gridPos: Array<{ x: number; y: number }>
  animId: number | null
  phase: "spinning" | "settling" | "idle"
  settleStart: number
  settleData: Array<{ from: THREE.Quaternion; to: THREE.Quaternion }>
  frustumHalf: number
}

export function DiceOverlay({ cue, onComplete }: { cue: DiceRollCue | null; onComplete: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const S = useRef<InternalState>({
    scene: null,
    camera: null,
    renderer: null,
    meshes: [],
    gridPos: [],
    animId: null,
    phase: "idle",
    settleStart: 0,
    settleData: [],
    frustumHalf: 2.5
  })
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Init Three.js scene (once)
  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const s = S.current

    const scene = new THREE.Scene()
    const w0 = el.clientWidth || 120
    const h0 = el.clientHeight || 120
    const aspect = w0 / h0
    const fh = 2.5
    const camera = new THREE.OrthographicCamera(-fh * aspect, fh * aspect, fh, -fh, 0.1, 100)
    camera.position.set(0, 0, 10)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w0, h0)
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const kl = new THREE.DirectionalLight(0xffffff, 1.0)
    kl.position.set(5, 8, 5)
    scene.add(kl)
    const fl = new THREE.DirectionalLight(0xffffff, 0.3)
    fl.position.set(-3, -2, 4)
    scene.add(fl)

    s.scene = scene
    s.camera = camera
    s.renderer = renderer

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w === 0 || h === 0) return
      const a = w / h
      const fh2 = s.frustumHalf
      camera.left = -fh2 * a
      camera.right = fh2 * a
      camera.top = fh2
      camera.bottom = -fh2
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    ro.observe(el)

    const loop = (time: number) => {
      s.animId = requestAnimationFrame(loop)
      const meshes = s.meshes

      if (s.phase === "spinning") {
        const spd = 12
        meshes.forEach((m, i) => {
          m.rotation.x += (spd + i * 2) * 0.016
          m.rotation.y += (spd * 0.8 + i) * 0.016
          m.rotation.z += spd * 0.3 * 0.016
        })
      } else if (s.phase === "settling") {
        const elapsed = (time - s.settleStart) / 1000
        const p = Math.min(elapsed / SETTLE_SECS, 1)
        const e = 1 - Math.pow(1 - p, 3) // ease-out cubic
        meshes.forEach((m, i) => {
          const d = s.settleData[i]
          if (d) m.quaternion.slerpQuaternions(d.from, d.to, e)
        })
        if (p >= 1) s.phase = "idle"
      } else if (s.phase === "idle" && meshes.length > 0) {
        const t = time / 1000
        meshes.forEach((m, i) => {
          if (s.settleData[i]) {
            const w = new THREE.Quaternion().setFromEuler(
              new THREE.Euler(Math.sin(t * 0.8 + i) * 0.03, Math.sin(t * 0.6 + i * 0.5) * 0.05, 0)
            )
            m.quaternion.copy(s.settleData[i].to).multiply(w)
          }
          if (s.gridPos[i]) {
            m.position.y = s.gridPos[i].y + Math.sin(t * 1.2 + i * 0.7) * 0.06
          }
        })
      }

      renderer.render(scene, camera)
    }
    s.animId = requestAnimationFrame(loop)

    return () => {
      ro.disconnect()
      if (s.animId) cancelAnimationFrame(s.animId)
      s.meshes.forEach((m) => {
        scene.remove(m)
        m.traverse((ch) => {
          if (ch instanceof THREE.Mesh) {
            ch.geometry?.dispose()
            if (ch.material instanceof THREE.Material) ch.material.dispose()
          }
        })
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement)
    }
  }, [])

  // React to cue changes — build meshes, trigger spin → settle → hide
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const s = S.current
    if (!s.scene || !cue) {
      setVisible(false)
      return
    }

    // Clear old meshes
    s.meshes.forEach((m) => {
      s.scene!.remove(m)
      m.traverse((ch) => {
        if (ch instanceof THREE.Mesh) {
          ch.geometry?.dispose()
          if (ch.material instanceof THREE.Material) ch.material.dispose()
        }
      })
    })
    s.meshes = []
    s.gridPos = []
    s.settleData = []

    const { color, results, sides } = cue
    const count = results.length
    if (count === 0) {
      setVisible(false)
      return
    }

    // Build meshes on a grid
    const cols = Math.min(count, 5)
    const rows = Math.ceil(count / cols)
    const spacing = 2.8

    for (let i = 0; i < count; i++) {
      const mesh = buildDieMesh(sides, color)
      const row = Math.floor(i / cols)
      const inRow = i - row * cols
      const rowItems = row === rows - 1 ? count - row * cols : cols
      const x = (-(rowItems - 1) / 2 + inRow) * spacing
      const y = ((rows - 1) / 2 - row) * spacing

      mesh.position.set(x, y, 0)
      mesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
      s.scene.add(mesh)
      s.meshes.push(mesh)
      s.gridPos.push({ x, y })
    }

    // Adjust camera frustum
    const el = mountRef.current
    const spanX = cols * spacing
    const spanY = rows * spacing
    const asp = el ? el.clientWidth / Math.max(el.clientHeight, 1) : 1
    const margin = 1.5
    const needY = spanY / 2 + margin
    const needX = (spanX / 2 + margin) / asp
    const fh = Math.max(needY, needX, 2.5)
    s.frustumHalf = fh
    if (s.camera) {
      s.camera.left = -fh * asp
      s.camera.right = fh * asp
      s.camera.top = fh
      s.camera.bottom = -fh
      s.camera.updateProjectionMatrix()
    }

    // Start spinning
    s.phase = "spinning"
    setVisible(true)

    const isNumbered = FACE_LABELED.has(sides)

    // After spin duration, settle
    const settleTimer = setTimeout(() => {
      s.phase = "settling"
      s.settleStart = performance.now()
      s.settleData = s.meshes.map((m, i) => {
        const from = m.quaternion.clone()
        let to: THREE.Quaternion | null = null
        if (isNumbered && m.userData.faces) {
          to = settleQuat(m, results[i], sides)
        }
        if (!to) {
          to = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 0.3, Math.random() * 0.3, 0))
        }
        return { from, to }
      })
    }, SPIN_DURATION_MS)

    // After total duration, hide and notify
    const hideTimer = setTimeout(() => {
      setVisible(false)
      onComplete()
    }, TOTAL_DURATION_MS)

    timerRef.current = hideTimer

    return () => {
      clearTimeout(settleTimer)
      clearTimeout(hideTimer)
    }
  }, [cue, onComplete])

  return (
    <div
      ref={mountRef}
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        width: 120,
        height: 120,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease-out",
        zIndex: 10
      }}
    />
  )
}
