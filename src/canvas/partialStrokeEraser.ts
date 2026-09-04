import {
  getPointsFromDrawSegment,
  type Editor,
  type TLDrawShapeSegment,
  type TLShape,
  type TLShapeId,
} from 'tldraw'

interface StrokePoint {
  x: number
  y: number
  z?: number
}

interface StrokeFragment {
  type: TLDrawShapeSegment['type']
  points: StrokePoint[]
  dim: 2 | 3
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function numberToFloat16Bits(value: number) {
  if (value === 0) return Object.is(value, -0) ? 0x8000 : 0
  if (!Number.isFinite(value)) return Number.isNaN(value) ? 0x7e00 : value > 0 ? 0x7c00 : 0xfc00
  const sign = value < 0 ? 1 : 0
  value = Math.abs(value)
  const exponent = Math.floor(Math.log2(value))
  let biased = exponent + 15
  if (biased >= 31) return (sign << 15) | 0x7c00
  if (biased <= 0) return (sign << 15) | (Math.round(value * 2 ** 14 * 1024) & 0x3ff)
  let fraction = Math.round((value / 2 ** exponent - 1) * 1024)
  if (fraction >= 1024) {
    fraction = 0
    biased += 1
    if (biased >= 31) return (sign << 15) | 0x7c00
  }
  return (sign << 15) | (biased << 10) | fraction
}

function setFloat16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, numberToFloat16Bits(value), true)
}

function bytesToBase64(bytes: Uint8Array) {
  let result = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index]
    const b = bytes[index + 1]
    const c = bytes[index + 2]
    const value = (a << 16) | ((b ?? 0) << 8) | (c ?? 0)
    result += BASE64[(value >> 18) & 63]
    result += BASE64[(value >> 12) & 63]
    result += index + 1 < bytes.length ? BASE64[(value >> 6) & 63] : '='
    result += index + 2 < bytes.length ? BASE64[value & 63] : '='
  }
  return result
}

function encodePoints(points: StrokePoint[], dim: 2 | 3) {
  const firstBytes = dim === 2 ? 8 : 12
  const deltaBytes = dim === 2 ? 4 : 6
  const bytes = new Uint8Array(firstBytes + Math.max(0, points.length - 1) * deltaBytes)
  const view = new DataView(bytes.buffer)
  const first = points[0]
  view.setFloat32(0, first.x, true)
  view.setFloat32(4, first.y, true)
  if (dim === 3) view.setFloat32(8, first.z ?? 0.5, true)
  let previous = first
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index]
    const offset = firstBytes + (index - 1) * deltaBytes
    setFloat16(view, offset, point.x - previous.x)
    setFloat16(view, offset + 2, point.y - previous.y)
    if (dim === 3) setFloat16(view, offset + 4, (point.z ?? 0.5) - (previous.z ?? 0.5))
    previous = point
  }
  return bytesToBase64(bytes)
}

function resample(points: StrokePoint[], spacing: number) {
  if (points.length < 2) return points
  const sampled: StrokePoint[] = [points[0]]
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]
    const end = points[index]
    const distance = Math.hypot(end.x - start.x, end.y - start.y)
    const steps = Math.max(1, Math.ceil(distance / spacing))
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps
      sampled.push({
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
        z: (start.z ?? 0.5) + ((end.z ?? 0.5) - (start.z ?? 0.5)) * t,
      })
    }
  }
  return sampled
}

function splitSegment(segment: TLDrawShapeSegment, scaleX: number, scaleY: number, center: StrokePoint, radius: number) {
  const dim = segment.dim === 2 ? 2 : 3
  const points = resample(getPointsFromDrawSegment(segment, scaleX, scaleY), Math.max(2, radius / 3))
  const fragments: StrokeFragment[] = []
  let current: StrokePoint[] = []
  let erased = false
  for (const point of points) {
    if (Math.hypot(point.x - center.x, point.y - center.y) <= radius) {
      erased = true
      if (current.length >= 2) fragments.push({ type: segment.type, points: current, dim })
      current = []
    } else {
      current.push(point)
    }
  }
  if (current.length >= 2) fragments.push({ type: segment.type, points: current, dim })
  return { erased, fragments }
}

function isPartialErasable(shape: TLShape): shape is TLShape & {
  type: 'draw' | 'highlight'
  props: { segments: TLDrawShapeSegment[]; scaleX: number; scaleY: number }
} {
  return (shape.type === 'draw' || shape.type === 'highlight') && !shape.isLocked
}

export function erasePartialStrokeAtPoint(editor: Editor, pagePoint: StrokePoint, pageRadius: number) {
  const changes: Array<{ shape: TLShape; fragments: StrokeFragment[] }> = []
  for (const shape of editor.getCurrentPageShapes()) {
    if (!isPartialErasable(shape)) continue
    const bounds = editor.getShapePageBounds(shape)
    if (!bounds || pagePoint.x < bounds.x - pageRadius || pagePoint.x > bounds.x + bounds.w + pageRadius || pagePoint.y < bounds.y - pageRadius || pagePoint.y > bounds.y + bounds.h + pageRadius) continue
    const localPoint = editor.getPointInShapeSpace(shape, pagePoint)
    const fragments: StrokeFragment[] = []
    let erased = false
    for (const segment of shape.props.segments) {
      const result = splitSegment(segment, shape.props.scaleX, shape.props.scaleY, localPoint, pageRadius)
      erased ||= result.erased
      fragments.push(...result.fragments)
    }
    if (erased) changes.push({ shape, fragments })
  }

  if (!changes.length) return false
  editor.run(() => {
    const deleteIds: TLShapeId[] = []
    for (const { shape, fragments } of changes) {
      if (!fragments.length) {
        deleteIds.push(shape.id)
        continue
      }
      const makeProps = (fragment: StrokeFragment) => {
        const encodedPoints = fragment.type === 'straight'
          ? [fragment.points[0], fragment.points[fragment.points.length - 1]]
          : fragment.points
        const props = {
          ...shape.props,
          segments: [{ type: fragment.type, path: encodePoints(encodedPoints, fragment.dim), dim: fragment.dim }],
          isComplete: true,
          scaleX: 1,
          scaleY: 1,
        }
        return shape.type === 'draw' ? { ...props, isClosed: false } : props
      }
      editor.updateShape({ id: shape.id, type: shape.type, props: makeProps(fragments[0]) } as never)
      if (fragments.length > 1) {
        editor.createShapes(fragments.slice(1).map((fragment) => ({
          type: shape.type,
          x: shape.x,
          y: shape.y,
          rotation: shape.rotation,
          parentId: shape.parentId,
          opacity: shape.opacity,
          meta: shape.meta,
          props: makeProps(fragment),
        })) as never)
      }
    }
    if (deleteIds.length) editor.deleteShapes(deleteIds)
  })
  return true
}
