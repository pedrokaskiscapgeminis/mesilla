import React, { useMemo, useRef } from 'react'
import { extend, useThree, useFrame } from 'react-three-fiber'
import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import glsl from 'babel-plugin-glsl/macro'

const XFadeMaterial = shaderMaterial(
  { texture1: null, texture2: null, shownTxt: -1, resolution: new THREE.Vector2() },
  glsl`
  void main() {
    gl_Position = vec4(position,1.0);
  }
  `,
  glsl`
  #ifdef FXAA
    #pragma glslify: fxaa = require(glsl-fxaa)
  #endif

  varying vec2 v_texCoord0;
  
  uniform vec2 resolution;
  uniform sampler2D texture1;
  uniform sampler2D texture2;
  uniform float shownTxt;

  void main() {
    
    #ifdef FXAA
      vec4 _texture1 = fxaa(texture1, gl_FragCoord.xy, resolution);
      vec4 _texture2 = fxaa(texture2, gl_FragCoord.xy, resolution);
    #else
      vec2 uv = gl_FragCoord.xy / resolution;
      vec4 _texture1 = texture2D(texture1, uv);
      vec4 _texture2 = texture2D(texture2, uv);
    #endif

    float opacity = shownTxt < 0. ? 1. + shownTxt : 1.;
    float _shownTxt = shownTxt < 0. ? 0. : shownTxt;

    vec4 finalTexture = mix(_texture1, _texture2, _shownTxt);
    finalTexture =  vec4(finalTexture.rgb, opacity * finalTexture.a);
    gl_FragColor = finalTexture;
  }
`
)

extend({ XFadeMaterial })

export default function CrossFadeMaterial({ shownTxt, ...props }) {
  const ref = useRef()
  const { size, gl } = useThree()

  const dpr = useMemo(() => gl.getPixelRatio(), [gl])
  useFrame(() => (ref.current.shownTxt = THREE.MathUtils.lerp(ref.current.shownTxt, shownTxt, 0.2)))

  return (
    <xFadeMaterial
      ref={ref}
      {...props}
      resolution={[size.width * dpr, size.height * dpr]}
      defines={{ FXAA: !gl.capabilities.isWebGL2 }}
    />
  )
}
