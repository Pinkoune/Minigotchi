import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { Mood } from '../../game/personality'
import { animalModelUrl } from '../petAnimals'

// Renders a Kenney "Cube Pets" animal (CC0) with its bundled animations.
// Clip choice follows the pet's mood; visual states like sleep/death are
// handled with cheap CSS filters on the canvas rather than material edits.

const CLIP_BY_MOOD: Record<Mood, string> = {
  happy: 'dance',
  neutral: 'idle',
  sad: 'gesture-negative',
  hungry: 'gesture-negative',
  dirty: 'gesture-negative',
  sick: 'gesture-negative',
  sleeping: 'static',
}

interface Pet3DProps {
  formId: string
  mood: Mood
  dead: boolean
  eating: boolean
  width?: number
  height?: number
}

interface SceneRefs {
  renderer: THREE.WebGLRenderer
  mixer: THREE.AnimationMixer | null
  actions: Map<string, THREE.AnimationAction>
  current: THREE.AnimationAction | null
  disposed: boolean
}

export function Pet3D({ formId, mood, dead, eating, width = 240, height = 190 }: Pet3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<SceneRefs | null>(null)

  // Scene setup, rebuilt when the form (i.e. the model) changes.
  useEffect(() => {
    const canvas = canvasRef.current
    const url = animalModelUrl(formId)
    if (!canvas || !url) return

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height, false)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 50)
    camera.position.set(0.9, 1.5, 4.2)
    camera.lookAt(0, 0.45, 0)

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb0a890, 1.6))
    const sun = new THREE.DirectionalLight(0xffffff, 1.8)
    sun.position.set(2, 4, 3)
    scene.add(sun)

    const refs: SceneRefs = { renderer, mixer: null, actions: new Map(), current: null, disposed: false }
    sceneRef.current = refs

    new GLTFLoader().load(url, (gltf) => {
      if (refs.disposed) return
      const model = gltf.scene
      // Center the model on the ground plane.
      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      model.position.x -= center.x
      model.position.z -= center.z
      model.position.y -= box.min.y
      scene.add(model)

      refs.mixer = new THREE.AnimationMixer(model)
      for (const clip of gltf.animations) {
        refs.actions.set(clip.name, refs.mixer.clipAction(clip))
      }
      playClip(refs, currentClipName(mood, dead, eating), 0)
    })

    const clock = new THREE.Clock()
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      refs.mixer?.update(clock.getDelta())
      renderer.render(scene, camera)
    }
    loop()

    return () => {
      refs.disposed = true
      cancelAnimationFrame(raf)
      renderer.dispose()
      sceneRef.current = null
    }
    // mood/eating are applied by the effect below without rebuilding the scene
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, width, height])

  // Animation switching on mood/eating/death changes.
  useEffect(() => {
    const refs = sceneRef.current
    if (!refs || !refs.mixer) return
    playClip(refs, currentClipName(mood, dead, eating), 0.35)
  }, [mood, dead, eating])

  const filter = dead
    ? 'grayscale(0.95) brightness(0.85)'
    : mood === 'sick'
      ? 'saturate(0.55) hue-rotate(45deg)'
      : mood === 'sleeping'
        ? 'brightness(0.8)'
        : undefined

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width, height, filter, transform: dead ? 'rotate(90deg) scale(0.8)' : undefined }}
      className="pet3d"
    />
  )
}

function currentClipName(mood: Mood, dead: boolean, eating: boolean): string {
  if (dead) return 'static'
  if (eating) return 'eat'
  return CLIP_BY_MOOD[mood]
}

function playClip(refs: SceneRefs, name: string, fadeSeconds: number): void {
  const next = refs.actions.get(name) ?? refs.actions.get('idle')
  if (!next || next === refs.current) return
  next.reset()
  next.setEffectiveTimeScale(name === 'gesture-negative' ? 0.7 : 1)
  next.play()
  if (refs.current && fadeSeconds > 0) refs.current.crossFadeTo(next, fadeSeconds, false)
  else refs.current?.stop()
  refs.current = next
  // A frozen pose for sleep/death: play "static" then pause the mixer time.
  next.paused = name === 'static'
}
