var container;
var camera, scene, renderer;
var clock;
var gui;

var terrain, terrainGeometry;
var N    = 100;
var SIZE = 200;
var targetList = [];

var circle, cylinder;
var brushRadius = 10;
var isBrushing  = false;
var brushMode   = true;

var loadedModels   = {};
var sceneObjects   = [];
var selectedObject = null;
var isDragging     = false;
var dragOffset     = new THREE.Vector3();
var dragPlane      = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

var mixer;
var morphs = [];
var glbClips = {};

var pendingModel = null;

var params;

var defaultScales = {
    house:    { x: 7,    y: 8,    z: 7    },
    tree:     { x: 0.5,  y: 0.5,  z: 0.5  },
    palm:     { x: 0.5,  y: 0.5,  z: 0.5  },
    pine:     { x: 10,   y: 10,   z: 10   },
    bush:     { x: 10,   y: 10,   z: 10   },
    fence:    { x: 3,    y: 3,    z: 3    },
    flamingo: { x: 0.1,  y: 0.1,  z: 0.1  },
    parrot:   { x: 0.1,  y: 0.1,  z: 0.1  },
    horse:    { x: 0.1,  y: 0.1,  z: 0.1  }
};

var placementOffsetY = {
    flamingo: 9,
    parrot:   9,
    horse:    0
};

init();
animate();

function init()
{
    container = document.getElementById('container');
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 40000);
    camera.position.set(SIZE / 2, SIZE / 2, SIZE + SIZE / 2);
    camera.lookAt(new THREE.Vector3(SIZE / 2, 0, SIZE / 2));

    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x888888, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    clock = new THREE.Clock();
    mixer = new THREE.AnimationMixer(scene);

    window.addEventListener('resize', onWindowResize, false);

    renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);
    renderer.domElement.addEventListener('mouseup',   onDocumentMouseUp,   false);
    renderer.domElement.addEventListener('mousemove', onDocumentMouseMove, false);
    renderer.domElement.addEventListener('wheel',     onDocumentMouseScroll, false);
    renderer.domElement.addEventListener('contextmenu', function(e) { e.preventDefault(); }, false);

    addLights();
    createSky();
    createTerrain();
    createBrush();
    createGUI();

    loadOBJModel('house',    'models/Дом/',            'Cyprys_House.obj', 'Cyprys_House.mtl', defaultScales.house.x);
    loadOBJModel('tree',     'models/Деревья/Дерево/', 'Tree.obj',         'Tree.mtl',         defaultScales.tree.x );
    loadOBJModel('palm',     'models/Деревья/Пальма/', 'Palma 001.obj',    'Palma 001.mtl',    defaultScales.palm.x );
    loadOBJModel('pine',     'models/Деревья/Хвоя/',   'needle01.obj',     'needle01.mtl',     defaultScales.pine.x );
    loadOBJModel('bush',     'models/Куст/',            'Bush1.obj',        'Bush1.mtl',        defaultScales.bush.x );
    loadOBJModel('fence',    'models/Ограда/',          'grade.obj',        'grade.mtl',        defaultScales.fence.x);
    loadGLBModel('flamingo', 'models/Животные/Flamingo.glb', defaultScales.flamingo.x);
    loadGLBModel('parrot',   'models/Животные/Parrot.glb',   defaultScales.parrot.x  );
    loadGLBModel('horse',    'models/Животные/Horse.glb',    defaultScales.horse.x   );
}

function addLights()
{
    var ambient = new THREE.AmbientLight(0x333333);
    scene.add(ambient);

    var light = new THREE.SpotLight(0xffffff, 1, 0, Math.PI / 2);
    light.position.set(SIZE, 500, SIZE);
    light.target.position.set(SIZE / 2, 0, SIZE / 2);
    light.castShadow = true;
    light.shadow.camera.near = 100;
    light.shadow.camera.far  = 1000;
    light.shadow.camera.fov  = 90;
    light.shadow.bias = 0.0001;
    light.shadow.mapSize.width  = 2048;
    light.shadow.mapSize.height = 1024;
    scene.add(light);
}

function createSky()
{
    var geometry = new THREE.SphereGeometry(5000, 32, 32);
    var tex = THREE.ImageUtils.loadTexture('img/sky.jpg');
    tex.minFilter = THREE.NearestFilter;
    var material = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide });
    var sky = new THREE.Mesh(geometry, material);
    sky.position.set(SIZE / 2, 0, SIZE / 2);
    scene.add(sky);
}

function createTerrain()
{
    terrainGeometry = new THREE.Geometry();

    for (var j = 0; j < N; j++)
        for (var i = 0; i < N; i++)
            terrainGeometry.vertices.push(new THREE.Vector3(i * SIZE / (N-1), 0, j * SIZE / (N-1)));

    for (var i = 0; i < N - 1; i++) {
        for (var j = 0; j < N - 1; j++) {
            var a = i * N + j;
            var b = i * N + j + 1;
            var c = (i + 1) * N + j;
            var d = (i + 1) * N + j + 1;
            terrainGeometry.faces.push(new THREE.Face3(a, b, c));
            terrainGeometry.faces.push(new THREE.Face3(b, d, c));
            terrainGeometry.faceVertexUvs[0].push([
                new THREE.Vector2(j/(N-1),       i/(N-1)),
                new THREE.Vector2((j+1)/(N-1),   i/(N-1)),
                new THREE.Vector2(j/(N-1),       (i+1)/(N-1))
            ]);
            terrainGeometry.faceVertexUvs[0].push([
                new THREE.Vector2((j+1)/(N-1),   i/(N-1)),
                new THREE.Vector2((j+1)/(N-1),   (i+1)/(N-1)),
                new THREE.Vector2(j/(N-1),       (i+1)/(N-1))
            ]);
        }
    }

    terrainGeometry.computeFaceNormals();
    terrainGeometry.computeVertexNormals();

    var tex = THREE.ImageUtils.loadTexture('img/grasstile.jpg');
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);

    var material = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
    terrain = new THREE.Mesh(terrainGeometry, material);
    terrain.position.set(0, 0, 0);
    terrain.receiveShadow = true;

    targetList.push(terrain);
    scene.add(terrain);
}

function createBrush()
{
    var circleMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
    var circleGeometry = new THREE.CircleGeometry(1, 64);

    for (var i = 0; i < circleGeometry.vertices.length; i++) {
        circleGeometry.vertices[i].z = circleGeometry.vertices[i].y;
        circleGeometry.vertices[i].y = 0;
    }
    circleGeometry.vertices.shift();

    circle = new THREE.Line(circleGeometry, circleMaterial);
    circle.scale.set(brushRadius, brushRadius, brushRadius);
    scene.add(circle);

    var cylGeometry = new THREE.CylinderGeometry(1.5, 0, 5, 64);
    cylinder = new THREE.Mesh(cylGeometry, new THREE.MeshLambertMaterial({ color: 0x888888 }));
    scene.add(cylinder);
}

function applyBrush(worldPoint, direction)
{
    var vertices = terrainGeometry.vertices;
    var r2 = brushRadius * brushRadius;

    for (var i = 0; i < vertices.length; i++) {
        var dx = vertices[i].x - worldPoint.x;
        var dz = vertices[i].z - worldPoint.z;
        var dist2 = dx * dx + dz * dz;
        if (dist2 < r2) {
            var h = Math.sqrt(r2 - dist2);
            vertices[i].y += direction * h * 0.05;
        }
    }

    terrainGeometry.computeFaceNormals();
    terrainGeometry.computeVertexNormals();
    terrainGeometry.verticesNeedUpdate = true;
    terrainGeometry.normalsNeedUpdate  = true;
}

function loadOBJModel(name, path, objFile, mtlFile, scale)
{
    var onProgress = function(xhr) {
        if (xhr.lengthComputable)
            console.log(name + ': ' + Math.round(xhr.loaded / xhr.total * 100) + '%');
    };

    var mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath(path);
    if (mtlLoader.setResourcePath) mtlLoader.setResourcePath(path);
    else if (mtlLoader.setBaseUrl) mtlLoader.setBaseUrl(path);
    mtlLoader.load(mtlFile, function(materials) {
        materials.preload();
        var objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath(path);
        objLoader.load(objFile, function(object) {
            object.scale.set(scale, scale, scale);
            object.castShadow = true;
            object.traverse(function(child) {
                if (child instanceof THREE.Mesh) child.castShadow = true;
            });
            loadedModels[name] = object;
            console.log(name + ' готов');
        }, onProgress, function(e) { console.error(name, e); });
    }, undefined, function(e) { console.error('MTL error: ' + name, e); });
}

function loadGLBModel(name, path, scale)
{
    var loader = new THREE.GLTFLoader();
    loader.load(path, function(gltf) {
        var mesh = gltf.scene.children[0];
        var clip = gltf.animations[0];

        if (clip) {
            mixer.clipAction(clip, mesh).setDuration(1).startAt(0).play();
            glbClips[name] = clip;
        }

        mesh.scale.set(scale, scale, scale);
        mesh.castShadow    = true;
        mesh.receiveShadow = true;
        loadedModels[name] = mesh;
        console.log(name + ' готов');
    });
}

function preparePlacement(name)
{
    if (!loadedModels[name]) {
        console.warn('Ещё не загружено: ' + name + '. Подождите.');
        return;
    }
    pendingModel     = name;
    brushMode        = false;
    params.brush     = false;
    circle.visible   = false;
    cylinder.visible = false;
    selectedObject   = null;
    syncGUIFromSelected();
}

function placeModel(worldPoint)
{
    var s = defaultScales[pendingModel];
    var offsetY = placementOffsetY[pendingModel] !== undefined ? placementOffsetY[pendingModel] : 0;

    var copy = loadedModels[pendingModel].clone();
    copy.position.set(worldPoint.x, worldPoint.y + offsetY, worldPoint.z);
    copy.scale.set(s.x, s.y, s.z);

    if (glbClips[pendingModel]) {
        mixer.clipAction(glbClips[pendingModel], copy).setDuration(1).startAt(0).play();
        morphs.push(copy);
    }

    scene.add(copy);
    sceneObjects.push(copy);
    selectedObject = copy;
    syncGUIFromSelected();
    pendingModel   = null;
}

function deleteSelected()
{
    if (!selectedObject) return;
    var idx = sceneObjects.indexOf(selectedObject);
    if (~idx) sceneObjects.splice(idx, 1);
    scene.remove(selectedObject);
    selectedObject = null;
    syncGUIFromSelected();
}

function createGUI()
{
    gui = new dat.GUI();
    gui.width = 220;

    params = {
        sx: 1, sy: 1, sz: 1,
        rx: 0, ry: 0, rz: 0,
        brush: true,
        addHouse:     function() { preparePlacement('house');    },
        addTree:      function() { preparePlacement('tree');     },
        addPalm:      function() { preparePlacement('palm');     },
        addPine:      function() { preparePlacement('pine');     },
        addBush:      function() { preparePlacement('bush');     },
        addFence:     function() { preparePlacement('fence');    },
        addFlamingo:  function() { preparePlacement('flamingo'); },
        addParrot:    function() { preparePlacement('parrot');   },
        addHorse:     function() { preparePlacement('horse');    },
        deleteObject: function() { deleteSelected();             }
    };

    var fScale = gui.addFolder('Scale');
    var sx = fScale.add(params, 'sx').min(0.01).max(10).step(0.01).listen();
    var sy = fScale.add(params, 'sy').min(0.01).max(10).step(0.01).listen();
    var sz = fScale.add(params, 'sz').min(0.01).max(10).step(0.01).listen();
    fScale.open();
    sx.onChange(function(v) { if (selectedObject) selectedObject.scale.x = v; });
    sy.onChange(function(v) { if (selectedObject) selectedObject.scale.y = v; });
    sz.onChange(function(v) { if (selectedObject) selectedObject.scale.z = v; });

    var fRot = gui.addFolder('Rotate');
    var rx = fRot.add(params, 'rx').min(-180).max(180).step(1).listen();
    var ry = fRot.add(params, 'ry').min(-180).max(180).step(1).listen();
    var rz = fRot.add(params, 'rz').min(-180).max(180).step(1).listen();
    fRot.open();
    rx.onChange(function(v) { if (selectedObject) selectedObject.rotation.x = v * Math.PI / 180; });
    ry.onChange(function(v) { if (selectedObject) selectedObject.rotation.y = v * Math.PI / 180; });
    rz.onChange(function(v) { if (selectedObject) selectedObject.rotation.z = v * Math.PI / 180; });

    var brushCheck = gui.add(params, 'brush').name('brush mode').listen();
    brushCheck.onChange(function(v) {
        brushMode        = v;
        pendingModel     = null;
        circle.visible   = v;
        cylinder.visible = v;
        if (!v) { selectedObject = null; syncGUIFromSelected(); }
    });

    var fObj = gui.addFolder('Objects');
    fObj.add(params, 'addHouse').name('add house');
    fObj.add(params, 'addTree').name('add tree');
    fObj.add(params, 'addPalm').name('add palm');
    fObj.add(params, 'addPine').name('add pine');
    fObj.add(params, 'addBush').name('add bush');
    fObj.add(params, 'addFence').name('add fence');
    fObj.add(params, 'addFlamingo').name('add flamingo');
    fObj.add(params, 'addParrot').name('add parrot');
    fObj.add(params, 'addHorse').name('add horse');
    fObj.add(params, 'deleteObject').name('delete selected');
    fObj.open();

    gui.open();
}

function syncGUIFromSelected()
{
    if (selectedObject) {
        params.sx = selectedObject.scale.x;
        params.sy = selectedObject.scale.y;
        params.sz = selectedObject.scale.z;
        params.rx = selectedObject.rotation.x * 180 / Math.PI;
        params.ry = selectedObject.rotation.y * 180 / Math.PI;
        params.rz = selectedObject.rotation.z * 180 / Math.PI;
    } else {
        params.sx = 1; params.sy = 1; params.sz = 1;
        params.rx = 0; params.ry = 0; params.rz = 0;
    }
}

function getRay(event)
{
    var mouse = {
        x:  (event.clientX / window.innerWidth)  * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1
    };
    var vector = new THREE.Vector3(mouse.x, mouse.y, 1);
    vector.unproject(camera);
    return new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
}

function onDocumentMouseDown(event)
{
    if (event.target !== renderer.domElement) return;

    var ray = getRay(event);

    if (pendingModel !== null) {
        if (event.which === 1) {
            var hits = ray.intersectObjects(targetList);
            if (hits.length > 0) placeModel(hits[0].point);
        }
        return;
    }

    if (brushMode) {
        var hits = ray.intersectObjects(targetList);
        if (hits.length > 0) {
            if (event.which === 1) {
                isBrushing = true;
                applyBrush(hits[0].point, +1);
            } else if (event.which === 3) {
                isBrushing = true;
                applyBrush(hits[0].point, -1);
            }
        }
        return;
    }

    if (event.which === 1) {
        var hits = ray.intersectObjects(sceneObjects, true);
        if (hits.length > 0) {
            var obj = hits[0].object;
            while (obj.parent && sceneObjects.indexOf(obj) === -1)
                obj = obj.parent;
            selectedObject = obj;
            syncGUIFromSelected();
            dragPlane.constant = -selectedObject.position.y;
            var target = new THREE.Vector3();
            ray.ray.intersectPlane(dragPlane, target);
            dragOffset.subVectors(selectedObject.position, target);
            isDragging = true;
        } else {
            selectedObject = null;
            syncGUIFromSelected();
        }
    }
}

function onDocumentMouseUp(event)
{
    if (event.target !== renderer.domElement) return;
    isBrushing = false;
    isDragging = false;
}

function onDocumentMouseMove(event)
{
    if (event.target !== renderer.domElement) return;
    var ray  = getRay(event);
    var hits = ray.intersectObjects(targetList);

    if (brushMode && hits.length > 0) {
        circle.position.copy(hits[0].point);
        circle.position.y += 0.5;
        cylinder.position.copy(hits[0].point);
        cylinder.position.y += 2.5;

        if (isBrushing) {
            var dir = event.buttons === 1 ? +1 : (event.buttons === 2 ? -1 : 0);
            if (dir !== 0) applyBrush(hits[0].point, dir);
        }
    }

    if (!brushMode && isDragging && selectedObject) {
        var target = new THREE.Vector3();
        ray.ray.intersectPlane(dragPlane, target);
        if (target) {
            target.add(dragOffset);
            selectedObject.position.x = target.x;
            selectedObject.position.z = target.z;
        }
    }
}

function onDocumentMouseScroll(event)
{
    if (!brushMode) return;
    brushRadius -= event.deltaY * 0.05;
    brushRadius  = Math.max(2, Math.min(50, brushRadius));
    circle.scale.set(brushRadius, brushRadius, brushRadius);
}

function animate()
{
    requestAnimationFrame(animate);
    var delta = clock.getDelta();

    mixer.update(delta);

    for (var i = 0; i < morphs.length; i++) {
        var morph = morphs[i];
    }
    render();
}

function render()
{
    renderer.render(scene, camera);
}

function onWindowResize()
{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
