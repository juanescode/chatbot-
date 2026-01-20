#!/bin/bash

# Script para crear plantilla con observaciones

WABA_ID="25747135574898164"
ACCESS_TOKEN=$(grep META_ACCESS_TOKEN .env | cut -d'=' -f2)

echo "🔧 Creando plantilla con observaciones: recordatorio_cita_con_obs_v1"
echo ""

curl -X POST "https://graph.facebook.com/v18.0/${WABA_ID}/message_templates" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "recordatorio_cita_con_obs_v1",
    "language": "es",
    "category": "UTILITY",
    "components": [
      {
        "type": "BODY",
        "text": "Hola {{1}},\n\nLe recordamos su cita médica para mañana:\n\n📅 *Fecha:* {{2}}\n⏰ *Hora:* {{3}}\n👨‍⚕️ *Médico:* {{4}}\n🏢 *Sede:* {{5}}\n🚪 *Consultorio:* {{6}}\n📋 *Tipo:* {{7}}\n💳 *Entidad:* {{8}}\n\n📝 *Observaciones importantes:*\n{{9}}\n\n⚠️ *Por favor llegar 20 minutos antes*\n📄 Traer documento de identidad y orden médica\n\n¡Gracias por confiar en nosotros! 🙏",
        "example": {
          "body_text": [
            [
              "Juan Pérez",
              "Lunes, 20 de enero de 2026",
              "10:00 AM",
              "Dra. María González",
              "Sede Norte",
              "Consultorio 101",
              "Control",
              "EPS Salud Total",
              "CX CATARATA OI - REGISTRARSE 20 MINUTOS ANTES - ORDEN MEDICA - DOCUMENTO DE IDENTIFICACIÓN"
            ]
          ]
        }
      }
    ]
  }' | python3 -m json.tool

echo ""
echo "✅ Plantilla enviada para aprobación"
echo "⏱️  Tiempo de aprobación: 15 minutos a 48 horas"
