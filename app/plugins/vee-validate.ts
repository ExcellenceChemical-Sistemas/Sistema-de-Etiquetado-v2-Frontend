import { configure } from "vee-validate";

// Por defecto vee-validate valida en cada blur/change de cada campo, lo que
// hace saltar los mensajes de error apenas el usuario pasa al siguiente
// campo (antes de intentar enviar el formulario). Con esta config, los
// campos solo se validan cuando se llama a handleSubmit (botón "Crear" /
// "Guardar cambios"). Una vez que hubo un intento de submit fallido,
// vee-validate revalida esos campos en cada cambio para que el usuario vea
// cuándo corrigió el error (comportamiento estándar, no hace falta tocarlo).
export default defineNuxtPlugin(() => {
  configure({
    validateOnBlur: false,
    validateOnChange: false,
    validateOnInput: false,
    validateOnModelUpdate: false,
  });
});