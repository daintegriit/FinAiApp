import React, { useRef } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

import { useTheme } from "../../../src/theme/ThemeContext";

export type PeerCluster = {
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  peer_count: number;
  avg_monthly_income?: number | null;
  avg_savings_rate?: number | null;
};

type GlobeProps = {
  size?: number;
  dotColor?: string;
  markers?: PeerCluster[];
  onMarkerPress?: (cluster: PeerCluster) => void;
};

export default function Globe({
  size = 58,
  dotColor,
  markers = [],
  onMarkerPress,
}: GlobeProps) {

  const { theme } = useTheme();
  const webviewRef = useRef<WebView>(null);

  // ======================================
  // 🔥 AUTO THEME COLORS
  // ======================================
  const resolvedDotColor = dotColor || theme.colors.primary;
  const resolvedWireframeColor = theme.colors.border || "#CBD5E1";
  const resolvedMarkerColor = theme.colors.accent || "#FF3232";

  // ======================================
  // 🔥 MARKER DATA (safe JSON for injection)
  // ======================================
  const markersJson = JSON.stringify(
    markers.map((m) => ({
      city: m.city,
      state: m.state,
      latitude: m.latitude,
      longitude: m.longitude,
      peer_count: m.peer_count,
      avg_monthly_income: m.avg_monthly_income ?? null,
      avg_savings_rate: m.avg_savings_rate ?? null,
    }))
  );

  function handleMessage(event: any) {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data?.type === "marker_press" && onMarkerPress) {
        onMarkerPress(data.cluster as PeerCluster);
      }
    } catch (err) {
      console.error("🌍 Globe message parse error:", err);
    }
  }

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <meta
        name="viewport"
        content="
          width=device-width,
          initial-scale=1.0,
          maximum-scale=1.0,
          user-scalable=no
        "
      />
      <style>
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: transparent;
          touch-action: none;
        }
        canvas {
          display: block;
          width: 100% !important;
          height: 100% !important;
        }
      </style>
      <script src="https://unpkg.com/three@0.136.0/build/three.min.js"></script>
      <script src="https://unpkg.com/three@0.136.0/examples/js/controls/OrbitControls.js"></script>
    </head>
    <body>
      <script>
        const PEER_CLUSTERS = ${markersJson};
        const GLOBE_RADIUS = 5;

        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(
          45,
          1,
          1,
          2000
        );

        const startPos = new THREE.Vector3(0.5, 0.5, 1).setLength(14);
        camera.position.copy(startPos);

        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
        });

        renderer.setSize(${size}, ${size});
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0);

        document.body.appendChild(renderer.domElement);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);

        controls.enablePan = false;
        controls.enableZoom = false;
        controls.enableRotate = true;
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.5;

        let isUserInteracting = false;
        let interactionTimeout;
        let isResetting = false;

        controls.addEventListener('start', () => {
          isUserInteracting = true;
          isResetting = false;
          controls.autoRotate = false;
          clearTimeout(interactionTimeout);
        });

        controls.addEventListener('end', () => {
          interactionTimeout = setTimeout(() => {
            isUserInteracting = false;
            if (!isResetting) controls.autoRotate = true;
          }, 2500);
        });

        // ========================================
        // ⚡ DOUBLE TAP DETECTION (reset view)
        // ========================================
        let lastTap = 0;
        window.addEventListener('touchstart', (e) => {
          const now = Date.now();
          const timespan = now - lastTap;

          if (timespan < 300 && timespan > 0) {
            e.preventDefault();
            isResetting = true;
            isUserInteracting = false;
            controls.autoRotate = false;
          }
          lastTap = now;
        }, { passive: false });

        // ========================================
        // 🌍 TEXTURE
        // ========================================
        const globeTexture =
          new THREE.TextureLoader().load(
            "https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg"
          );
        const landMaskTexture =
          new THREE.TextureLoader().load(
            "https://unpkg.com/three-globe/example/img/earth-water.png"
          );

        // ========================================
        // 🌎 FIBONACCI SPHERE (base globe dots)
        // ========================================
        let counter = 35000;
        let rad = GLOBE_RADIUS;
        let sph = new THREE.Spherical();

        let r = 0;
        let dlong = Math.PI * (3 - Math.sqrt(5));
        let dz = 2 / counter;
        let long = 0;
        let z = 1 - dz / 2;

        let pts = [];
        let clr = [];
        let c = new THREE.Color("${resolvedDotColor}");
        let uvs = [];

        for (let i = 0; i < counter; i++) {
          r = Math.sqrt(1 - z * z);
          let p = new THREE.Vector3(
            Math.cos(long) * r,
            z,
            -Math.sin(long) * r
          ).multiplyScalar(rad);

          pts.push(p);
          z = z - dz;
          long = long + dlong;

          c.toArray(clr, i * 3);
          sph.setFromVector3(p);

          uvs.push(
            (sph.theta + Math.PI) / (Math.PI * 2),
            1.0 - sph.phi / Math.PI
          );
        }

        let g = new THREE.BufferGeometry().setFromPoints(pts);
        g.setAttribute("color", new THREE.Float32BufferAttribute(clr, 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

        let m = new THREE.PointsMaterial({
          size: 0.18,
          vertexColors: true,
          transparent: true,
          opacity: 1,
          onBeforeCompile: (shader) => {
            shader.uniforms.globeTexture = {
              value: globeTexture
            };
            shader.uniforms.landMask = {
              value: landMaskTexture
            };

            shader.vertexShader = \`
              uniform sampler2D globeTexture;
              uniform sampler2D landMask;
              varying float vVisibility;
              varying vec3 vNormal;
              varying vec3 vMvPosition;
              \${shader.vertexShader}
            \`.replace(
              \`gl_PointSize = size;\`,
              \`
                vec4 maskColor = texture2D(landMask, uv);
                vVisibility = 1.0 - maskColor.r;

                gl_PointSize = size * (vVisibility > 0.5 ? 1.65 : 0.0);
                vNormal = normalMatrix * normalize(position);
                vMvPosition = -mvPosition.xyz;

                gl_PointSize *= 0.55 + (dot(normalize(vMvPosition), vNormal) * 0.45);
              \`
            );

            shader.fragmentShader = \`
              varying float vVisibility;
              varying vec3 vNormal;
              varying vec3 vMvPosition;
              \${shader.fragmentShader}
            \`.replace(
              \`vec4 diffuseColor = vec4( diffuse, opacity );\`,
              \`
                bool circ = length(gl_PointCoord - 0.5) > 0.5;
                bool backFace = dot(vMvPosition, vNormal) < 0.;

                if (circ || backFace) discard;
                if (vVisibility < 0.5) discard;

                vec4 diffuseColor = vec4( diffuse, opacity );
              \`
            );
          }
        });

        let globe = new THREE.Points(g, m);
        scene.add(globe);

        const wireframe = new THREE.Mesh(
          new THREE.IcosahedronGeometry(rad, 1),
          new THREE.MeshBasicMaterial({
            color: "${resolvedWireframeColor}",
            wireframe: true,
            transparent: true,
            opacity: 0.15
          })
        );
        globe.add(wireframe);

        // ========================================
        // 📍 PEER MARKERS (city-level, anonymized)
        // ========================================

        let markerInfo = [];
        let markers = null;

        // Matches the base globe's own Fibonacci-sphere convention:
        // x = cos(long) * r, z = -sin(long) * r, where long is derived
        // from theta in the UV mapping. We invert that relationship
        // here so a given lat/lng lands on the same texture point
        // the base globe would show at that geographic location.
        // Derive marker position by directly inverting the exact same
        // UV formula used for the base globe's texture sampling, so
        // marker placement is guaranteed consistent with however the
        // landmasses actually render — no separate lat/lng formula
        // that could disagree with the texture's own orientation.
        //
        // Standard equirectangular texture convention:
        //   U = 0   -> 180°W (left edge of texture)
        //   U = 0.5 -> 0° (prime meridian, center of texture)
        //   U = 1   -> 180°E (right edge of texture)
        //   V = 0   -> North pole (top of texture)
        //   V = 1   -> South pole (bottom of texture)
        // Directly replicates the base globe's own point-generation
        // formula (x = cos(long)*r, y = z_var*r, z = -sin(long)*r),
        // parameterized by real lat/lng instead of the Fibonacci
        // sequence — guarantees markers align with the same texture
        // mapping as the visible landmasses, by using identical math.
        function latLngToVector3(lat, lng, radius) {
          const long = (lng * Math.PI) / 180 - Math.PI / 2;
          const zVar = Math.sin((lat * Math.PI) / 180);
          const r = Math.sqrt(1 - zVar * zVar);

          const x = Math.cos(long) * r * radius;
          const y = zVar * radius;
          const z = -Math.sin(long) * r * radius;

          return new THREE.Vector3(x, y, z);
        }

        if (PEER_CLUSTERS.length > 0) {

          const gMarker = new THREE.PlaneGeometry(0.6, 0.6);

          const mMarker = new THREE.MeshBasicMaterial({
            color: "${resolvedMarkerColor}",
            transparent: true,
            side: THREE.DoubleSide,
            onBeforeCompile: (shader) => {
              shader.uniforms.time = { value: 0 };
              mMarker.userData.shaderRef = shader;

              shader.vertexShader = \`
                attribute float phase;
                varying float vPhase;
                \${shader.vertexShader}
              \`.replace(
                \`#include <begin_vertex>\`,
                \`
                  #include <begin_vertex>
                  vPhase = phase;
                \`
              );

              shader.fragmentShader = \`
                uniform float time;
                varying float vPhase;
                \${shader.fragmentShader}
              \`.replace(
                \`vec4 diffuseColor = vec4( diffuse, opacity );\`,
                \`
                  vec2 lUv = (vUv - 0.5) * 2.0;
                  float lenUv = length(lUv);
                  float val = 0.0;

                  val = max(val, 1.0 - step(0.22, lenUv));

                  float tShift = fract(time * 0.5 + vPhase);
                  val = max(val, step(0.3 + (tShift * 0.6), lenUv) - step(0.4 + (tShift * 0.5), lenUv));

                  if (val < 0.5) discard;

                  vec4 diffuseColor = vec4( diffuse, opacity );
                \`
              );
            }
          });

          mMarker.defines = { USE_UV: " " };

          markers = new THREE.InstancedMesh(gMarker, mMarker, PEER_CLUSTERS.length);

          const dummy = new THREE.Object3D();
          const phase = [];

          for (let i = 0; i < PEER_CLUSTERS.length; i++) {
            const cluster = PEER_CLUSTERS[i];
            const pos = latLngToVector3(cluster.latitude, cluster.longitude, rad + 0.08);

            dummy.position.copy(pos);
            dummy.lookAt(pos.clone().setLength(rad + 1));
            dummy.updateMatrix();

            markers.setMatrixAt(i, dummy.matrix);
            phase.push(Math.random());

            markerInfo.push({
              cluster: cluster,
              position: pos.clone(),
            });
          }

          gMarker.setAttribute(
            "phase",
            new THREE.InstancedBufferAttribute(new Float32Array(phase), 1)
          );

          globe.add(markers);
        }

        // ========================================
        // 👆 MARKER TAP DETECTION
        // ========================================

        const pointer = new THREE.Vector2();
        const raycaster = new THREE.Raycaster();

        function handleTap(clientX, clientY) {
          if (!markers) return;

          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

          raycaster.setFromCamera(pointer, camera);

          const intersections = raycaster.intersectObject(markers).filter((hit) => {
            return (hit.uv.clone().subScalar(0.5).length() * 2) < 0.9;
          });

          if (intersections.length > 0) {
            const instanceId = intersections[0].instanceId;
            const info = markerInfo[instanceId];

            if (info && window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({
                  type: "marker_press",
                  cluster: info.cluster,
                })
              );
            }
          }
        }

        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        window.addEventListener('touchstart', (e) => {
          if (e.touches && e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
          }
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
          if (e.changedTouches && e.changedTouches.length === 1) {
            const touch = e.changedTouches[0];
            const dx = touch.clientX - touchStartX;
            const dy = touch.clientY - touchStartY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const duration = Date.now() - touchStartTime;

            // Treat as a tap (not a drag) if movement was minimal and quick
            if (distance < 12 && duration < 400) {
              handleTap(touch.clientX, touch.clientY);
            }
          }
        }, { passive: true });

        // ========================================
        // 🔁 ANIMATION LOOP
        // ========================================

        function animate() {
          requestAnimationFrame(animate);

          if (isResetting) {
            camera.position.lerp(startPos, 0.08);
            controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.08);

            if (camera.position.distanceTo(startPos) < 0.01) {
              camera.position.copy(startPos);
              controls.target.set(0, 0, 0);
              isResetting = false;
              controls.autoRotate = true;
            }
          }

          if (typeof mMarker !== 'undefined' && mMarker.userData.shaderRef) {
            mMarker.userData.shaderRef.uniforms.time.value =
              performance.now() / 1000;
          }

          controls.update();
          renderer.render(scene, camera);
        }
        animate();
      </script>
    </body>
  </html>
  `;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        overScrollMode="never"
        androidLayerType="hardware"
        onMessage={handleMessage}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  webview: {
    backgroundColor: "transparent",
  },
});