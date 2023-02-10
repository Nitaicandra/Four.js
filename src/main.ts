import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {GUI} from 'dat.gui'
import * as tf from '@tensorflow/tfjs'
import './style.css'
import Stats from 'three/examples/jsm/libs/stats.module'
import * as math from 'mathjs'
import { TensorBuffer } from '@tensorflow/tfjs'
import { forEach } from 'mathjs'
//import { forEachTransformDependencies } from 'mathjs'
//import benchmark from 'benchmark'
//import * as math from 'mathjs'


const stats = Stats()

document.body.appendChild(stats.dom)

const loader = new THREE.TextureLoader();
const dot = loader.load('./../dot.png');

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
75, 
window.innerWidth / window.innerHeight,
0.1,
1000 );

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild(renderer.domElement );

//const geometry = new THREE.BoxGeometry( 1, 1, 1 );


//tensor flow matrix definitions top left clockwise
//tf.tidy(()=>{})

class DimensionalGeometry{
  dimension=0;
  rotation_planes = 0; //number
  type='';
  origin:any;
  stereographic = true;
  lightSource:any;
  object_data:any; 
  index_data:any; 
  translation_matrix= 0; // translation matrix
  intermediate_rotation_matricies:any = [


  ]; 
  rotation_matrix=0;// rotation matricies
  projection_matrix: any; // projection matrix
  
  rotation_values: Float32Array;


  constructor(dimension:number,type:string){
    this.dimension = dimension;
    this.type = type;
    this.origin = new Float32Array(dimension).fill(0)
    
    
    this.rotation_planes = math.factorial(dimension)/(math.factorial(2)*math.factorial(dimension-2))
    this.rotation_values = new Float32Array(this.rotation_planes).fill(0);
    //this.rotation_values = new Float32Array(this.rotation_planes).fill(0);
    if(type == 'Cube'){
      this.GenerateCube();
      this.GenerateIndices()
      this.GenerateEmptyRotationMatrices()
      this.PopulateRotationMatrices()
    }
    
    if(type == 'KlienBottle'){
    
    }
    if(type == 'Camera'){
    
    }
  }
  
  GenerateCube (){
    if(this.dimension !=0){
      const rows =2**this.dimension
      const columns = this.dimension+1
      this.object_data = tf.buffer([rows,columns])
      for (let i = 0; i<rows; i++ ){
        for (let j = 0; j<columns-1; j++ ){
          //console.log((i+1),'-',Math.floor((i)/2**(j+1)))
          //console.log((i+1),(2**(j+1))*(i/2**(j+1)))
          if((i+1)- 
          (2**(j+1))*Math.floor(i/2**(j+1))
          >2**(j)){
            this.object_data.set(-1,i,j)
          }else{
            this.object_data.set(1,i,j)
          }
          
        }
        this.object_data.set(1,i,columns-1) // sets the last column to 1, homogenous
      }
      this.object_data.toTensor().print();

    }
    
  }
  GenerateIndices(){ // lines
    if(this.dimension !=0){
    
    //let number_of_indices = 2^this.dimension+1 + 2^this.dimension-1
    const index_array_size= this.dimension*2**this.dimension
    //const linedirection= Array.from({length: this.dimension}, (v, i) => i)
    let accumulate=0;
    let index=0;
    this.index_data = new Float32Array(index_array_size);
      for(let i= 0; i<this.dimension+1;i++){
        // number of edges per dimension
        for (let j = 0; j<2**(this.dimension-1);j++){
        
          for(let k =0; k<this.dimension;k++){
          
            if((j+1)- 
            (2**(k+1))*Math.floor(j/2**(k+1))
            >2**(k))
            {
              if(k<i){
                accumulate+= 2**(k+1)/2;
              } else{
                accumulate+= 2**(k+1)
              }
              
              //console.log(accumulate)
              
              
            }else{
              //accumulate+= 0
            }
            //console.log(accumulate)
          
          }
          
          // what accumulate is is the increase index number necessary for darwing the lines
          
          //+1 = horzontal
          //+2 = vertical down
          //+4 = 3d 
          //+8 = 4d
          
          // with each additional dimension the order shifts down
          
          // the number of times this is run is dictated by number of vertices/2
          // first find correct index pairs  second based on first and dimension
          // then place the correct indexs in those pairs
          
          //this.index_data[0+2*i]
          
          //------
          //console.log(accumulate)
          
          this.index_data[index]=accumulate
          index+=1
          this.index_data[index]=accumulate+2**i
          index+=1
          //this.index_data[accumulate]
          //this.index_data[accumulate+2**i]
          accumulate=0;
        }
        // demesnion 1 goes throught each 1d 2^4
        // demesnion 2 goes through each 2d  2^
        // demension 3 goes thorugh each 3d 4
      }
    
    
    console.log("index DATA",this.index_data);
    }
  }
  LightSourceProject(num:number){
    //this.lightSource = new Array(this.dimension+1);
    //this.lightSource.fill(1);
    const rows =2**this.dimension
    const columns = this.dimension+1
    for (let i = 0; i<rows; i++ ){
      for (let j = 0; j<columns-1; j++ ){
        //console.log(this.object_data.get(7,3))
        for(let k = 3; k<this.dimension;k++){
          if(j<k){
            
            this.object_data.set(this.object_data.get(i,j)/(
            this.object_data.get(i,k)-num),i,j)
            
          }
        }
        console.log()
        if(this.dimension>3){
        this.object_data.set(this.object_data.get(i,j)*((num-1)**(this.dimension-3)),i,j)
        }
      }
    }
  
  }
  
  PrintGeometry(){
    this.object_data.print()
  }
  GenerateEmptyRotationMatrices(){
    for( let i = 0; i < this.rotation_planes; i++){
      this.intermediate_rotation_matricies[i]= tf.buffer([this.dimension+1,this.dimension+1]);
      
    }
  }// xy , xz , yz, xw, yw,zw
  PopulateRotationMatrices(){
    // xy , xz, yz
    let accumulator = 0;
    let common_difference =0;
    
    for (let i = 0; i<this.rotation_planes; i++ ){
      //for each rotation plane generate rotatioon matrix based on placemen
      // fist should be xy
      
      // the sizeo of a rotation matrix will be dimesion+1 therfor just use that 4head
      for (let j = 0; j<this.dimension+1; j++ ){
        for (let k = 0; k<this.dimension+1; k++ ){
          //set = value, row, column
          // i 
          if(i-common_difference > accumulator){
            accumulator +=1
            common_difference +=accumulator
            
            //normalized = distance from previous accumulator
          }
          if(( i - (common_difference )  == j && j ==k)){
            
            // outputs cos//Math.cos(this.rotation_values[i])
            this.intermediate_rotation_matricies[i].set(5,j,k)
          }
          else if (false){
            // cos case 2
            this.intermediate_rotation_matricies[i].set(Math.cos(this.rotation_values[i]),j,k)
           }
          else if(false)
          {
            // outputs sin
            this.intermediate_rotation_matricies[i].set(Math.sin(this.rotation_values[i]),j,k)
          }else if (false){
            // - sin
            this.intermediate_rotation_matricies[i].set(-Math.sin(this.rotation_values[i]),j,k)
          }
          else if (j==k){
           // 1
           this.intermediate_rotation_matricies[i].set(1,j,k)
          }else{
            // 0
          this.intermediate_rotation_matricies[i].set(0,j,k)
          }
         
          
          
        }
      }
    }
    // outpu into the inttermediat matrices
    // output into the final matrix
    ///console.log("TEST####")
    this.PrintRotationMatrices()
  }
  PrintRotationMatrices(){
    for(let i = 0; i<this.rotation_planes; i++){
      this.intermediate_rotation_matricies[i].toTensor().print();
      //console.log("TEST48")
    }
    
  }
  GenerateMatricies (){
    for (let i = 0; i<this.dimension; i++ ){
      
    }
  }
  UpdateGeometry (){
  
  }
  UpdateDatGUI(){
  }

  
  AddScene(scene:any){
    const geometry = new THREE.BufferGeometry()

    geometry.setAttribute(
      //'position', new THREE.BufferAttribute(Float32Array.from(sq.flat()),3));
        'position', new THREE.BufferAttribute(this.object_data,3));
    /*
    const squarepointsmaterial = new THREE.PointsMaterial( { 
    map: dot,alphaTest:0.8, size: 0.09,color: 0xFFFFFF,  } );

    scene.add( line );
    ///scene.add( cube );
    */
    geometry.setIndex( this.index_data )
    const linematerial = new THREE.LineBasicMaterial( { color: 0xFFFFFF} );
    const line = new THREE.LineSegments( geometry, linematerial );
    scene.add( line )
  }
}



const classExample = new DimensionalGeometry(6,'Cube')
//console.log(classExample.object_data);

let tesseract = tf.tensor([
 -1, 1, 1, 1,  1,  //front face
  1, 1, 1, 1,  1,
  1,-1, 1, 1,  1,
 -1,-1, 1, 1,  1,

 -1, 1,-1, 1,  1,// back face
  1, 1,-1, 1,  1,
  1,-1,-1, 1,  1,
 -1,-1,-1, 1,  1,

 -1, 1, 1, -1 ,1,//4d front
  1, 1, 1, -1 ,1,
  1,-1, 1, -1 ,1,
 -1,-1, 1, -1 ,1,

 -1, 1,-1, -1 ,1,// 4d back
  1, 1,-1, -1 ,1,
  1,-1,-1, -1 ,1,
 -1,-1,-1, -1 ,1
],[16,5])

let thetayz = 0
let cothetayz = Math.cos(thetayz)
let sinthetayz =Math.sin(thetayz)

let thetaxz = 0
let cothetaxz = Math.cos(thetaxz)
let sinthetaxz =Math.sin(thetaxz)

let thetaxy = 0
let cothetaxy = Math.cos(thetaxy)
let sinthetaxy =Math.sin(thetaxy)

let thetazw = 0
let cothetazw = Math.cos(thetazw)
let sinthetazw =Math.sin(thetazw)

let thetaxw = 0
let cothetaxw = Math.cos(thetaxw)
let sinthetaxw =Math.sin(thetaxw)

let thetayw = 0
let cothetayw = Math.cos(thetayw)
let sinthetayw =Math.sin(thetayw)
//console.log(cotheta)

/// ROTATION 
// organizing in a consisten maneer using the standard way is hard organize the first 3 together explicitley and everything else can fuck off
// xy rotation bring x to y countrer clockwise
// brings x to y counter clockwise brings first axis to lower axis 3b1b
// the order of matrix genraration will be closest to start element paired with the next closest
// x axis = yz plane but idkl, rather than group based on first 3 being 3d rotations and next 3 being 4d
// base on fisrt axis combinations thne y axis combination then z it chose this scheme because its easy
let xyRotate = tf.tensor2d([
  cothetaxy,     sinthetaxy,      0,         0,            0,
  -1*sinthetaxy, cothetaxy,       0,         0,            0,
  0,           0,                 1,         0,            0,
  0,           0,                 0,         1,            0,
  0,           0,                 0,         0,            1
],[5,5])

let xzRotate = tf.tensor([
  cothetaxz,     0,     sinthetaxz,        0,            0,
  0,             1,       0,               0,            0,
  -1*sinthetaxz, 0,      cothetaxz,        0,            0,
  0,             0,       0,               1,            0,
  0,             0,       0,               0,            1
],[5,5])

let xwRotate = tf.tensor([
  cothetaxw,     0,           0,         sinthetaxw,     0,
  0,           1,             0,         0,              0,
  0,           0,             1,         0,              0,
  -1*sinthetaxw, 0,           0,         cothetaxw,      0,
  0,           0,             0,         0,              1
],[5,5])

let yzRotate = tf.tensor2d([
  1,           0,             0,         0,            0,
  0,     cothetayz,      sinthetayz,     0,            0,
  0, -1*sinthetayz,       cothetayz,     0,            0,
  0,           0,             0,         1,            0,
  0,           0,             0,         0,            1
],[5,5])

let ywRotate = tf.tensor2d([
  1,           0,             0,         0,            0,
  0,           cothetayw,     0,         sinthetayw,   0,
  0,           0,             1,         0,            0,
  0,          -1*sinthetayw,    0 ,      cothetayw,    0,
  0,           0,             0,         0,            1
],[5,5])

let zwRotate = tf.tensor2d([
  1,           0,             0,         0,                0,
  0,           1,             0,         0,                0,
  0,           0,       cothetazw,       sinthetazw,       0,
  0,           0,      -1*sinthetazw,    cothetazw,        0,
  0,           0,             0,         0,                1
],[5,5]) 





let rotation_matrix = 
tf.matMul(
tf.matMul(
tf.matMul(
tf.matMul(
tf.matMul(
yzRotate,xzRotate),xyRotate),zwRotate),xwRotate),ywRotate)

let rotated_geometry =tf.matMul(tesseract,rotation_matrix)
/// BEFORE TRANSALTION IS STEREO PROJECTION
//PROJECTION 
let stereolight = 4
// subtract form w to get distance
//let stereodistance =  
let distance= tf.tensor2d([
  1,           0,             0,         0,            0,
  0,           1,             0,         0,            0,
  0,           0,             1,         0,            0,
  0,           0,             0,         1,            -1,
  0,           0,             0,         0,            stereolight
],[5,5])
let projgeometry = tf.matMul(rotated_geometry,distance).bufferSync()
for(let i = 0; i<16 ;i++){
  for(let j = 0; j<3;j++){
    projgeometry.set(projgeometry.get(i,j)/projgeometry.get(i,4),i,j)
  }
}

//TRANSLATION
let xpos=0;
let ypos=0;
let zpos=0;
let wpos=0;
let translate= tf.tensor2d([
  1,           0,             0,         0,            0,
  0,           1,             0,         0,            0,
  0,           0,             1,         0,            0,
  0,           0,             0,         1,            0,
  xpos,        ypos,          zpos,      wpos,         1
],[5,5])
let translated_geometry = tf.matMul(projgeometry.toTensor(),translate).slice(0,[-1,3]).dataSync()

//let projected =

const lineindex = [
  // front face
  0,1,
  1,2,
  2,3,
  3,0,
  // front connect
  0,4,
  1,5,
  2,6,
  3,7,
  // back face
  4,5,
  5,6,
  6,7,
  7,4,
  
  // 4d connect
  0,8,
  1,9,
  2,10,
  3,11,
  
  4,12,
  5,13,
  6,14,
  7,15,
  
  // 4d front
  8,9,
  9,10,
  10,11,
  11,8,
  
  // 4d inner connect
  8,12,
  9,13,
  10,14,
  11,15,
  
  // 4d back
  12,13,
  13,14,
  14,15,
  15,12,
    
  
  
  // sq[4],sq[5],
  // sq[5],sq[6],
  // sq[6],sq[7],
  // sq[7],sq[4] 
  
]

const geometry = new THREE.BufferGeometry()

geometry.setAttribute(
  //'position', new THREE.BufferAttribute(Float32Array.from(sq.flat()),3));
    'position', new THREE.BufferAttribute(translated_geometry,3));
/*
const squarepointsmaterial = new THREE.PointsMaterial( { 
map: dot,alphaTest:0.8, size: 0.09,color: 0xFFFFFF,  } );

scene.add( line );
///scene.add( cube );
*/
geometry.setIndex( lineindex )
const linematerial = new THREE.LineBasicMaterial( { color: 0xFFFFFF} );
const line = new THREE.LineSegments( geometry, linematerial );
//scene.add( line )

///CLASSEXAMPLE 

const geometry2 = new THREE.BufferGeometry()
classExample.LightSourceProject(5);
geometry2.setAttribute(
  //'position', new THREE.BufferAttribute(Float32Array.from(sq.flat()),3));
    'position', new THREE.BufferAttribute(classExample.object_data.toTensor().slice([0,0],[-1,3]).dataSync(),3));
//let object_data2 = classExample.object_data.toTensor().dataSync()
console.log('TEST',classExample.object_data.toTensor().dataSync())
console.log('TEST2',translated_geometry)
console.log('TEST3',Array.from(classExample.index_data) )
console.log('TEST4',lineindex )
geometry2.setIndex( Array.from(classExample.index_data))
const linematerial2 = new THREE.LineBasicMaterial( { color: 0xFFFFFF} );
const line2 = new THREE.LineSegments( geometry2, linematerial2 );
scene.add( line2 )





//classExample.AddScene(scene)

//const cube = new THREE.Points( geometry, squarepointsmaterial );




//camera.position.z = 5;

function updateRenderer(){
	renderer.setSize(window.innerWidth,window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
}
window.addEventListener('resize',()=>{
    updateRenderer()
    camera.aspect = window.innerWidth/window.innerHeight
    camera.updateProjectionMatrix()
})

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping=true
controls.maxDistance = 100


console.log(camera.position);
function distanceSquaredToCamera(array:number[]): number{
  let distance = (camera.position.x-array[0])**2+ 
  (camera.position.y-array[1])**2+
  (camera.position.z-array[2])**2
  return distance
}
console.log(distanceSquaredToCamera([1,2,3]))

//SETTING 

//
const gui = new GUI();

let geoRotation = {
  x:0.0,
  y:0.0,
  z:0.0
}
let geoPosition = {
  x:0.0,
  y:0.0,
  z:0.0
}

let camRotation = {
  x:0.0,
  y:0.0,
  z:0.0
}
let camPosition = {
  x:0.0,
  y:0.0,
  z:0.0
}
const projectionFolder = gui.addFolder('PROJECTION');

const geometryFolder = gui.addFolder('GEOMETRY');

geometryFolder.open();
const geoPosFolder = geometryFolder.addFolder('GEOPOSITION')
geoPosFolder.add(geoPosition,'x',-5,5,0.01).name('X').onChange(()=>{
  //cube.position.x = geoPosition.x;
  line.position.x = geoPosition.x;
});
geoPosFolder.add(geoPosition,'y',-5,5,0.01).name('Y').onChange(()=>{
  //cube.position.y = geoPosition.y;
  line.position.y = geoPosition.y;
});
geoPosFolder.add(geoPosition,'z',-5,5,0.01).name('Z').onChange(()=>{
  //cube.position.z = geoPosition.z;
  line.position.z = geoPosition.z;
});

const geoRotFolder = geometryFolder.addFolder('GEOROTATION')
geoRotFolder.add(geoRotation,'x',0,2*Math.PI,0.01).name('Rotate YZ PLANE').onChange(()=>{
  //cube.rotation.x = geoRotation.x;
  line.rotation.x = geoRotation.x;
});
geoRotFolder.add(geoRotation,'y',0,2*Math.PI,0.01).name('Rotate XZ PLANE').onChange(()=>{
  //cube.rotation.y = geoRotation.y;
  line.rotation.y = geoRotation.y;
});
geoRotFolder.add(geoRotation,'z',0,2*Math.PI,0.01).name('Rotate XY PLANE').onChange(()=>{
  //cube.rotation.z = geoRotation.z;
  line.rotation.z = geoRotation.z;
});

const cameraFolder = gui.addFolder('CAMERA');
cameraFolder.open();
const CamPosFolder = cameraFolder.addFolder('CAMPOSITION')
CamPosFolder.add(camPosition,'x',-5,5,0.01).name('X').onChange(()=>{
  camera.position.x = camPosition.x;
});
CamPosFolder.add(camPosition,'y',-5,5,0.01).name('Y').onChange(()=>{
  camera.position.y = camPosition.y;
});
CamPosFolder.add(camPosition,'z',-5,5,0.01).name('Z').onChange(()=>{
  camera.position.z = camPosition.z;
});

const camRotFolder = cameraFolder.addFolder('CAMROTATION')
camRotFolder.add(camRotation,'x',0,2*Math.PI,0.01).name('Rotate YZ PLANE').onChange(()=>{
  camera.rotation.x = camRotation.x;
});
camRotFolder.add(camRotation,'y',0,2*Math.PI,0.01).name('Rotate XZ PLANE').onChange(()=>{
  camera.rotation.y = camRotation.y;
});
camRotFolder.add(camRotation,'z',0,2*Math.PI,0.01).name('Rotate XY PLANE').onChange(()=>{
  camera.rotation.z = camRotation.z;
});
camera.position.x=0
camera.position.y=0
camera.position.z=5 // push camera back remember +z = towards camera
// fix async issue currently some wierd stuff is going on with matrix multiplication

function sortgeoemtry(array:number[][]){
  array.sort((a,b)=>{
    const d1 = distanceSquaredToCamera(a)
    const d2 = distanceSquaredToCamera(b)
    if(d1>d2){
      return -1;
    }
    if(d1<d2){
      return 1;
    }
    return 0
  })
}

function animate() {
  //sortgeoemtry
  stats.update()
  controls.update();
  renderer.render( scene, camera );
  window.requestAnimationFrame( animate );
};
animate();