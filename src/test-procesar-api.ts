import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

/**
 * Script para probar el procesamiento de datos de la API
 * y mapearlos a los campos de la plantilla de WhatsApp
 */

interface CitaAPI {
  hora: number;
  ampm: string;
  consultorio: string;
  nombre: string;
  telefono: string;
  td: string;
  documento: string;
  estado: string;
  motivoCancela: string;
  fechaSolicita: string;
  entidad: string;
  tipo: string;
  concepto: string;
  observacion: string;
  orden: number;
  medico: string;
  requerida: string;
  creadaPor: string;
  modificadaPor: string;
  actualizada: string;
  id: number;
  impresa: null | string;
  sede: string;
}

interface PlantillaParams {
  nombre: string; // {{1}}
  fecha: string; // {{2}}
  hora: string; // {{3}}
  medico: string; // {{4}}
  sede: string; // {{5}}
  consultorio: string; // {{6}}
  tipo: string; // {{7}}
  entidad: string; // {{8}}
}

/**
 * Formatea la hora del formato 755 a "7:55 AM"
 */
function formatearHora(hora: number, ampm: string): string {
  const horaStr = hora.toString().padStart(4, "0");
  const horas = horaStr.substring(0, 2);
  const minutos = horaStr.substring(2, 4);
  return `${parseInt(horas)}:${minutos} ${ampm}`;
}

/**
 * Formatea la fecha de "2025-10-22" a "miércoles, 22 de octubre de 2025"
 */
function formatearFecha(fechaStr: string): string {
  const fecha = dayjs(fechaStr);
  return fecha.format("dddd, D [de] MMMM [de] YYYY");
}

/**
 * Extrae el primer número de teléfono si hay varios separados por guiones
 */
function extraerPrimerTelefono(telefono: string): string {
  if (!telefono) return "";

  // Si hay varios números separados por " - ", tomar el primero
  const numeros = telefono.split(" - ");
  const primerNumero = numeros[0].trim();

  // Agregar código de país si no lo tiene
  if (primerNumero && !primerNumero.startsWith("+")) {
    return `+57${primerNumero}`;
  }

  return primerNumero;
}

/**
 * Procesa una cita de la API y la convierte en parámetros para la plantilla
 */
function procesarCita(
  cita: CitaAPI,
): PlantillaParams & { telefono: string; citaId: number } {
  return {
    citaId: cita.id,
    telefono: extraerPrimerTelefono(cita.telefono),
    nombre: cita.nombre,
    fecha: formatearFecha(cita.requerida),
    hora: formatearHora(cita.hora, cita.ampm),
    medico: cita.medico,
    sede: cita.sede,
    consultorio: cita.consultorio,
    tipo: cita.tipo || "CONSULTA",
    entidad: cita.entidad || "PARTICULAR",
  };
}

/**
 * Lee el JSON de prueba y procesa las citas
 */
function main() {
  console.log("🔍 PROCESANDO DATOS DE LA API\n");
  console.log("=".repeat(80));

  // Leer el archivo JSON de prueba
  const jsonPath = path.join(__dirname, "../test-api-data.json");
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  console.log(`\n📊 Total de citas en el JSON: ${jsonData.data.length}\n`);

  // Procesar cada cita
  jsonData.data.forEach((cita: CitaAPI, index: number) => {
    console.log(`\n📋 CITA ${index + 1} - ID: ${cita.id}`);
    console.log("-".repeat(80));

    console.log("\n📥 DATOS ORIGINALES (API):");
    console.log(`   Nombre:       ${cita.nombre}`);
    console.log(`   Teléfono:     ${cita.telefono || "(vacío)"}`);
    console.log(`   Fecha:        ${cita.requerida}`);
    console.log(`   Hora:         ${cita.hora} ${cita.ampm}`);
    console.log(`   Médico:       ${cita.medico}`);
    console.log(`   Sede:         ${cita.sede}`);
    console.log(`   Consultorio:  ${cita.consultorio}`);
    console.log(`   Tipo:         ${cita.tipo || "(vacío)"}`);
    console.log(`   Entidad:      ${cita.entidad || "(vacío)"}`);
    console.log(`   Estado:       ${cita.estado}`);

    // Procesar cita
    const procesada = procesarCita(cita);

    console.log("\n📤 DATOS PROCESADOS (Para WhatsApp):");
    console.log(`   {{1}} Nombre:       ${procesada.nombre}`);
    console.log(`   {{2}} Fecha:        ${procesada.fecha}`);
    console.log(`   {{3}} Hora:         ${procesada.hora}`);
    console.log(`   {{4}} Médico:       ${procesada.medico}`);
    console.log(`   {{5}} Sede:         ${procesada.sede}`);
    console.log(`   {{6}} Consultorio:  ${procesada.consultorio}`);
    console.log(`   {{7}} Tipo:         ${procesada.tipo}`);
    console.log(`   {{8}} Entidad:      ${procesada.entidad}`);
    console.log(
      `   📱  Teléfono:       ${procesada.telefono || "❌ SIN TELÉFONO"}`,
    );

    // Validaciones
    const alertas: string[] = [];
    if (!procesada.telefono)
      alertas.push("⚠️  Sin teléfono - NO SE PUEDE ENVIAR");
    if (!procesada.nombre) alertas.push("⚠️  Sin nombre");
    if (!procesada.tipo) alertas.push('⚠️  Tipo vacío - se usará "CONSULTA"');
    if (!procesada.entidad)
      alertas.push('⚠️  Entidad vacía - se usará "PARTICULAR"');

    if (alertas.length > 0) {
      console.log("\n⚠️  ALERTAS:");
      alertas.forEach((alerta) => console.log(`   ${alerta}`));
    } else {
      console.log("\n✅ Cita válida para envío");
    }

    console.log("\n" + "=".repeat(80));
  });

  // Resumen
  const citasConTelefono = jsonData.data.filter((c: CitaAPI) => c.telefono);
  const citasSinTelefono = jsonData.data.filter((c: CitaAPI) => !c.telefono);

  console.log("\n📊 RESUMEN:");
  console.log(`   Total de citas:        ${jsonData.data.length}`);
  console.log(`   ✅ Con teléfono:       ${citasConTelefono.length}`);
  console.log(`   ❌ Sin teléfono:       ${citasSinTelefono.length}`);
  console.log(`   📨 Listas para envío:  ${citasConTelefono.length}\n`);

  console.log("💡 NOTA: Para enviar mensajes de prueba a tu número,");
  console.log("   reemplaza los teléfonos en el JSON con: +573216779467\n");
}

// Ejecutar
main();
