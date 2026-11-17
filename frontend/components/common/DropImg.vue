<template>
  <div :style="{ borderColor: props.sw ? 'red' : 'green' }"  class="dropzone" id="prueba" ref="myDropzone">
      <div class="dz-default dz-message">
        <button class="dz-button" type="button"> <img src="~/assets/img/logo-upload.png" style="max-width: 10%; height: auto;">
        <p>Arrastra archivos aquí o haz clic para seleccionar</p></button>
      </div>
  </div>
  <div  v-if="props.sw" class="v-messages"  >
    <div class="v-messages__message" style="color: red;" >El campo es obligatorio
    </div>
  </div>
</template>

<script lang="ts" setup>
import Dropzone from 'dropzone';
import 'dropzone/dist/dropzone.css';
const props = defineProps({
  types: {
    type: String,
    default:'application/pdf',
    required: true,
  },
  cantidad: {
    type: Number,
    default: 1,
    required: true,
  },
  existimg: {
    type: String,
    required: true,
  },
  sw:{
    type: Boolean,
    require:true,
  },
});


const myDropzone = ref<HTMLElement | null>(null);
const removedFile = ref<File | null>(null);
let arrayimg:any = ref([]);
const emit = defineEmits(["upload:filesupoad","input"]);
function initDropzone() {
  const myDropzoneInstance = new Dropzone(myDropzone.value as HTMLElement, {
    // props.url
    url: "/",
    maxFiles: props.cantidad,
    acceptedFiles: props.types,
    autoProcessQueue: true,
    addRemoveLinks: true,
    dictDefaultMessage: "Arrastra y suelta los archivos aquí o haz clic para seleccionar", 
    dictFallbackText: "Utiliza el botón de selección de archivos para subir.",
    dictFileTooBig: "El archivo es demasiado grande ({{filesize}}MiB). Máximo permitido: {{maxFilesize}}MiB.",
    dictInvalidFileType: "No puedes subir archivos de este tipo.",  
    dictCancelUpload: 'Cancelar subida.',
    dictCancelUploadConfirmation: 'Esta seguro que quiere cancelar?',
    dictRemoveFile: 'Quitar archivo',
    dictMaxFilesExceeded: 'No puede subir mas archivos.',
    init: function() {
      this.on("addedfile",(file: any) =>{
        if (arrayimg.value.length >= props.cantidad) {
          const removedFile = arrayimg.value.shift(); 
          if (removedFile) {
            this.removeFile(removedFile); 
          }
        }

        console.log("adicionado",file.name,file.type) 
        emit("input", arrayimg.value.length > 0 ? true : false);       
      });

      this.on("removedfile",(file: any) =>{
        console.log("removido",file.name,file.type)
        const i = arrayimg.value.indexOf(file);
        if (i !== -1) {
          arrayimg.value.splice(i, 1); 
          console.log(arrayimg.value,"removido")
          emit("upload:filesupoad", arrayimg.value);
          emit("input", arrayimg.value.length > 0 ? true : false); 
        }
      });
      this.on("success", function(file: any, response: any) { 
      console.log("Subida exitosa:",file.name,file.type);
      arrayimg.value.push(file);
      emit("upload:filesupoad", arrayimg.value); 
      emit("input", arrayimg.value.length > 0 ? true : false);
      });
      this.on("error", (file: any, response: any) => { 
        console.error("Error en la subida:",file.name,file.type);
        this.removeFile(file);
        emit("upload:filesupoad", arrayimg.value); 
        emit("input", arrayimg.value.length > 0 ? true : false);
      });
    }
  });

  return myDropzoneInstance;

}

let variable =  ref<Dropzone | null>(null);
watch(() => props.existimg, (nuevo) => {
 console.log("escuchaaa",props.existimg,nuevo)
  const mockFile = { name: props.existimg.split('/').pop(), size: 12345 }; // Mock file for preview
  console.log(mockFile)
  variable.value?.emit("addedfile",mockFile);
  variable.value?.emit("thumbnail",mockFile, props.existimg);
  variable.value?.emit("complete",mockFile);
  arrayimg.value.push(mockFile);
  emit("upload:filesupoad", arrayimg.value); 
  emit("input", arrayimg.value.length > 0 ? true : false);
});
watch(()=>props.sw,(nuevo)=>{
  console.log("escucha al sw",props.sw)
  if(props.sw===true){
      console.log("esta dentrodel sw campo obligatorio")
  }
})

onMounted(() => {
  variable.value = initDropzone();
});
</script>

<style>
.dropzone {
  border: 2px solid rgb(17, 47, 71);
  border-radius: 5px;
  padding: 20px;
  width: auto;
  height: auto;
  text-align: center;
}


#prueba .dz-image img{
  width: 100% !important; 
  height: auto !important;
  position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}


</style>