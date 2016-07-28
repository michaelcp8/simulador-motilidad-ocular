/*====================================
            VARIABLES 
======================================*/

var video = document.getElementById('webcam');
var canvas = document.getElementById('canvas');
var container = document.getElementById('model');
var context = canvas.getContext("2d");

var posit, detector, imageData;
            
var modelSize = 35.0; //milímetros del marker impreso

// Modelado 3D
var renderer, scene, camera, face, rightEye, leftEye, faceBrow;
var leftXPhase = 0, rightXPhase = 0, leftYPhase = 0, rightYPhase = 0;
var rightLight, leftLight, rightOclusor, leftOclusor;

// Examen
var examEye, examType, examGrades;

// Distancia del ojo con respecto a la cámara (milímetros)
var distY = 22;
var distX = 33.6;

/*====================================
            FUNCIONES 
======================================*/

$(document).ready(function () {
    
	$("#infoButton").button().click(function () { 
	    liteModal.open('#infoBox');
	});

    compatibility.getUserMedia(
        // Restricciones (contraints)
        {
        video: true,
        audio: false
        },
        
        // Funcion de finalizacion (Succes-Callback)
        function(localMediaStream) {
            $('#menu').show();
            $('#brow').show();
            
            video.src = window.URL.createObjectURL(localMediaStream);
            video.play();
            
            detector = new AR.Detector();
            posit = new POS.Posit(modelSize, canvas.width);

            createModels();
            
            compatibility.requestAnimationFrame(tick);
        },
        
        // errorCallback
        function(err) {
            alert(err.name);
        }
    );
});
        
function tick() {
    compatibility.requestAnimationFrame(tick);
                
    if (video.readyState === video.HAVE_ENOUGH_DATA) {

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        var markers = detector.detect(imageData);
        drawCorners(markers);
        updatePosition(markers);
        render();
    }
}
            
// Función que dibuja un cuadrado alrededor del tag
function drawCorners(markers){
    var corners, corner, i, j;
    
    context.lineWidth = 3;
    
    for (i = 0; i < markers.length; ++ i){
        corners = markers[i].corners;
        
        context.strokeStyle = "red";
        context.beginPath();
        
        for (j = 0; j < corners.length; ++ j){
            corner = corners[j];
            context.moveTo(corner.x, corner.y);
            corner = corners[(j + 1) % corners.length];
            context.lineTo(corner.x, corner.y);
        }
        
        context.stroke();
        context.closePath();
    }
}
            
// Función que se llama cada vez que el tag cambia de posición
function updatePosition(markers){
    var corners, corner, pose, i;
    
    if (markers.length > 0){
        corners = markers[0].corners;
        
        for (i = 0; i < corners.length; ++ i){
            corner = corners[i];
            
            corner.x = corner.x - (canvas.width / 2);
            corner.y = (canvas.height / 2) - corner.y;
        }
        
        pose = posit.pose(corners);
        
        leftLight.visible = true;
        rightLight.visible = true;
        
        updateObject(rightEye, rightLight, pose.bestTranslation, distY, distX, rightXPhase, rightYPhase);
        updateObject(leftEye, leftLight, pose.bestTranslation, distY, -distX, leftXPhase, leftYPhase);
        updatePoseHTML("pose", pose.bestTranslation);
    }
    else {
        leftLight.visible = false;
        rightLight.visible = false;
    }
}

// Función que actualiza la rotación del ojo
function updateObject(object, light, translation, Y, X, phaseX, phaseY) {
    object.rotation.x = Math.atan2((Y - translation[1]), translation[2]) + phaseY;
    object.rotation.y = Math.atan2((X - translation[0]), translation[2]) + phaseX;
    
    light.rotation.x = Math.atan2((Y - translation[1]), translation[2]);
    light.rotation.y = Math.atan2((X - translation[0]), translation[2]);
}

//Función que muestra por pantalla las coordenadas del tag
function updatePoseHTML(id, translation){
    var d = document.getElementById(id);
    d.innerHTML = " x: " + (translation[0] | 0)
        + " y: " + (translation[1] | 0)
        + " z: " + (translation[2] | 0);
        //+ "<br> OJO DERECHO: Eje x: " + (180/Math.PI) * Math.atan2((distY - translation[1]), translation[2])
        //+ " Eje y: " + (180/Math.PI) * (Math.atan2((distX - translation[0]), translation[2]) + rightPhase)
        //+ "<br> OJO IZQUIERDO: Eje x: " + (180/Math.PI) * Math.atan2((distY - translation[1]), translation[2]) 
        //+ " Eje y: " + (180/Math.PI) * (Math.atan2((-distX - translation[0]), translation[2]) + leftPhase);
}

// Función que crea el modelo
function createModels(){
    // ESCENA
    scene = new THREE.Scene();
     
    // RENDER 
	renderer = new THREE.WebGLRenderer({alpha: true, antialias:true});
	renderer.setSize(window.innerWidth, window.innerHeight);
	container.appendChild(renderer.domElement);

    // LUCES
    var light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 2.2, 15);
    scene.add(light);
    
    // OCLUSORES
    var geometry = new THREE.CircleGeometry(2.25, 32);
    var material = new THREE.MeshBasicMaterial({color: 0x000000});
    material.opacity = 0.5;
    
    rightOclusor = new THREE.Mesh(geometry, material);
    rightOclusor.position.set(-3.36, 2.2, 0);
    rightOclusor.visible = false;
    scene.add(rightOclusor);
    
    leftOclusor = new THREE.Mesh(geometry, material);
    leftOclusor.position.set(3.36, 2.2, 0)
    leftOclusor.material.transparent = true;
    leftOclusor.visible = false;
    scene.add(leftOclusor);
    
    var loaderFace = new THREE.JSONLoader();
    var loaderEyes = new THREE.JSONLoader();
    var loaderLight = new THREE.JSONLoader();
    
    // Cargar los distintos modelos
    loaderEyes.load('static/js/ojo.json', addEyes);
    loaderFace.load('static/js/cara.json', addFace);
    loaderFace.load('static/js/caraCejas.json', addFaceBrow);
    loaderLight.load('static/js/brillo.json', addLight);

    // CAMARA
	camera = new THREE.OrthographicCamera(
	    window.innerWidth / -100,
	    window.innerWidth / 100,
	    window.innerHeight / 100,
	    window.innerHeight / -100,
	    1, 1000);
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 15;
    camera.lookAt(scene.position);
	scene.add(camera);
	
	// EVENTOS
	THREEx.WindowResize(renderer, camera);
	THREEx.FullScreen.bindKey({dblclick	: false});

}
            
// Función que añade al modelo los ojos
function addEyes (geometry, materials) {
    // Crear materiales
    var material = new THREE.MultiMaterial(materials);

    // Crear modelo
    rightEye = new THREE.Mesh(geometry, material);
    rightEye.position.set(-3.355, 2.2, -2.95);
    scene.add(rightEye);
    
    leftEye = new THREE.Mesh(geometry, material);
    leftEye.position.set(3.35, 2.2, -2.95);
    scene.add(leftEye);
}
            
// Función que añade al modelo la cara
function addFace (geometry, materials) {
    // Crear materiales
    var material = new THREE.MeshFaceMaterial(materials);
    
    // Crear modelo
    face = new THREE.Mesh(geometry, material);
    face.position.y = 2.2;
    scene.add(face);
}

function addFaceBrow (geometry, materials) {
    // Crear materiales
    var material = new THREE.MeshFaceMaterial(materials);
    
    // Crear modelo
    faceBrow = new THREE.Mesh(geometry, material);
    faceBrow.position.y = 2.2;
    scene.add(faceBrow);
    faceBrow.visible = false;
}

// Función que añade al modelo el brillo de la linterna
function addLight (geometry, materials) {
     // Crear materiales
    var material = new THREE.MeshFaceMaterial(materials);
        
    // Crear modelo
    rightLight = new THREE.Mesh(geometry, material);
    rightLight.position.set(-3.36, 2.2, -2.95);
    scene.add(rightLight);
    
    leftLight = new THREE.Mesh(geometry, material);
    leftLight.position.set(3.36, 2.2, -2.95);
    scene.add(leftLight);
    
    leftLight.visible = false;
    rightLight.visible = false;
}

// Función que renderiza el modelo            
function render() {
    renderer.clear();
    renderer.render(scene, camera);
}

// Función que cambia el tipo de patología del ojo derecho
$('#rightType').change(function() {
    if ($('#rightType').val() == 0) {
        $('#rightGrades').prop('disabled', true);
        $('#rightGrades').val(15);
    }
    else {
        $('#rightGrades').prop('disabled', false);
        $('#rightGrades').val(15);
        $("#leftType").val(0);
        $('#leftGrades').val(15);
        $('#leftGrades').prop('disabled', true);
    }
    
    // Añadimos desvio de 45º para la endotropia y exotropia
    if ($('#rightType').val() < 3 && $("#rightGrades option[value='45']").length == 0)
        $("#rightGrades").append('<option value="45">45º</option>');
    
    // Eliminamos los 45º para la hipotropia e hipertropia
    if ($('#rightType').val() >= 3)
        $("#rightGrades option[value='45']").remove();

    // Si cambiamos la patología con oclusor izquierdo modificamos el izquierdo
    if ($('#occluderType').val() == 2)
        selectType(false, $('#rightType').val(), $('#rightGrades').val());
    else
        selectType(true, $('#rightType').val(), $('#rightGrades').val());
});

// Función que cambia los grados de la patología del ojo derecho
$('#rightGrades').change(function() {
    // Si cambiamos la patología con oclusor izquierdo modificamos el izquierdo
    if ($('#occluderType').val() == 2)
        selectType(false, $('#rightType').val(), $('#rightGrades').val());
    else
        selectType(true, $('#rightType').val(), $('#rightGrades').val());
});

// Función que cambia el tipo de patología del ojo izquierdo
$('#leftType').change(function() {
    if ($('#leftType').val() == 0) {
        $('#leftGrades').prop('disabled', true);
        $('#leftGrades').val(15);
    }
    else {
        $('#leftGrades').prop('disabled', false);
        $('#leftGrades').val(15);
        $("#rightType").val(0);
        $('#rightGrades').val(15);
        $('#rightGrades').prop('disabled', true);
    }
    
    // Añadimos desvio de 45º para la endotropia y exotropia
    if ($('#leftType').val() < 3 && $("#leftGrades option[value='45']").length == 0)
        $("#leftGrades").append('<option value="45">45º</option>');
    
    // Eliminamos los 45º para la hipotropia e hipertropia
    if ($('#leftType').val() >= 3)
        $("#leftGrades option[value='45']").remove();
    
    // Si cambiamos la patología con oclusor derecho modificamos el derecho
    if ($('#occluderType').val() == 1)
        selectType(true, $('#leftType').val(), $('#leftGrades').val());
    else
        selectType(false, $('#leftType').val(), $('#leftGrades').val());
});

// Función que cambia los grados de la patología del ojo izquierdo
$('#leftGrades').change(function() {
    if ($('#occluderType').val() == 1)
        selectType(true, $('#leftType').val(), $('#leftGrades').val());
    else 
        selectType(false, $('#leftType').val(), $('#leftGrades').val());
});

// Función que resetea el modelo cuando cambiamos de tabs
$('input[name=tabs]').click(function() {
    // Reseteamos las patologías de los dos ojos
    $("#leftType").val(0);
    $('#leftGrades').prop('disabled', true);
    $('#leftGrades').val(15);
    
    $("#rightType").val(0);
    $('#rightGrades').prop('disabled', true);
    $('#rightGrades').val(15);
    
    selectType(0, 0, 0);
    
    // Reseteamos oclusor
    leftOclusor.visible = false;
    rightOclusor.visible = false;
    $('#occluderType').val(0);
    
    // Reseteamos funcionalidad exámen
    $('#examEye').prop('disabled', true);
    $('#examType').prop('disabled', true);
    $('#examGrades').prop('disabled', true);
    $('#checkExam').prop('disabled', true);
});

// Función que modifica la motilidad ocular de los ojos
function selectType(id, value, grades) {
    rightEye.rotation.set(0,0,0);
    leftEye.rotation.set(0,0,0);
    rightLight.rotation.set(0,0,0);
    leftLight.rotation.set(0,0,0);
    leftXPhase = rightXPhase = leftYPhase = rightYPhase = 0;
    
    // Calculamos los grados que se desvia el ojo
    grades = Math.atan((grades/7)/12.5);
    
    switch(parseInt(value)) {
        // SIN PATOLOGÍA
        case 0:
            break;
        
        //ENDOTROPIA    
        case 1:
            if (id) {
                rightEye.rotation.y = grades;
                rightXPhase = grades;
            }
            else {
                leftEye.rotation.y = -grades;
                leftXPhase = -grades;
            }
            break;
        
        //EXOTROPIA
        case 2:
            if (id) {
                rightEye.rotation.y = -grades;
                rightXPhase = -grades;
            }
            else {
                leftEye.rotation.y = grades;
                leftXPhase = grades;
            }
            break;
            
        //HIPERTROPIA
        case 3:
            if (id) {
                rightEye.rotation.x = -grades;
                rightYPhase = -grades;
            }
            else {
                leftEye.rotation.x = -grades;
                leftYPhase = -grades;
            }
            break;
        
        //HIPOTROPIA
        case 4:
            if (id) {
                rightEye.rotation.x = grades;
                rightYPhase = grades;
            }
            else {
                leftEye.rotation.x = grades;
                leftYPhase = grades;
            }
            break;
    };
}

// Función que genera un paciente aleatorio
$('#generatePacient').click(function() {
    examEye = Math.random() < 0.5;
    examType = Math.floor((Math.random() * 4) + 1); // Aleatorio entre 1 - 4 para las patologías
    
    // Las patologías endotropia y exotropia si pueden tener 45º
    if (examType < 3)
        examGrades = Math.floor((Math.random() * 3) + 1); // Aleatorio entre 1 - 3 para elegir los grados
    else
        examGrades = Math.floor((Math.random()* 2) + 1);
    
    if (examGrades == 1)
        examGrades = 15;
    else if (examGrades == 2)
        examGrades = 30;
    else
        examGrades = 45;
    
    $('#examEye').prop('disabled', false);
    $('#examType').prop('disabled', false);
    $('#examGrades').prop('disabled', false);
    $('#checkExam').prop('disabled', false);
    selectType(examEye, examType, examGrades);
});

// Función que corrige la patología seleccionada por usuario en la opción de examen 
$('#checkExam').click(function() {
    if ($("#examType").val() == examType && $("#examGrades").val() == examGrades && Boolean($("#examEye").val()) == examEye) {
       alert("¡CORRECTO! :)");
       
       $('#examEye').prop('disabled', true);
       $('#examType').prop('disabled', true);
       $('#examGrades').prop('disabled', true);
       $('#checkExam').prop('disabled', true);
       
       selectType(0, 0, 0);
    }
    else
       alert("¡INCORRECTO! :(");
});

// Función que añade el oclusor a un ojo
$('#occluderType').change(function() {
    switch(parseInt($('#occluderType').val())) {
        
        // SIN OCLUSOR
        case 0:
            leftOclusor.visible = false;
            rightOclusor.visible = false;
            
            if ($('#rightType').val() != 0)
                selectType(true, $('#rightType').val(), $('#rightGrades').val());
                
            if ($('#leftType').val() != 0)
                selectType(false, $('#leftType').val(), $('#leftGrades').val());
            break;
        
        //DERECHO    
        case 1:
            rightOclusor.visible = true;
            leftOclusor.visible = false;
            
            if ($('#rightType').val() != 0)
                selectType(true, $('#rightType').val(), $('#rightGrades').val());
                
            if ($('#leftType').val() != 0)
                selectType(true, $('#leftType').val(), $('#leftGrades').val());
                
            break;
        
        //IZQUIERDO
        case 2:
            leftOclusor.visible = true;
            rightOclusor.visible = false;
            
            if ($('#rightType').val() != 0)
                selectType(false, $('#rightType').val(), $('#rightGrades').val());
                
            if ($('#leftType').val() != 0)
                selectType(false, $('#leftType').val(), $('#leftGrades').val());
                
            break;
    };
});

// Función que opaca el oclusor
$('#opacity').click(function() {
    if ($('#opacity').is(':checked')) 
        // Da igual el oclusor que pongamos, se cambia en los dos al tener el mismo material
        rightOclusor.material.transparent = false;
    else
        rightOclusor.material.transparent = true;
});

$('#brow').click(function() {
    face.visible = !face.visible;
    faceBrow.visible = !faceBrow.visible;
});