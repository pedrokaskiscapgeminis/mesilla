import * as THREE from 'three'
import React, { Suspense, useRef, useState, useMemo } from 'react'
import { useFrame, createPortal } from 'react-three-fiber'
import { useTransition } from '@react-spring/core'
import { a } from '@react-spring/three'
import { useGLTF, useFBO, ScreenQuad, PerspectiveCamera } from '@react-three/drei'
import CrossFadeMaterial from './XFadeMaterial'

const transitions = {
  from: { rotation: [0, -Math.PI / 10, 0], scale: [0.8, 0.8, 0.8] },
  enter: { rotation: [0, 0, 0], scale: [1, 1, 1] },
  leave: { rotation: [0, Math.PI / 10, 0], scale: [0.8, 0.8, 0.8] }
}

function Model({ model, ...props }) {
  const ref = useRef()
  const [rEuler, rQuaternion] = useMemo(() => [new THREE.Euler(), new THREE.Quaternion()], [])

  useFrame((state) => {
    if (ref.current) {
      rEuler.set(0, (state.mouse.x * Math.PI) / 150, (-state.mouse.y * Math.PI) / 150)
      ref.current.quaternion.slerp(rQuaternion.setFromEuler(rEuler), 0.1)
    }
  })

  return (
    <group ref={ref}>
      <pointLight intensity={0.6} position={[4, 6, -1]} decay={3} rotation={[2, 1, -2]} />
      <a.primitive {...props} object={model.scene} />
    </group>
  )
}

function RenderScene({ target, model, camRef, ...props }) {
  const scene = useMemo(() => new THREE.Scene(), [])

  useFrame((state) => {
    state.gl.setRenderTarget(target)
    state.gl.render(scene, camRef.current)
  }, 0)

  return createPortal(<Model model={model} {...props} />, scene)
}

function Models({ modelIndex = 0 }) {
  const models = useGLTF(['./stool.glb', './table.glb', './bench.glb'])

  // this holds the indexes of the 3D models shown for the scenes
  // [modelIdxForScene0, modelIdxForScene1]
  const [idxesInScenes] = useState([modelIndex, 1])

  // ref of the hidden texture target index
  // in other words the idx of the scene NOT shown
  const hiddenTxt = useRef(1)

  // shown texture index will hold the ref of the scene
  // we transition to, meaning shown on screen.
  const shownTxt = useMemo(() => {
    // if the none of the scenes feature the modelindex we set the current hidden texture
    // (which will be the showing texture in the following render) to the modelIndex
    if (idxesInScenes.indexOf(modelIndex) < 0) idxesInScenes[hiddenTxt.current] = modelIndex

    // the shown texture is the scene holding the model index
    const idx = idxesInScenes.indexOf(modelIndex)
    // the hidden texture is obviously 0 when the shown scene is 1 and vice versa
    hiddenTxt.current = idx ? 0 : 1
    return idx
  }, [modelIndex, idxesInScenes])

  const t0 = useFBO({ stencilBuffer: false, multisample: true })
  const t1 = useFBO({ stencilBuffer: false, multisample: true })
  const targets = [t0, t1]

  const camRef = useRef()
  useFrame((state) => {
    state.gl.setRenderTarget(null)
    state.gl.render(state.scene, state.camera)
  }, 1)

  const transitionSprings = useTransition(shownTxt, { expires: false, ...transitions })

  return (
    <>
      <PerspectiveCamera ref={camRef} position={[-2.5, 1.5, 2]} rotation={[-0.5, -1, -0.4]} far={12} fov={38} />
      <ScreenQuad>
        <CrossFadeMaterial attach="material" texture1={t0.texture} texture2={t1.texture} shownTxt={shownTxt} />
      </ScreenQuad>
      {transitionSprings((props, i) => (
        <RenderScene target={targets[i]} model={models[idxesInScenes[i]]} camRef={camRef} {...props} />
      ))}
    </>
  )
}

export default function Scene({ models, modelIndex }) {
  return (
    <Suspense fallback={null}>
      <Models models={models} modelIndex={modelIndex} />
    </Suspense>
  )
}
