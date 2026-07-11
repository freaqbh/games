import * as THREE from 'three';
import { CONFIG } from './config.js';
import { TextureManager } from './textures.js';
import { SeededRandom, vec3 } from './utils.js';

export class Room {
  constructor(id, x, z, width, depth, floor, name, options = {}) {
    this.id = id;
    this.x = x;
    this.z = z;
    this.width = width;
    this.depth = depth;
    this.floor = floor;
    this.name = name;
    this.walls = [];
    this.doors = [];
    this.props = [];
    this.lights = [];
    this.meshes = [];
    this.center = vec3(x + width / 2, floor * CONFIG.world.wallHeight, z + depth / 2);
    this.textureType = options.textureType || 'default';
    this.isSafe = options.isSafe || false;
    this.isLocked = options.isLocked || false;
    this.lockKey = options.lockKey || null;
    this.ambientColor = options.ambientColor || 0x222230;
    this.ambientIntensity = options.ambientIntensity || 0.08;
    this.hasFlickeringLight = options.hasFlickeringLight || false;
    this.bloodLevel = options.bloodLevel || 0;
    this.decayLevel = options.decayLevel || 0.5;
  }

  getBounds() {
    return {
      minX: this.x,
      maxX: this.x + this.width,
      minZ: this.z,
      maxZ: this.z + this.depth,
      minY: this.floor * CONFIG.world.wallHeight,
      maxY: (this.floor + 1) * CONFIG.world.wallHeight,
    };
  }

  containsPoint(x, z) {
    return x >= this.x && x <= this.x + this.width &&
      z >= this.z && z <= this.z + this.depth;
  }

  getDoorPositions() {
    return this.doors.map(d => d.position.clone());
  }
}

export class World {
  constructor(scene, textureManager) {
    this.scene = scene;
    this.textures = textureManager;
    this.rooms = [];
    this.colliders = [];
    this.interactables = [];
    this.doorObjects = [];
    this.rng = new SeededRandom(12345);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.fogDensity = CONFIG.fog.densityFloor;
    this.powerOn = false;
    this.ritualChamberUnlocked = false;
    this._materialCache = {};
  }

  _getMaterial(key, opts) {
    if (!this._materialCache[key]) {
      this._materialCache[key] = new THREE.MeshStandardMaterial(opts);
    }
    return this._materialCache[key];
  }

  _scaleUVs(geo, repeatX, repeatY) {
    const uvs = geo.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
      uvs.setXY(i, uvs.getX(i) * repeatX, uvs.getY(i) * repeatY);
    }
  }

  _getWallMaterial(room) {
    let key, texName;
    switch (room.textureType) {
      case 'wallpaper': key = 'wall_wallpaper'; texName = 'wallpaper'; break;
      case 'concrete':  key = 'wall_concrete';  texName = 'concrete';  break;
      case 'tiles':     key = 'wall_tiles';     texName = 'floorTiles'; break;
      case 'plaster':
      default:          key = 'wall_plaster';   texName = 'wallPlaster'; break;
    }
    return this._getMaterial(key, { map: this.textures.get(texName), roughness: 0.85, metalness: 0.05 });
  }

  _getFloorMaterial(room) {
    let key, texName;
    switch (room.textureType) {
      case 'concrete': key = 'floor_concrete'; texName = 'concrete';  break;
      case 'tiles':    key = 'floor_tiles';    texName = 'floorTiles'; break;
      case 'dirt':     key = 'floor_dirt';     texName = 'dirt';       break;
      default:         key = 'floor_wood';     texName = 'floorWood';  break;
    }
    return this._getMaterial(key, { map: this.textures.get(texName), roughness: 0.9, metalness: 0.05 });
  }

  build() {
    this._buildGroundFloor();
    this._buildUpperFloor();
    this._buildBasement();
    this._buildStairwells();
    this._addGlobalLighting();
    this._addFog();
  }

  _addGlobalLighting() {
    // Each room with hasFlickeringLight already got a PointLight in _buildRoom.
    // Add a soft fill light for every room so walls/floors are visible.
    for (const room of this.rooms) {
      const y = room.floor * CONFIG.world.wallHeight;
      const fill = new THREE.PointLight(
        room.ambientColor || 0x1a1a22,
        (room.ambientIntensity || 0.08) * 150, // Much brighter for physically correct lighting
        Math.max(room.width, room.depth) * 1.5,
        2
      );
      fill.position.set(
        room.x + room.width / 2,
        y + CONFIG.world.wallHeight * 0.75,
        room.z + room.depth / 2
      );
      this.group.add(fill);
    }
  }

  _addFog() {
    // Fog is managed at the scene level (set in main.js).
    // This method is a no-op kept for API compatibility.
  }

  _buildGroundFloor() {
    const floor = 0;
    const baseY = floor * CONFIG.world.wallHeight;

    const entranceHall = new Room('entrance', -4, -4, 8, 8, floor, 'Entrance Hall', {
      textureType: 'wallpaper', isSafe: true, hasFlickeringLight: true
    });
    this.rooms.push(entranceHall);

    const reception = new Room('reception', 5, -3, 6, 5, floor, 'Reception Office', {
      textureType: 'wallpaper', hasFlickeringLight: true
    });
    this.rooms.push(reception);

    const corridor = new Room('corridor_g', -1, 5, 2, 12, floor, 'Main Corridor', {
      textureType: 'plaster', hasFlickeringLight: true
    });
    this.rooms.push(corridor);

    const diningHall = new Room('dining', 2, 5, 10, 8, floor, 'Dining Hall', {
      textureType: 'wallpaper', hasFlickeringLight: true, bloodLevel: 0.3
    });
    this.rooms.push(diningHall);

    const kitchen = new Room('kitchen', 13, 6, 6, 6, floor, 'Kitchen', {
      textureType: 'tiles', hasFlickeringLight: true, bloodLevel: 0.5
    });
    this.rooms.push(kitchen);

    const stairwell = new Room('stairwell_g', -6, 10, 4, 4, floor, 'Stairwell', {
      textureType: 'concrete', isSafe: true
    });
    this.rooms.push(stairwell);

    this._buildRoom(entranceHall);
    this._buildRoom(reception);
    this._buildRoom(corridor);
    this._buildRoom(diningHall);
    this._buildRoom(kitchen);
    this._buildRoom(stairwell);

    this._addDoorway(entranceHall, 'east', 4, 0, 1.1);
    this._addDoorway(entranceHall, 'north', 0, 4, 1.1);
    this._addDoorway(reception, 'west', 0, 2.5, 1.1);
    this._addDoorway(corridor, 'south', 0, 0, 1.1);
    this._addDoorway(corridor, 'east', 1, 0, 1.1);
    this._addDoorway(corridor, 'north', 0, 12, 1.1);
    this._addDoorway(diningHall, 'west', 0, 2, 1.1);
    this._addDoorway(diningHall, 'east', 10, 2, 1.1);
    this._addDoorway(kitchen, 'west', 0, 2, 1.1);
    this._addDoorway(stairwell, 'east', 2, 2, 1.1);

    this._addFurniture(entranceHall, [
      { type: 'table', x: 0, z: -2, rot: 0 },
      { type: 'chair', x: 1, z: -2, rot: Math.PI },
      { type: 'cabinet', x: -3, z: 0, rot: Math.PI / 2, hideable: true },
    ]);

    this._addFurniture(reception, [
      { type: 'desk', x: 2, z: 1, rot: 0 },
      { type: 'chair', x: 2, z: 2, rot: Math.PI },
      { type: 'shelf', x: 5, z: 0, rot: Math.PI / 2 },
      { type: 'painting', x: 3, z: -0.1, rot: 0, wall: 'north' },
    ]);

    this._addFurniture(diningHall, [
      { type: 'table', x: 3, z: 3, rot: 0, large: true },
      { type: 'chair', x: 1, z: 3, rot: Math.PI / 2 },
      { type: 'chair', x: 5, z: 3, rot: -Math.PI / 2 },
      { type: 'chair', x: 3, z: 1, rot: 0 },
      { type: 'chair', x: 3, z: 5, rot: Math.PI },
      { type: 'painting', x: 5, z: -0.1, rot: 0, wall: 'north' },
    ]);

    this._addFurniture(kitchen, [
      { type: 'table', x: 2, z: 2, rot: 0 },
      { type: 'cabinet', x: 5, z: 0, rot: Math.PI / 2, hideable: true },
      { type: 'shelf', x: 0, z: 5, rot: 0 },
    ]);
  }

  _buildUpperFloor() {
    const floor = 1;
    const baseY = floor * CONFIG.world.wallHeight;

    const corridor = new Room('corridor_u', -1, 5, 2, 12, floor, 'Upper Corridor', {
      textureType: 'wallpaper', hasFlickeringLight: true
    });
    this.rooms.push(corridor);

    const dormA = new Room('dorm_a', -8, 5, 6, 5, floor, 'Dormitory A', {
      textureType: 'wallpaper', hasFlickeringLight: true, bloodLevel: 0.2
    });
    this.rooms.push(dormA);

    const dormB = new Room('dorm_b', -8, 11, 6, 5, floor, 'Dormitory B', {
      textureType: 'wallpaper', hasFlickeringLight: true
    });
    this.rooms.push(dormB);

    const classroom = new Room('classroom', 2, 5, 8, 6, floor, 'Classroom', {
      textureType: 'plaster', hasFlickeringLight: true
    });
    this.rooms.push(classroom);

    const infirmary = new Room('infirmary', 2, 12, 6, 5, floor, 'Infirmary', {
      textureType: 'tiles', hasFlickeringLight: true, bloodLevel: 0.7
    });
    this.rooms.push(infirmary);

    const haleQuarters = new Room('hale_quarters', 11, 5, 8, 6, floor, "Dr. Hale's Quarters", {
      textureType: 'wallpaper', isLocked: true, lockKey: 'hale_key', hasFlickeringLight: true
    });
    this.rooms.push(haleQuarters);

    this._buildRoom(corridor);
    this._buildRoom(dormA);
    this._buildRoom(dormB);
    this._buildRoom(classroom);
    this._buildRoom(infirmary);
    this._buildRoom(haleQuarters);

    this._addDoorway(corridor, 'south', 0, 0, 1.1);
    this._addDoorway(corridor, 'west', 0, 2, 1.1);
    this._addDoorway(corridor, 'west', 0, 8, 1.1);
    this._addDoorway(corridor, 'east', 1, 2, 1.1);
    this._addDoorway(corridor, 'east', 1, 8, 1.1);
    this._addDoorway(corridor, 'east', 1, 10, 1.1);
    this._addDoorway(dormA, 'east', 5, 2, 1.1);
    this._addDoorway(dormB, 'east', 5, 2, 1.1);
    this._addDoorway(classroom, 'west', 0, 2, 1.1);
    this._addDoorway(infirmary, 'west', 0, 2, 1.1);
    this._addDoorway(haleQuarters, 'west', 0, 2, 1.1, true);

    this._addFurniture(dormA, [
      { type: 'bed', x: 1, z: 1, rot: 0 },
      { type: 'bed', x: 1, z: 3, rot: 0 },
      { type: 'bed', x: 4, z: 1, rot: 0 },
      { type: 'cabinet', x: 0, z: 0, rot: Math.PI / 2, hideable: true },
      { type: 'drawing', x: 3, z: -0.1, rot: 0, wall: 'north', variant: 0 },
    ]);

    this._addFurniture(dormB, [
      { type: 'bed', x: 1, z: 1, rot: 0 },
      { type: 'bed', x: 1, z: 3, rot: 0 },
      { type: 'bed', x: 4, z: 1, rot: 0 },
      { type: 'cabinet', x: 5, z: 0, rot: Math.PI / 2, hideable: true },
      { type: 'drawing', x: 3, z: -0.1, rot: 0, wall: 'north', variant: 1 },
    ]);

    this._addFurniture(classroom, [
      { type: 'desk', x: 2, z: 1, rot: 0 },
      { type: 'desk', x: 2, z: 3, rot: 0 },
      { type: 'desk', x: 5, z: 1, rot: 0 },
      { type: 'desk', x: 5, z: 3, rot: 0 },
      { type: 'chair', x: 2, z: 2, rot: Math.PI },
      { type: 'chair', x: 5, z: 2, rot: Math.PI },
      { type: 'shelf', x: 7, z: 0, rot: Math.PI / 2 },
      { type: 'drawing', x: 4, z: -0.1, rot: 0, wall: 'north', variant: 2 },
    ]);

    this._addFurniture(infirmary, [
      { type: 'bed', x: 1, z: 1, rot: 0 },
      { type: 'bed', x: 1, z: 3, rot: 0 },
      { type: 'table', x: 4, z: 2, rot: 0 },
      { type: 'cabinet', x: 5, z: 0, rot: Math.PI / 2, hideable: true },
    ]);

    this._addFurniture(haleQuarters, [
      { type: 'desk', x: 3, z: 1, rot: 0 },
      { type: 'chair', x: 3, z: 2, rot: Math.PI },
      { type: 'bed', x: 6, z: 1, rot: 0 },
      { type: 'shelf', x: 7, z: 0, rot: Math.PI / 2 },
      { type: 'safe', x: 0, z: 3, rot: Math.PI / 2 },
      { type: 'painting', x: 4, z: -0.1, rot: 0, wall: 'north' },
    ]);
  }

  _buildBasement() {
    const floor = -1;
    const baseY = floor * CONFIG.world.wallHeight;

    const corridor = new Room('corridor_b', -1, 5, 2, 10, floor, 'Basement Corridor', {
      textureType: 'concrete', hasFlickeringLight: true, decayLevel: 0.8
    });
    this.rooms.push(corridor);

    const expRoomA = new Room('exp_a', -8, 5, 6, 6, floor, 'Experiment Room A', {
      textureType: 'concrete', hasFlickeringLight: true, bloodLevel: 0.6, decayLevel: 0.9
    });
    this.rooms.push(expRoomA);

    const expRoomB = new Room('exp_b', -8, 12, 6, 6, floor, 'Experiment Room B', {
      textureType: 'concrete', hasFlickeringLight: true, bloodLevel: 0.4, decayLevel: 0.9
    });
    this.rooms.push(expRoomB);

    const storage = new Room('storage', 2, 5, 5, 5, floor, 'Storage Room', {
      textureType: 'concrete', decayLevel: 0.7
    });
    this.rooms.push(storage);

    const boiler = new Room('boiler', 2, 11, 5, 5, floor, 'Boiler Room', {
      textureType: 'concrete', hasFlickeringLight: true, decayLevel: 0.8
    });
    this.rooms.push(boiler);

    const ritual = new Room('ritual', 8, 5, 8, 8, floor, 'Ritual Chamber', {
      textureType: 'concrete', isLocked: true, lockKey: 'ritual_key', bloodLevel: 0.8, decayLevel: 1.0
    });
    this.rooms.push(ritual);

    this._buildRoom(corridor);
    this._buildRoom(expRoomA);
    this._buildRoom(expRoomB);
    this._buildRoom(storage);
    this._buildRoom(boiler);
    this._buildRoom(ritual);

    this._addDoorway(corridor, 'south', 0, 0, 1.1);
    this._addDoorway(corridor, 'west', 0, 2, 1.1);
    this._addDoorway(corridor, 'west', 0, 8, 1.1);
    this._addDoorway(corridor, 'east', 1, 2, 1.1);
    this._addDoorway(corridor, 'east', 1, 8, 1.1);
    this._addDoorway(corridor, 'east', 1, 10, 1.1);
    this._addDoorway(expRoomA, 'east', 5, 2, 1.1);
    this._addDoorway(expRoomB, 'east', 5, 2, 1.1);
    this._addDoorway(storage, 'west', 0, 2, 1.1);
    this._addDoorway(boiler, 'west', 0, 2, 1.1);
    this._addDoorway(ritual, 'west', 0, 3, 1.1, true);

    this._addFurniture(expRoomA, [
      { type: 'table', x: 2, z: 2, rot: 0, large: true },
      { type: 'shelf', x: 5, z: 0, rot: Math.PI / 2 },
      { type: 'cabinet', x: 0, z: 0, rot: Math.PI / 2, hideable: true },
    ]);

    this._addFurniture(expRoomB, [
      { type: 'table', x: 2, z: 2, rot: 0 },
      { type: 'table', x: 2, z: 4, rot: 0 },
      { type: 'shelf', x: 5, z: 0, rot: Math.PI / 2 },
    ]);

    this._addFurniture(storage, [
      { type: 'shelf', x: 1, z: 0, rot: 0 },
      { type: 'shelf', x: 3, z: 0, rot: 0 },
      { type: 'cabinet', x: 4, z: 0, rot: Math.PI / 2, hideable: true },
    ]);

    this._addFurniture(boiler, [
      { type: 'table', x: 2, z: 2, rot: 0 },
      { type: 'breaker', x: 4, z: 0, rot: Math.PI / 2 },
    ]);

    this._addFurniture(ritual, [
      { type: 'ritual_circle', x: 4, z: 4, rot: 0 },
      { type: 'candle', x: 2, z: 2, rot: 0 },
      { type: 'candle', x: 6, z: 2, rot: 0 },
      { type: 'candle', x: 2, z: 6, rot: 0 },
      { type: 'candle', x: 6, z: 6, rot: 0 },
    ]);
  }

  _buildStairwells() {
    const stairGeo = new THREE.BoxGeometry(3, 0.15, 3);
    const stairMat = this._getMaterial('prop_stair', { color: 0x3a3a3a, roughness: 0.9 });

    for (let i = 0; i < 8; i++) {
      const step = new THREE.Mesh(stairGeo, stairMat);
      step.position.set(-4, i * 0.4375 + 0.2, 12);
      step.castShadow = true;
      step.receiveShadow = true;
      this.group.add(step);
      this.colliders.push(step);
    }

    for (let i = 0; i < 8; i++) {
      const step = new THREE.Mesh(stairGeo, stairMat);
      step.position.set(-4, -i * 0.4375 - 0.2, 12);
      step.castShadow = true;
      step.receiveShadow = true;
      this.group.add(step);
      this.colliders.push(step);
    }
  }

  _buildRoom(room) {
    const y = room.floor * CONFIG.world.wallHeight;
    const h = CONFIG.world.wallHeight;
    const t = CONFIG.world.wallThickness;

    const floorMat = this._getFloorMaterial(room);
    const wallMat  = this._getWallMaterial(room);
    const ceilMat  = this._getMaterial('ceiling', { map: this.textures.get('ceiling'), roughness: 0.95, metalness: 0.02 });

    const floorGeo = new THREE.PlaneGeometry(room.width, room.depth);
    this._scaleUVs(floorGeo, room.width / 2, room.depth / 2);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(room.x + room.width / 2, y, room.z + room.depth / 2);
    floorMesh.receiveShadow = true;
    this.group.add(floorMesh);
    room.meshes.push(floorMesh);

    const ceilGeo = new THREE.PlaneGeometry(room.width, room.depth);
    this._scaleUVs(ceilGeo, room.width / 4, room.depth / 4);
    const ceilMesh = new THREE.Mesh(ceilGeo, ceilMat);
    ceilMesh.rotation.x = Math.PI / 2;
    ceilMesh.position.set(room.x + room.width / 2, y + h, room.z + room.depth / 2);
    ceilMesh.receiveShadow = true;
    this.group.add(ceilMesh);
    room.meshes.push(ceilMesh);

    this._buildWalls(room, y, h, t, wallMat);

    if (room.hasFlickeringLight) {
      const light = new THREE.PointLight(room.ambientColor, (room.ambientIntensity * 3) * 50, 15, 2);
      light.position.set(room.x + room.width / 2, y + h - 0.3, room.z + room.depth / 2);
      // No castShadow — each shadow-casting PointLight uses 6 texture units (cubemap).
      // With 15+ rooms this blows past MAX_TEXTURE_IMAGE_UNITS(16).
      this.group.add(light);
      room.lights.push(light);
    }
  }

  _buildWalls(room, y, h, t, wallMat) {
    // dx,dz = axis the wall extends along. Segments are offset along this axis.
    // ox,oz = wall origin (start corner).
    const walls = [
      { dir: 'north', ox: room.x, oz: room.z + room.depth, w: room.width, dx: 1, dz: 0, rot: 0 },
      { dir: 'south', ox: room.x, oz: room.z,              w: room.width, dx: 1, dz: 0, rot: Math.PI },
      { dir: 'east',  ox: room.x + room.width, oz: room.z, w: room.depth, dx: 0, dz: 1, rot: -Math.PI / 2 },
      { dir: 'west',  ox: room.x,              oz: room.z, w: room.depth, dx: 0, dz: 1, rot: Math.PI / 2 },
    ];

    for (const wall of walls) {
      const doorways = room.doors.filter(d => d.wall === wall.dir);
      if (doorways.length === 0) {
        const geo = new THREE.BoxGeometry(wall.w, h, t);
        this._scaleUVs(geo, wall.w / 3, 1);
        const mesh = new THREE.Mesh(geo, wallMat);
        const c = wall.w / 2;
        mesh.position.set(wall.ox + c * wall.dx, y + h / 2, wall.oz + c * wall.dz);
        mesh.rotation.y = wall.rot;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.group.add(mesh);
        room.meshes.push(mesh);
        this.colliders.push(mesh);
      } else {
        this._buildWallWithDoorways(room, wall, y, h, t, wallMat, doorways);
      }
    }
  }

  _buildWallWithDoorways(room, wall, y, h, t, wallMat, doorways) {
    const doorMat = this._getMaterial('door', { map: this.textures.get('door'), roughness: 0.7, metalness: 0.1 });
    doorways.sort((a, b) => a.position - b.position);
    let lastEnd = 0;

    for (const door of doorways) {
      const doorStart = door.position - door.width / 2;
      const doorEnd = door.position + door.width / 2;

      if (doorStart > lastEnd) {
        const segW = doorStart - lastEnd;
        const geo = new THREE.BoxGeometry(segW, h, t);
        this._scaleUVs(geo, segW / 3, 1);
        const mesh = new THREE.Mesh(geo, wallMat);
        const c = lastEnd + segW / 2;
        mesh.position.set(wall.ox + c * wall.dx, y + h / 2, wall.oz + c * wall.dz);
        mesh.rotation.y = wall.rot;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.group.add(mesh);
        room.meshes.push(mesh);
        this.colliders.push(mesh);
      }

      const aboveH = h - CONFIG.world.doorHeight;
      if (aboveH > 0) {
        const geo = new THREE.BoxGeometry(door.width, aboveH, t);
        this._scaleUVs(geo, door.width / 3, aboveH / 3);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.set(
          wall.ox + door.position * wall.dx,
          y + CONFIG.world.doorHeight + aboveH / 2,
          wall.oz + door.position * wall.dz
        );
        mesh.rotation.y = wall.rot;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.group.add(mesh);
        room.meshes.push(mesh);
      }

      if (door.locked) {
        const doorGeo = new THREE.BoxGeometry(door.width, CONFIG.world.doorHeight, 0.08);
        const doorMesh = new THREE.Mesh(doorGeo, doorMat);
        doorMesh.position.set(
          wall.ox + door.position * wall.dx,
          y + CONFIG.world.doorHeight / 2,
          wall.oz + door.position * wall.dz
        );
        doorMesh.rotation.y = wall.rot;
        doorMesh.castShadow = true;
        doorMesh.receiveShadow = true;
        doorMesh.userData = { type: 'door', locked: true, key: door.key, room: room.id };
        this.group.add(doorMesh);
        room.meshes.push(doorMesh);
        this.colliders.push(doorMesh);
        this.interactables.push(doorMesh);
        this.doorObjects.push(doorMesh);
      }

      lastEnd = doorEnd;
    }

    if (lastEnd < wall.w) {
      const segW = wall.w - lastEnd;
      const geo = new THREE.BoxGeometry(segW, h, t);
      this._scaleUVs(geo, segW / 3, 1);
      const mesh = new THREE.Mesh(geo, wallMat);
      const c = lastEnd + segW / 2;
      mesh.position.set(wall.ox + c * wall.dx, y + h / 2, wall.oz + c * wall.dz);
      mesh.rotation.y = wall.rot;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      room.meshes.push(mesh);
      this.colliders.push(mesh);
    }
  }

  _addDoorway(room, wall, position, _unused, width = 1.1, locked = false, key = null) {
    // position = where along the wall the door center is
    // width = door width (default 1.1m)
    room.doors.push({ wall, position: Math.max(position, width / 2), width, locked, key });
  }

  _addFurniture(room, items) {
    for (const item of items) {
      const prop = this._createProp(item, room);
      if (prop) {
        room.props.push(prop);
        this.group.add(prop);
        if (item.type !== 'painting' && item.type !== 'drawing') {
          this.colliders.push(prop);
        }
        if (item.hideable || item.type === 'safe' || item.type === 'breaker' || item.type === 'ritual_circle') {
          this.interactables.push(prop);
        }
      }
    }
  }

  _createProp(item, room) {
    const y = room.floor * CONFIG.world.wallHeight;
    let geo, mat, mesh;

    switch (item.type) {
      case 'table':
        geo = new THREE.BoxGeometry(item.large ? 3 : 1.5, 0.08, item.large ? 1.5 : 0.8);
        mat = this._getMaterial('prop_table', { color: 0x3a2a1a, roughness: 0.8 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(room.x + item.x, y + 0.75, room.z + item.z);
        mesh.rotation.y = item.rot;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { type: 'table' };

        const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8);
        const legMat = this._getMaterial('prop_tableLeg', { color: 0x2a1a0a, roughness: 0.9 });
        const offsets = item.large ? [[-1.4, -0.7], [1.4, -0.7], [-1.4, 0.7], [1.4, 0.7]] : [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]];
        for (const [ox, oz] of offsets) {
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(ox, -0.375, oz);
          leg.castShadow = true;
          mesh.add(leg);
        }
        break;

      case 'desk':
        geo = new THREE.BoxGeometry(1.2, 0.06, 0.6);
        mat = this._getMaterial('prop_desk', { color: 0x4a3520, roughness: 0.75 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(room.x + item.x, y + 0.72, room.z + item.z);
        mesh.rotation.y = item.rot;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { type: 'desk' };
        break;

      case 'chair':
        geo = new THREE.BoxGeometry(0.45, 0.04, 0.45);
        mat = this._getMaterial('prop_chair', { color: 0x3a2a1a, roughness: 0.85 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(room.x + item.x, y + 0.45, room.z + item.z);
        mesh.rotation.y = item.rot;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { type: 'chair' };
        break;

      case 'bed':
        geo = new THREE.BoxGeometry(0.9, 0.35, 1.9);
        mat = this._getMaterial('prop_bed', { color: 0x5a4a3a, roughness: 0.9 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(room.x + item.x, y + 0.175, room.z + item.z);
        mesh.rotation.y = item.rot;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { type: 'bed', hideable: true };
        break;

      case 'cabinet':
        geo = new THREE.BoxGeometry(0.8, 1.8, 0.5);
        mat = this._getMaterial('prop_cabinet', { color: 0x3a2a1a, roughness: 0.8 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(room.x + item.x, y + 0.9, room.z + item.z);
        mesh.rotation.y = item.rot;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { type: 'cabinet', hideable: true };
        break;

      case 'shelf':
        geo = new THREE.BoxGeometry(1.2, 2.0, 0.35);
        mat = this._getMaterial('prop_shelf', { color: 0x4a3520, roughness: 0.85 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(room.x + item.x, y + 1.0, room.z + item.z);
        mesh.rotation.y = item.rot;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { type: 'shelf' };
        break;

      case 'painting':
        geo = new THREE.PlaneGeometry(0.8, 0.6);
        mat = this._getMaterial('prop_painting', { color: 0x2a2a2a, roughness: 0.6 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(room.x + item.x, y + 1.8, room.z + item.z);
        mesh.rotation.y = item.rot;
        mesh.userData = { type: 'painting' };
        break;

      case 'drawing':
        const drawTex = this.textures.get(`drawing${(item.variant || 0) + 1}`);
        geo = new THREE.PlaneGeometry(0.5, 0.5);
        mat = this._getMaterial('prop_drawing' + (item.variant || 0), { map: drawTex, roughness: 0.9 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(room.x + item.x, y + 1.2, room.z + item.z);
        mesh.rotation.y = item.rot;
        mesh.userData = { type: 'drawing', variant: item.variant };
        break;

      case 'safe':
        geo = new THREE.BoxGeometry(0.5, 0.5, 0.4);
        mat = this._getMaterial('prop_safe', { color: 0x2a2a2a, roughness: 0.6, metalness: 0.4 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(room.x + item.x, y + 0.25, room.z + item.z);
        mesh.rotation.y = item.rot;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { type: 'safe', locked: true };
        break;

      case 'breaker':
        geo = new THREE.BoxGeometry(0.6, 0.8, 0.2);
        mat = this._getMaterial('prop_breaker', { color: 0x3a3a3a, roughness: 0.7, metalness: 0.3 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(room.x + item.x, y + 1.2, room.z + item.z);
        mesh.rotation.y = item.rot;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { type: 'breaker', activated: false };
        break;

      case 'ritual_circle':
        geo = new THREE.RingGeometry(1.5, 1.8, 32);
        mat = this._getMaterial('prop_ritual', { color: 0x8b0000, roughness: 0.9, side: THREE.DoubleSide });
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(room.x + item.x, y + 0.01, room.z + item.z);
        mesh.userData = { type: 'ritual_circle' };
        break;

      case 'candle':
        geo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8);
        mat = this._getMaterial('prop_candle', { color: 0xf5f5dc, roughness: 0.8 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(room.x + item.x, y + 0.075, room.z + item.z);
        mesh.userData = { type: 'candle' };
        const flame = new THREE.PointLight(0xffaa44, 0.5, 3, 2);
        flame.position.set(0, 0.15, 0);
        mesh.add(flame);
        break;

      default:
        return null;
    }

    return mesh;
  }

  // _getFloorTexture / _getWallTexture removed — replaced by _getFloorMaterial / _getWallMaterial

  _addGlobalLighting() {
    const ambient = new THREE.AmbientLight(CONFIG.world.ambientColor, CONFIG.world.ambientIntensity);
    this.scene.add(ambient);
  }

  _addFog() {
    this.scene.fog = new THREE.FogExp2(CONFIG.fog.color, this.fogDensity);
  }

  update(dt, playerPos) {
    for (const room of this.rooms) {
      if (room.hasFlickeringLight) {
        for (const light of room.lights) {
          if (Math.random() < 0.02) {
            light.intensity = 0;
            setTimeout(() => { light.intensity = room.ambientIntensity * 3; }, 50 + Math.random() * 100);
          }
        }
      }
    }
  }

  getRoomAt(x, z, floor = 0) {
    for (const room of this.rooms) {
      if (room.floor === floor && room.containsPoint(x, z)) {
        return room;
      }
    }
    return null;
  }

  unlockDoor(key) {
    for (const door of this.doorObjects) {
      if (door.userData.locked && door.userData.key === key) {
        door.userData.locked = false;
        door.visible = false;
        const idx = this.colliders.indexOf(door);
        if (idx >= 0) this.colliders.splice(idx, 1);
        return true;
      }
    }
    return false;
  }

  removeInteractable(obj) {
    const idx = this.interactables.indexOf(obj);
    if (idx >= 0) this.interactables.splice(idx, 1);
    const cidx = this.colliders.indexOf(obj);
    if (cidx >= 0) this.colliders.splice(cidx, 1);
    this.group.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    // Don't dispose material — it's shared via _materialCache
  }

  createNote(room, noteId, offsetX, offsetZ) {
    const y = room.floor * CONFIG.world.wallHeight;
    const geo = new THREE.PlaneGeometry(0.3, 0.4);
    const tex = this.textures.get('wallPlaster');
    const mat = this._getMaterial('prop_note', {
      color: 0xc9b88f, roughness: 0.95, side: THREE.DoubleSide,
      emissive: 0x332200, emissiveIntensity: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    // Clamp position to stay inside room bounds (0.5m margin from walls)
    const margin = 0.5;
    const px = Math.max(room.x + margin, Math.min(room.x + room.width - margin, room.x + room.width / 2 + offsetX));
    const pz = Math.max(room.z + margin, Math.min(room.z + room.depth - margin, room.z + room.depth / 2 + offsetZ));
    mesh.position.set(px, y + 0.8, pz);
    mesh.rotation.y = Math.PI / 4;
    mesh.castShadow = true;
    mesh.userData = { type: 'note', noteId: noteId, collected: false };
    this.group.add(mesh);
    this.interactables.push(mesh);
    return mesh;
  }

  createKeyItem(room, keyId, keyName, offsetX, offsetZ) {
    const y = room.floor * CONFIG.world.wallHeight;
    const group = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(0.05, 0.015, 8, 16);
    const ringMat = this._getMaterial('prop_keyRing', { color: 0xb8956a, roughness: 0.4, metalness: 0.6 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.castShadow = true;
    group.add(ring);
    const shaftGeo = new THREE.BoxGeometry(0.02, 0.15, 0.02);
    const shaft = new THREE.Mesh(shaftGeo, ringMat);
    shaft.position.y = -0.08;
    group.add(shaft);
    const toothGeo = new THREE.BoxGeometry(0.04, 0.02, 0.02);
    const tooth = new THREE.Mesh(toothGeo, ringMat);
    tooth.position.set(0.015, -0.14, 0);
    group.add(tooth);
    const margin = 0.5;
    const px = Math.max(room.x + margin, Math.min(room.x + room.width - margin, room.x + room.width / 2 + offsetX));
    const pz = Math.max(room.z + margin, Math.min(room.z + room.depth - margin, room.z + room.depth / 2 + offsetZ));
    group.position.set(px, y + 0.85, pz);
    group.userData = { type: 'key', keyId: keyId, keyName: keyName, collected: false };
    this.group.add(group);
    this.interactables.push(group);
    return group;
  }

  createRitualItem(room, itemId, itemName, offsetX, offsetZ, color = 0x8b0000) {
    const y = room.floor * CONFIG.world.wallHeight;
    const group = new THREE.Group();
    const baseGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.04, 8);
    const baseMat = this._getMaterial('prop_ritualBase', { color: 0x4a4a4a, roughness: 0.6, metalness: 0.3 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.castShadow = true;
    group.add(base);

    const itemGeo = new THREE.OctahedronGeometry(0.06, 0);
    const itemMat = this._getMaterial('prop_ritualGem_' + color.toString(16), {
      color: color, roughness: 0.3, metalness: 0.5,
      emissive: color, emissiveIntensity: 0.3,
    });
    const item = new THREE.Mesh(itemGeo, itemMat);
    item.position.y = 0.1;
    item.castShadow = true;
    group.add(item);

    const glow = new THREE.PointLight(color, 0.5, 2, 2);
    glow.position.y = 0.1;
    group.add(glow);

    const margin = 0.5;
    const px = Math.max(room.x + margin, Math.min(room.x + room.width - margin, room.x + room.width / 2 + offsetX));
    const pz = Math.max(room.z + margin, Math.min(room.z + room.depth - margin, room.z + room.depth / 2 + offsetZ));
    group.position.set(px, y + 0.9, pz);
    group.userData = { type: 'ritual_item', itemId: itemId, itemName: itemName, collected: false, baseItem: item, glow: glow };
    this.group.add(group);
    this.interactables.push(group);
    return group;
  }

  placeAllCollectibles() {
    const reception = this.rooms.find(r => r.id === 'reception');
    const dining = this.rooms.find(r => r.id === 'dining');
    const kitchen = this.rooms.find(r => r.id === 'kitchen');
    const dormB = this.rooms.find(r => r.id === 'dorm_b');
    const classroom = this.rooms.find(r => r.id === 'classroom');
    const infirmary = this.rooms.find(r => r.id === 'infirmary');
    const haleQuarters = this.rooms.find(r => r.id === 'hale_quarters');
    const expA = this.rooms.find(r => r.id === 'exp_a');
    const boiler = this.rooms.find(r => r.id === 'boiler');
    const entrance = this.rooms.find(r => r.id === 'entrance');
    const ritual = this.rooms.find(r => r.id === 'ritual');

    if (reception) {
      this.createNote(reception, 'emily_log_1', -1, 0);
      this.createNote(reception, 'hale_journal_1', 1, -1);
      this.createNote(reception, 'newspaper_clipping', 2, 1);
      this.createKeyItem(reception, 'hale_key', "Hale's Office Key", 1.5, 0);
    }
    if (dining) {
      this.createNote(dining, 'hale_journal_2', -1, 2);
      this.createRitualItem(dining, 'ritual_item_2', 'Silver Chalice', 3, 5, 0xc0c0c0);
    }
    if (kitchen) {
      this.createNote(kitchen, 'child_drawing_1', 2, 2);
      this.createKeyItem(kitchen, 'basement_key', 'Basement Key', 4, 4);
    }
    if (dormB) {
      this.createNote(dormB, 'emily_log_2', -1, 1);
      this.createRitualItem(dormB, 'ritual_item_3', 'Black Candle', 4, 3, 0x1a1a1a);
      this.createNote(dormB, 'child_drawing_2', 2, 2);
    }
    if (classroom) {
      this.createNote(classroom, 'hale_journal_3', 3, 1);
      this.createRitualItem(classroom, 'ritual_item_4', 'Ancient Book', 6, 2, 0x8b4513);
      this.createNote(classroom, 'ritual_instructions', 1, 4);
    }
    if (infirmary) {
      this.createNote(infirmary, 'medical_record_1', 1, 1);
      this.createNote(infirmary, 'medical_record_2', 4, 3);
      this.createNote(infirmary, 'medical_record_3', 1, 4);
      this.createRitualItem(infirmary, 'ritual_item_5', 'Iron Key', 4, 1, 0x6a4a2a);
    }
    if (expA) {
      this.createNote(expA, 'emily_log_3', 1, 2);
      this.createNote(expA, 'emily_log_4', 3, 4);
    }
    if (boiler) {
      this.createKeyItem(boiler, 'ritual_key', 'Ritual Chamber Key', 2, 2);
      this.createNote(boiler, 'emily_log_5', 1, 3);
    }
    if (haleQuarters) {
      this.createNote(haleQuarters, 'letter_to_daniel', 6, 1);
      this.createNote(haleQuarters, 'emily_log_6', 3, 4);
    }
    if (entrance) {
      this.createNote(entrance, 'child_drawing_3', 0, -2);
    }
  }

  dispose() {
    this.group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.scene.remove(this.group);
  }
}
