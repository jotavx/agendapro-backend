const twilio = require("twilio");
const cron = require("node-cron");
require("dotenv").config();
const supabase = require("../supabase-client"); // Importar cliente de Supabase
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER; // Número por defecto para "pro"
const client = twilio(accountSid, authToken);

let scheduledReminders = [];

// Función para obtener el número de WhatsApp del usuario
const getWhatsappNumber = async (userId) => {
  // Consultar en la base de datos de Supabase para obtener el número del usuario
  const { data, error } = await supabase
    .from("users") // Asegúrate de que el nombre de la tabla sea correcto
    .select("plan, private_number")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Si el usuario tiene el plan "premium", usamos su número personalizado
  if (data.plan === "premium" && data.private_number) {
    return data.private_number;
  }

  // Si el usuario tiene el plan "pro" o no tiene número personalizado, usamos el número por defecto de Twilio
  return twilioNumber;
};

// Enviar mensaje de WhatsApp
const sendWhatsapp = async (req, res) => {
  const { userId, phone, message } = req.body;

  if (!userId || !phone || !message) {
    return res
      .status(400)
      .json({ error: "userId, phone y message son requeridos" });
  }

  try {
    // Obtener el número de WhatsApp correcto dependiendo del plan
    const whatsappNumber = await getWhatsappNumber(userId);
    console.log(whatsappNumber);

    await client.messages.create({
      from: `whatsapp:${whatsappNumber}`,
      to: `whatsapp:${phone}`,
      body: message,
    });

    res.json({ success: true, message: "Mensaje enviado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Programar recordatorio de cita
const scheduleReminder = (req, res) => {
  const { userId, phone, message, datetime } = req.body;

  if (!userId || !phone || !message || !datetime) {
    return res
      .status(400)
      .json({ error: "userId, phone, mensaje y fecha son requeridos" });
  }

  const date = new Date(datetime);
  const cronTime = `${date.getUTCMinutes()} ${date.getUTCHours()} ${date.getUTCDate()} ${
    date.getUTCMonth() + 1
  } *`;

  const job = cron.schedule(
    cronTime,
    async () => {
      try {
        // Obtener el número de WhatsApp correcto dependiendo del plan
        const whatsappNumber = await getWhatsappNumber(userId);

        await client.messages.create({
          from: `whatsapp:${whatsappNumber}`,
          to: `whatsapp:${phone}`,
          body: message,
        });
      } catch (error) {
        console.error("Error enviando recordatorio:", error);
      }
    },
    { scheduled: true, timezone: "UTC" }
  );

  scheduledReminders.push(job);
  res.json({ success: true, message: "Recordatorio programado" });
};

// Confirmar cita cuando el usuario hace clic en el botón de confirmación

const confirmAppointment = async (req, res) => {
  const { appointmentId } = req.params;

  try {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "confirmado" })
      .eq("id", appointmentId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ message: "Cita confirmada correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const cancelAppointment = async (req, res) => {
  const { appointmentId } = req.params;

  try {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelado" })
      .eq("id", appointmentId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ message: "Cita cancelada correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = {
  sendWhatsapp,
  scheduleReminder,
  confirmAppointment,
  cancelAppointment,
};

// GESTIONAR ESTADO DEL TURNO DE ACUERDO AL PLAN DEL USUARIO
// const handleAppointmentResponse = async (req, res) => {
//   console.log("Datos recibidos en el backend:", req.body);

//   const { Body, From } = req.body; // ❌ No llega appointmentId, hay que obtenerlo
//   if (!Body || !From) {
//     return res.status(400).json({ error: "Faltan datos en la solicitud" });
//   }

//   try {
//     // Buscar la cita más reciente con este número de teléfono
//     const { data: appointment, error: appointmentError } = await supabase
//       .from("appointments")
//       .select("id, status, userId")
//       .eq("telefono", From.replace("whatsapp:", ""))
//       .order("created_at", { ascending: false }) // Descendente (última cita primero)
//       .limit(1)
//       .single();

//     if (appointmentError || !appointment) {
//       return res.status(404).json({ error: "Cita no encontrada" });
//     }

//     // Obtener el usuario
//     const { data: user, error: userError } = await supabase
//       .from("users")
//       .select("plan")
//       .eq("id", appointment.userId)
//       .single();

//     if (userError || !user) {
//       return res.status(404).json({ error: "Usuario no encontrado" });
//     }

//     // Verificar si el usuario tiene plan premium
//     if (user.plan !== "premium") {
//       return res.status(403).json({
//         error: "Solo usuarios premium pueden confirmar o cancelar citas",
//       });
//     }

//     // Procesar la respuesta del usuario
//     const response = Body.trim().toUpperCase();
//     if (response === "CONFIRMAR" || response === "CANCELAR") {
//       const newStatus = response === "CONFIRMAR" ? "confirmado" : "cancelado";

//       // Actualizar estado de la cita
//       const { error: updateError } = await supabase
//         .from("appointments")
//         .update({ status: newStatus })
//         .eq("id", appointment.id);

//       if (updateError) {
//         return res.status(500).json({ error: "Error al actualizar cita" });
//       }

//       return res.json({ success: true, message: `Cita ${newStatus}` });
//     } else {
//       return res.status(400).json({ error: "Respuesta no válida" });
//     }
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Error al manejar la respuesta" });
//   }
// }

// GESTIONAR ESTADO DEL TURNO SIN IMPORTAR PLAN DEL USUARIO

// const handleAppointmentResponse = async (req, res) => {
//   const { Body, From } = req.body; // Body es la respuesta del usuario (CONFIRMAR o CANCELAR), From es el número del cliente

//   if (!Body || !From) {
//     return res
//       .status(400)
//       .json({ error: "Respuesta o número de teléfono faltante" });
//   }

//   const response = Body.trim().toUpperCase();

//   try {
//     if (response === "CONFIRMAR" || response === "CANCELAR") {
//       const { data, error } = await supabase
//         .from("appointments")
//         .select("id, status")
//         .single();

//       if (error) {
//         return res.status(500).json({ error: "Error al obtener cita" });
//       }

//       // Cambiar el estado de la cita según la respuesta del usuario
//       const newStatus = response === "CONFIRMAR" ? "confirmado" : "cancelado";

//       const { error: updateError } = await supabase
//         .from("appointments")
//         .update({ status: newStatus })
//         .eq("id", data.id);

//       if (updateError) {
//         return res
//           .status(500)
//           .json({ error: "Error al actualizar estado de cita" });
//       }

//       res.json({ success: true, message: `Cita ${newStatus}` });
//     } else {
//       return res.status(400).json({ error: "Respuesta no válida" });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Error al manejar la respuesta" });
//   }

// module.exports = { sendWhatsapp, scheduleReminder, handleAppointmentResponse };
