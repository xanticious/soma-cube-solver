import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import type { Placement, PieceName, Vec3 } from '../../core/types';

import { PIECE_OFFSETS, PIECE_COLORS } from '../../core/pieces';

import { transformOffsets } from '../../core/rotations';

const CUBELET_SIZE = 1;

const CUBELET_GAP = 0.04;

const EDGE_COLOR = '#333333';

export interface SceneContext {
  renderer: THREE.WebGLRenderer;

  scene: THREE.Scene;

  camera: THREE.PerspectiveCamera;

  controls: OrbitControls;

  cubeGroup: THREE.Group;

  gridHelper: THREE.Group;

  labelsGroup: THREE.Group;

  animationId: number;

  dispose(): void;
}

/**
 * Initialize a Three.js scene in the given container element.
 */

export function createScene(container: HTMLElement): SceneContext {
  const width = container.clientWidth;

  const height = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

  renderer.setSize(width, height);

  renderer.setPixelRatio(window.devicePixelRatio);

  renderer.setClearColor(0xf5f5f5);

  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);

  camera.position.set(5, 5, 5);

  camera.lookAt(1, 1, 1);

  const controls = new OrbitControls(camera, renderer.domElement);

  controls.target.set(1, 1, 1);

  controls.enableDamping = true;

  controls.dampingFactor = 0.1;

  controls.update();

  // Lighting

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);

  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);

  directionalLight.position.set(5, 10, 7);

  scene.add(directionalLight);

  const cubeGroup = new THREE.Group();

  scene.add(cubeGroup);

  const gridHelper = new THREE.Group();

  scene.add(gridHelper);

  const labelsGroup = new THREE.Group();

  scene.add(labelsGroup);

  let animationId = 0;

  function animate() {
    animationId = requestAnimationFrame(animate);

    controls.update();

    renderer.render(scene, camera);
  }

  animate();

  // Handle resize

  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;

    const h = container.clientHeight;

    renderer.setSize(w, h);

    camera.aspect = w / h;

    camera.updateProjectionMatrix();
  });

  resizeObserver.observe(container);

  function dispose() {
    cancelAnimationFrame(animationId);

    resizeObserver.disconnect();

    controls.dispose();

    renderer.dispose();

    container.removeChild(renderer.domElement);
  }

  return {
    renderer,

    scene,

    camera,

    controls,

    cubeGroup,

    gridHelper,

    labelsGroup,

    animationId,

    dispose,
  };
}

/**
 * Create a cubelet mesh at a given position with a given color.
 */

function createCubelet(
  position: Vec3,

  color: string,

  opacity: number = 1,
): THREE.Group {
  const group = new THREE.Group();

  const size = CUBELET_SIZE - CUBELET_GAP;

  const geometry = new THREE.BoxGeometry(size, size, size);

  const material = new THREE.MeshLambertMaterial({
    color: new THREE.Color(color),

    transparent: opacity < 1,

    opacity,
  });

  const mesh = new THREE.Mesh(geometry, material);

  group.add(mesh);

  // Edges for Lego-like look

  const edgesGeometry = new THREE.EdgesGeometry(geometry);

  const edgesMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(EDGE_COLOR),

    transparent: opacity < 1,

    opacity,
  });

  const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);

  group.add(edges);

  group.position.set(position.x, position.y, position.z);

  return group;
}

/**
 * Render placements into the scene's cubeGroup.
 * Clears existing cubelets first.
 */

export function renderPlacements(
  ctx: SceneContext,

  placements: Placement[],
): void {
  clearCubelets(ctx);

  for (const placement of placements) {
    const offsets = PIECE_OFFSETS[placement.piece];

    const cells = transformOffsets(
      offsets,

      placement.orientation,

      placement.position,
    );

    const color = PIECE_COLORS[placement.piece];

    for (const cell of cells) {
      const cubelet = createCubelet(cell, color);

      ctx.cubeGroup.add(cubelet);
    }
  }
}

/**
 * Render a floating piece (Builder View) with anchor in red, rest in blue.
 */

export function renderFloatingPiece(
  ctx: SceneContext,

  piece: PieceName,

  orientation: import('../../core/types').Orientation,

  position: Vec3,
): void {
  const offsets = PIECE_OFFSETS[piece];

  const cells = transformOffsets(offsets, orientation, position);

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!;

    const color = i === 0 ? '#CC0000' : '#3399FF';

    const cubelet = createCubelet(cell, color, 0.7);

    cubelet.userData = { floating: true };

    ctx.cubeGroup.add(cubelet);
  }
}

/**
 * Remove floating piece meshes from the scene.
 */

export function clearFloatingPieces(ctx: SceneContext): void {
  const toRemove: THREE.Object3D[] = [];

  ctx.cubeGroup.traverse((child) => {
    if (child.userData?.floating) {
      toRemove.push(child);
    }
  });

  // Remove from parent (which is cubeGroup or a child group)

  for (const obj of toRemove) {
    obj.removeFromParent();
  }
}

/**
 * Clear all cubelets from the scene.
 */

export function clearCubelets(ctx: SceneContext): void {
  while (ctx.cubeGroup.children.length > 0) {
    const child = ctx.cubeGroup.children[0]!;

    ctx.cubeGroup.remove(child);
  }
}

/**
 * Draw a wireframe grid of the given size.
 */

export function renderGrid(ctx: SceneContext, gridSize: number): void {
  // Clear existing grid

  while (ctx.gridHelper.children.length > 0) {
    ctx.gridHelper.remove(ctx.gridHelper.children[0]!);
  }

  const material = new THREE.LineBasicMaterial({
    color: 0xcccccc,

    transparent: true,

    opacity: 0.4,
  });

  // Draw grid lines on each layer

  for (let layer = 0; layer <= gridSize; layer++) {
    // X-Z plane lines (along X)

    for (let i = 0; i <= gridSize; i++) {
      const points = [
        new THREE.Vector3(-0.5, layer - 0.5, i - 0.5),

        new THREE.Vector3(gridSize - 0.5, layer - 0.5, i - 0.5),
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      ctx.gridHelper.add(new THREE.Line(geometry, material));
    }

    // X-Z plane lines (along Z)

    for (let i = 0; i <= gridSize; i++) {
      const points = [
        new THREE.Vector3(i - 0.5, layer - 0.5, -0.5),

        new THREE.Vector3(i - 0.5, layer - 0.5, gridSize - 0.5),
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      ctx.gridHelper.add(new THREE.Line(geometry, material));
    }
  }

  // Vertical lines at each column/row intersection

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const points = [
        new THREE.Vector3(i - 0.5, -0.5, j - 0.5),

        new THREE.Vector3(i - 0.5, gridSize - 0.5, j - 0.5),
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      ctx.gridHelper.add(new THREE.Line(geometry, material));
    }
  }
}

/**
 * Reposition camera and orbit target for a given grid size.
 */

export function setCameraForGrid(ctx: SceneContext, gridSize: number): void {
  const center = (gridSize - 1) / 2;

  ctx.controls.target.set(center, center, center);

  ctx.camera.position.set(
    center + gridSize * 1.5,

    center + gridSize * 1.2,

    center + gridSize * 1.5,
  );

  ctx.controls.update();
}

/**
 * Draw two wireframe grids side-by-side (solution + staging) for builder mode.
 */
export function renderDualGrids(
  ctx: SceneContext,
  gridSize: number,
  gapX: number,
): void {
  while (ctx.gridHelper.children.length > 0) {
    ctx.gridHelper.remove(ctx.gridHelper.children[0]!);
  }

  addGridLines(ctx, gridSize, { x: 0, y: 0, z: 0 });
  addGridLines(ctx, gridSize, { x: gridSize + gapX, y: 0, z: 0 });
}

function addGridLines(ctx: SceneContext, gridSize: number, offset: Vec3): void {
  const material = new THREE.LineBasicMaterial({
    color: 0xcccccc,
    transparent: true,
    opacity: 0.4,
  });

  for (let layer = 0; layer <= gridSize; layer++) {
    for (let i = 0; i <= gridSize; i++) {
      const points = [
        new THREE.Vector3(
          offset.x - 0.5,
          offset.y + layer - 0.5,
          offset.z + i - 0.5,
        ),
        new THREE.Vector3(
          offset.x + gridSize - 0.5,
          offset.y + layer - 0.5,
          offset.z + i - 0.5,
        ),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      ctx.gridHelper.add(new THREE.Line(geometry, material));
    }

    for (let i = 0; i <= gridSize; i++) {
      const points = [
        new THREE.Vector3(
          offset.x + i - 0.5,
          offset.y + layer - 0.5,
          offset.z - 0.5,
        ),
        new THREE.Vector3(
          offset.x + i - 0.5,
          offset.y + layer - 0.5,
          offset.z + gridSize - 0.5,
        ),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      ctx.gridHelper.add(new THREE.Line(geometry, material));
    }
  }

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const points = [
        new THREE.Vector3(
          offset.x + i - 0.5,
          offset.y - 0.5,
          offset.z + j - 0.5,
        ),
        new THREE.Vector3(
          offset.x + i - 0.5,
          offset.y + gridSize - 0.5,
          offset.z + j - 0.5,
        ),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      ctx.gridHelper.add(new THREE.Line(geometry, material));
    }
  }
}

/**
 * Reposition camera and orbit target to see both builder grids.
 */
export function setCameraForDualGrids(
  ctx: SceneContext,
  gridSize: number,
  gapX: number,
): void {
  const totalWidth = gridSize * 2 + gapX;
  const centerX = (totalWidth - 1) / 2;
  const centerYZ = (gridSize - 1) / 2;

  ctx.controls.target.set(centerX, centerYZ, centerYZ);
  ctx.camera.position.set(
    centerX,
    centerYZ + totalWidth * 0.4,
    centerYZ - totalWidth * 1.2,
  );
  ctx.controls.update();
}

/**
 * Create a billboard text sprite using a Canvas texture.
 * Sprites always face the camera automatically in Three.js.
 */
function createTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx2d = canvas.getContext('2d')!;

  ctx2d.fillStyle = 'rgba(20, 20, 20, 0.60)';
  ctx2d.beginPath();
  ctx2d.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 10);
  ctx2d.fill();

  ctx2d.font = 'bold 26px sans-serif';
  ctx2d.fillStyle = '#ffffff';
  ctx2d.textAlign = 'center';
  ctx2d.textBaseline = 'middle';
  ctx2d.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  // Scale so the sprite is ~2.5 world units wide and ~0.625 tall
  sprite.scale.set(2.5, 0.625, 1);
  return sprite;
}

/**
 * Place "Solution Area" and "Staging Area" billboard labels above each grid.
 * Replaces any previously added labels.
 */
export function renderDualGridLabels(
  ctx: SceneContext,
  gridSize: number,
  gapX: number,
): void {
  while (ctx.labelsGroup.children.length > 0) {
    ctx.labelsGroup.remove(ctx.labelsGroup.children[0]!);
  }

  const centerZ = (gridSize - 1) / 2;
  const labelY = gridSize + 1;

  const solutionLabel = createTextSprite('Solution Area');
  solutionLabel.position.set((gridSize - 1) / 2, labelY, centerZ);
  ctx.labelsGroup.add(solutionLabel);

  const stagingLabel = createTextSprite('Staging Area');
  stagingLabel.position.set(
    gridSize + gapX + (gridSize - 1) / 2,
    labelY,
    centerZ,
  );
  ctx.labelsGroup.add(stagingLabel);
}
