import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import "dayjs/locale/es";
import metaWhatsappService from "./services/meta-whatsapp.service";
import metaTemplateService from "./services/meta-template.service";
import { guardarMensaje } from "./database/db";

dayjs.locale("es");

/**
 * Script para enviar mensajes de prueba desde el JSON de la API
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
 * Extrae el primer número de teléfono
 */
function extraerPrimerTelefono(telefono: string): string {
  if (!telefono) return "";

  const numeros = telefono.split(" - ");
  const primerNumero = numeros[0].trim();

  if (primerNumero && !primerNumero.startsWith("+")) {
    return `+57${primerNumero}`;
  }

  return primerNumero;
}

/**
 * Limpia y formatea las observaciones
 */
function limpiarObservacion(obs: string): string {
  if (!obs) return "Sin observaciones adicionales";

  // Reemplazar saltos de línea por espacios
  return obs
    .replace(/\\n/g, " - ")
    .replace(/\n/g, " - ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 500); // Limitar a 500 caracteres
}

/**
 * Procesa una cita y la convierte en parámetros para la plantilla
 */
function procesarCita(cita: CitaAPI) {
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
    observacion: limpiarObservacion(cita.observacion),
  };
}

/**
 * Envía mensajes desde el JSON
 */
async function main() {
  console.log("\n╔═══════════════════════════════════════════════════╗");
  console.log("║   📤 ENVÍO DE MENSAJES DESDE JSON DE PRUEBA     ║");
  console.log("╚═══════════════════════════════════════════════════╝\n");

  // Leer el archivo JSON de prueba
  const jsonPath = path.join(__dirname, "../test-api-data.json");
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  console.log(`📊 Total de citas en el JSON: ${jsonData.data.length}\n`);

  // Filtrar citas con teléfono
  const citasValidas = jsonData.data.filter((c: CitaAPI) => c.telefono);
  console.log(`✅ Citas con teléfono: ${citasValidas.length}`);
  console.log(
    `❌ Citas sin teléfono: ${jsonData.data.length - citasValidas.length}\n`,
  );

  if (citasValidas.length === 0) {
    console.log("⚠️  No hay citas con teléfono para enviar\n");
    return;
  }

  // Usar la plantilla aprobada (sin observaciones por ahora)
  const templateName = "recordatorio_cita_v1"; // Cambiar a "recordatorio_cita_con_obs_v1" cuando esté aprobada
  console.log(`📝 Usando plantilla: ${templateName}\n`);

  let exitosos = 0;
  let fallidos = 0;

  // Enviar cada cita
  for (let i = 0; i < citasValidas.length; i++) {
    const cita = citasValidas[i];
    const procesada = procesarCita(cita);

    console.log(`\n${"=".repeat(80)}`);
    console.log(
      `📋 CITA ${i + 1}/${citasValidas.length} - ID: ${procesada.citaId}`,
    );
    console.log("=".repeat(80));
    console.log(`\n👤 Paciente:    ${procesada.nombre}`);
    console.log(`📞 Teléfono:    ${procesada.telefono}`);
    console.log(`📅 Fecha:       ${procesada.fecha}`);
    console.log(`⏰ Hora:        ${procesada.hora}`);
    console.log(`👨‍⚕️ Médico:      ${procesada.medico}`);
    console.log(`🏢 Sede:        ${procesada.sede}`);
    console.log(`🚪 Consultorio: ${procesada.consultorio}`);
    console.log(`📋 Tipo:        ${procesada.tipo}`);
    console.log(`💳 Entidad:     ${procesada.entidad}`);
    console.log(`📝 Observación: ${procesada.observacion}`);

    // Crear parámetros para la plantilla (8 parámetros para la plantilla actual)
    // Cuando uses "recordatorio_cita_con_obs_v1", agrega: procesada.observacion como parámetro {{9}}
    const parametros = [
      procesada.nombre,
      procesada.fecha,
      procesada.hora,
      procesada.medico,
      procesada.sede,
      procesada.consultorio,
      procesada.tipo,
      procesada.entidad,
      // procesada.observacion, // Descomentar cuando uses recordatorio_cita_con_obs_v1
    ];

    console.log(`\n📤 Enviando mensaje...`);

    try {
      const resultado = await metaWhatsappService.enviarMensajePlantilla(
        procesada.telefono,
        templateName,
        parametros,
      );

      if (resultado.success) {
        console.log(`✅ ¡Mensaje enviado exitosamente!`);
        console.log(`   📨 Message ID: ${resultado.messageId}`);

        // Guardar en base de datos
        guardarMensaje({
          citaId: procesada.citaId,
          nombrePaciente: procesada.nombre,
          telefono: procesada.telefono,
          mensaje: `Recordatorio enviado para ${procesada.fecha} a las ${procesada.hora}`,
          plantillaId: templateName,
          fechaCita: cita.requerida,
          medico: procesada.medico,
          sede: procesada.sede,
        });

        exitosos++;
      } else {
        console.log(`❌ Error al enviar mensaje: ${resultado.error}`);
        fallidos++;
      }
    } catch (error: any) {
      console.log(`❌ Error inesperado: ${error.message}`);
      fallidos++;
    }

    // Delay de 1 segundo entre mensajes
    if (i < citasValidas.length - 1) {
      console.log(`\n⏳ Esperando 1 segundo antes del siguiente envío...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Resumen final
  console.log(`\n${"=".repeat(80)}`);
  console.log("📊 RESUMEN FINAL");
  console.log("=".repeat(80));
  console.log(`   📨 Total enviados:  ${citasValidas.length}`);
  console.log(`   ✅ Exitosos:        ${exitosos}`);
  console.log(`   ❌ Fallidos:        ${fallidos}`);
  console.log(
    `   📈 Tasa de éxito:   ${((exitosos / citasValidas.length) * 100).toFixed(1)}%\n`,
  );

  if (exitosos > 0) {
    console.log(
      "💡 Revisa tu WhatsApp (+573216779467) para confirmar la recepción\n",
    );
  }
}

// Ejecutar
main()
  .then(() => {
    console.log("✅ Proceso completado\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error fatal:", error);
    process.exit(1);
  });
