/* eslint-disable functional/immutable-data, no-magic-numbers, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-non-null-assertion */
/**
 * Vendored + TypeScript-ified from react-3d-dice v0.1.0 (MIT, ChefJulio/BosDev).
 * Three.js dice geometry, face labeling, and settle-quaternion computation.
 * Imperative Three.js code — eslint functional rules disabled for this file.
 */
import * as THREE from "three"

// --- Constants ---

/** Dice with exact face count match get canvas-textured face labels */
export const FACE_LABELED = new Set([4, 6, 8, 10, 12, 20])

/** Label plane size per die type (world-space units) */
export const LABEL_SIZE: Record<number, number> = { 4: 0.95, 6: 1.45, 8: 0.82, 10: 0.68, 12: 0.62, 20: 0.56 }

/** Settle animation duration in seconds */
export const SETTLE_SECS = 0.6

/** D6 standard: opposite faces sum to 7. BoxGeometry face order: +x,-x,+y,-y,+z,-z */
export const D6_NUMBERS = [1, 6, 2, 5, 3, 4]

// --- Color helpers ---

export function parseColor(color: number | string): number {
  if (typeof color === "number") return color
  if (typeof color === "string") {
    if (color.startsWith("#")) return parseInt(color.slice(1), 16)
  }
  return 0x6b7280
}

// --- Texture cache ---

const texCache = new Map<string | number, THREE.CanvasTexture>()

export function clearTextureCache(): void {
  texCache.forEach((tex) => tex.dispose())
  texCache.clear()
}

export function getNumTexture(num: number): THREE.CanvasTexture {
  if (texCache.has(num)) return texCache.get(num)!
  const sz = 256
  const c = document.createElement("canvas")
  c.width = sz
  c.height = sz
  const ctx = c.getContext("2d")!
  ctx.clearRect(0, 0, sz, sz)
  const text = String(num)
  const fs = text.length > 1 ? sz * 0.62 : sz * 0.82
  ctx.font = `bold ${fs}px Arial, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "rgba(0,0,0,0.35)"
  ctx.fillText(text, sz / 2 + 2, sz / 2 + 2)
  ctx.fillStyle = "#ffffff"
  ctx.fillText(text, sz / 2, sz / 2)
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  texCache.set(num, tex)
  return tex
}

// --- Geometry helpers ---

export function createD10Geometry(radius: number): THREE.BufferGeometry {
  const H = radius
  const h = (H * (1 - Math.cos(Math.PI / 5))) / (1 + Math.cos(Math.PI / 5))
  const r = radius * 0.85

  const top = [0, H, 0] as const
  const bot = [0, -H, 0] as const
  const upper: Array<readonly [number, number, number]> = []
  const lower: Array<readonly [number, number, number]> = []

  for (let k = 0; k < 5; k++) {
    const aU = (k * 2 * Math.PI) / 5
    const aL = aU + Math.PI / 5
    upper.push([r * Math.cos(aU), h, r * Math.sin(aU)])
    lower.push([r * Math.cos(aL), -h, r * Math.sin(aL)])
  }

  const verts: Array<number> = []
  function push3(v: readonly [number, number, number]) {
    verts.push(v[0], v[1], v[2])
  }

  for (let k = 0; k < 5; k++) {
    const nk = (k + 1) % 5
    push3(top)
    push3(lower[k])
    push3(upper[k])
    push3(top)
    push3(upper[nk])
    push3(lower[k])
    push3(bot)
    push3(lower[k])
    push3(upper[nk])
    push3(bot)
    push3(upper[nk])
    push3(lower[nk])
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3))
  geo.computeVertexNormals()
  return geo
}

export function createGeometry(sides: number): THREE.BufferGeometry {
  switch (sides) {
    case 4:
      return new THREE.TetrahedronGeometry(1.2, 0)
    case 6:
      return new THREE.BoxGeometry(1.7, 1.7, 1.7)
    case 8:
      return new THREE.OctahedronGeometry(1.2, 0)
    case 10:
      return createD10Geometry(1.2)
    case 12:
      return new THREE.DodecahedronGeometry(1.2, 0)
    case 20:
      return new THREE.IcosahedronGeometry(1.2, 0)
    default:
      return new THREE.IcosahedronGeometry(1.14, 0)
  }
}

export function geomFaceCount(sides: number): number {
  if (sides >= 4 && sides <= 20 && FACE_LABELED.has(sides)) return sides
  return 20
}

export interface FaceData {
  centroid: THREE.Vector3
  normal: THREE.Vector3
  verts: Array<THREE.Vector3>
}

export function computeFaces(geometry: THREE.BufferGeometry, numFaces: number): Array<FaceData> {
  const pos = geometry.getAttribute("position") as THREE.BufferAttribute
  const idx = geometry.index

  if (idx) {
    const totalTris = idx.count / 3
    const tpf = Math.round(totalTris / numFaces)
    const faces: Array<FaceData> = []
    for (let f = 0; f < numFaces; f++) {
      const centroid = new THREE.Vector3()
      const normal = new THREE.Vector3()
      const faceVerts: Array<THREE.Vector3> = []
      const seenIdx = new Set<number>()
      let vertCount = 0
      for (let t = f * tpf; t < (f + 1) * tpf; t++) {
        const base = t * 3
        const ia = idx.getX(base),
          ib = idx.getX(base + 1),
          ic = idx.getX(base + 2)
        const a = new THREE.Vector3().fromBufferAttribute(pos, ia)
        const b = new THREE.Vector3().fromBufferAttribute(pos, ib)
        const c = new THREE.Vector3().fromBufferAttribute(pos, ic)
        centroid.add(a).add(b).add(c)
        vertCount += 3
        if (t === f * tpf) {
          normal.crossVectors(new THREE.Vector3().subVectors(b, a), new THREE.Vector3().subVectors(c, a)).normalize()
        }
        if (!seenIdx.has(ia)) {
          seenIdx.add(ia)
          faceVerts.push(a)
        }
        if (!seenIdx.has(ib)) {
          seenIdx.add(ib)
          faceVerts.push(b)
        }
        if (!seenIdx.has(ic)) {
          seenIdx.add(ic)
          faceVerts.push(c)
        }
      }
      centroid.divideScalar(vertCount)
      if (normal.dot(centroid) < 0) normal.negate()
      faces.push({ centroid: centroid.clone(), normal: normal.clone(), verts: faceVerts })
    }
    return faces
  }

  const totalTris = pos.count / 3
  const clusters: Array<{ normal: THREE.Vector3; verts: Array<THREE.Vector3> }> = []

  for (let t = 0; t < totalTris; t++) {
    const vi = t * 3
    const a = new THREE.Vector3().fromBufferAttribute(pos, vi)
    const b = new THREE.Vector3().fromBufferAttribute(pos, vi + 1)
    const c = new THREE.Vector3().fromBufferAttribute(pos, vi + 2)
    const n = new THREE.Vector3()
      .crossVectors(new THREE.Vector3().subVectors(b, a), new THREE.Vector3().subVectors(c, a))
      .normalize()
    const mid = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3)
    if (n.dot(mid) < 0) n.negate()

    let found = false
    for (const cl of clusters) {
      if (cl.normal.dot(n) > 0.999) {
        cl.verts.push(a, b, c)
        found = true
        break
      }
    }
    if (!found) {
      clusters.push({ normal: n.clone(), verts: [a, b, c] })
    }
  }

  clusters.sort((a, b) => {
    const an = a.normal,
      bn = b.normal
    if (Math.abs(an.x - bn.x) > 0.001) return an.x - bn.x
    if (Math.abs(an.y - bn.y) > 0.001) return an.y - bn.y
    return an.z - bn.z
  })

  return clusters.map((cl) => {
    const centroid = new THREE.Vector3()
    cl.verts.forEach((v) => centroid.add(v))
    centroid.divideScalar(cl.verts.length)
    const unique: Array<THREE.Vector3> = []
    for (const v of cl.verts) {
      let isDup = false
      for (const u of unique) {
        if (v.distanceTo(u) < 0.001) {
          isDup = true
          break
        }
      }
      if (!isDup) unique.push(v.clone())
    }
    return { centroid: centroid.clone(), normal: cl.normal.clone(), verts: unique }
  })
}

export function computeFaceNumbers(faces: Array<FaceData>, sides: number): Array<number> {
  if (sides === 6) return D6_NUMBERS
  if (sides === 4) return [1, 2, 3, 4]

  const n = faces.length
  const numbers = new Array<number>(n).fill(0)
  const target = sides + 1

  const pairs: Array<[number, number]> = []
  const used = new Set<number>()
  for (let i = 0; i < n; i++) {
    if (used.has(i)) continue
    for (let j = i + 1; j < n; j++) {
      if (used.has(j)) continue
      if (faces[i].normal.dot(faces[j].normal) < -0.99) {
        pairs.push([i, j])
        used.add(i)
        used.add(j)
        break
      }
    }
    if (!used.has(i)) {
      pairs.push([i, -1])
      used.add(i)
    }
  }

  if (sides === 10) {
    pairs.forEach((p) => {
      if (p[1] >= 0 && faces[p[0]].centroid.y < faces[p[1]].centroid.y) {
        ;[p[0], p[1]] = [p[1], p[0]]
      }
    })
    pairs.sort((a, b) => {
      const aA = Math.atan2(faces[a[0]].centroid.z, faces[a[0]].centroid.x)
      const bA = Math.atan2(faces[b[0]].centroid.z, faces[b[0]].centroid.x)
      return aA - bA
    })
    for (let k = 0; k < pairs.length; k++) {
      numbers[pairs[k][0]] = k * 2 + 1
      if (pairs[k][1] >= 0) numbers[pairs[k][1]] = target - (k * 2 + 1)
    }
    return numbers
  }

  for (let k = 0; k < pairs.length; k++) {
    numbers[pairs[k][0]] = k + 1
    if (pairs[k][1] >= 0) numbers[pairs[k][1]] = target - (k + 1)
  }
  return numbers
}

export function faceSettleQuat(face: FaceData, sides: number): THREE.Quaternion {
  const n = face.normal.clone().normalize()

  let ref = new THREE.Vector3(0, 1, 0)
  if (Math.abs(n.dot(ref)) > 0.99) ref = new THREE.Vector3(0, 0, 1)
  const refUp = ref.clone().addScaledVector(n, -ref.dot(n)).normalize()

  let faceUp: THREE.Vector3
  if (sides === 10) {
    const H = 1.2
    const pole = face.centroid.y > 0 ? new THREE.Vector3(0, H, 0) : new THREE.Vector3(0, -H, 0)
    const toPole = new THREE.Vector3().subVectors(pole, face.centroid)
    toPole.addScaledVector(n, -toPole.dot(n)).normalize()
    faceUp = toPole.negate()
  } else if (sides !== 6 && face.verts && face.verts.length >= 3) {
    let bestDot = -Infinity
    faceUp = refUp
    for (const v of face.verts) {
      const dir = new THREE.Vector3().subVectors(v, face.centroid).normalize()
      const d = dir.dot(refUp)
      if (d > bestDot) {
        bestDot = d
        faceUp = dir
      }
    }
  } else {
    faceUp = refUp
  }

  const xAxis = new THREE.Vector3().crossVectors(faceUp, n).normalize()
  const m = new THREE.Matrix4().makeBasis(xAxis, faceUp, n)
  return new THREE.Quaternion().setFromRotationMatrix(m).conjugate()
}

export function buildDieMesh(sides: number, color: number): THREE.Mesh {
  const geo = createGeometry(sides)
  const mat = new THREE.MeshPhongMaterial({
    color,
    shininess: 80,
    specular: 0x333333,
    flatShading: sides !== 6
  })
  const mesh = new THREE.Mesh(geo, mat)

  const eg = new THREE.EdgesGeometry(geo)
  const em = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 })
  mesh.add(new THREE.LineSegments(eg, em))

  if (FACE_LABELED.has(sides)) {
    const nf = geomFaceCount(sides)
    const faces = computeFaces(geo, nf)
    mesh.userData.faces = faces
    const ls = LABEL_SIZE[sides] || 0.3

    const faceNumbers = computeFaceNumbers(faces, sides)
    mesh.userData.faceNumbers = faceNumbers
    const numberToFace: Record<number, number> = {}
    faceNumbers.forEach((num, idx) => {
      numberToFace[num] = idx
    })
    mesh.userData.numberToFace = numberToFace

    for (let i = 0; i < sides; i++) {
      const face = faces[i]
      if (!face) continue
      const num = faceNumbers[i]
      const tex = getNumTexture(num)
      const pg = new THREE.PlaneGeometry(ls, ls)
      const pm = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      })
      const label = new THREE.Mesh(pg, pm)
      label.position.copy(face.centroid).addScaledVector(face.normal, 0.02)
      const sq = faceSettleQuat(face, sides)
      label.quaternion.copy(sq.conjugate())
      mesh.add(label)
    }
  }

  return mesh
}

export function settleQuat(mesh: THREE.Mesh, result: number, sides: number): THREE.Quaternion | null {
  const faces = mesh.userData.faces as Array<FaceData> | undefined
  const ntf = mesh.userData.numberToFace as Record<number, number> | undefined
  if (!faces || !ntf) return null
  const fi = ntf[result]
  if (fi == null || fi < 0 || fi >= faces.length) return null
  return faceSettleQuat(faces[fi], sides)
}
