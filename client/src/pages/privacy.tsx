import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useTranslation } from "react-i18next";

export default function PrivacyPage() {
  const { i18n } = useTranslation();
  const language = i18n.language;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8" data-testid="heading-privacy">
          {language === "es" ? "Política de Privacidad" : "Privacy Policy"}
        </h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            {language === "es" 
              ? "Última actualización: 15 de enero de 2026"
              : "Last Updated: January 15, 2026"}
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "1. Introducción" : "1. Introduction"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "MyEasyPass (\"nosotros\", \"nos\" o \"nuestro\"), propiedad de y operado por LBS, LLC, opera la plataforma de preparación para exámenes de licencias de Texas en myeasypass.net. Esta Política de Privacidad explica cómo recopilamos, usamos, divulgamos y protegemos su información cuando utiliza nuestro Servicio. Nos comprometemos a proteger su privacidad y garantizar la seguridad de su información personal."
                : "MyEasyPass (\"we,\" \"us,\" or \"our\"), owned and operated by LBS, LLC, operates the Texas licensing exam preparation platform at myeasypass.net. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service. We are committed to protecting your privacy and ensuring the security of your personal information."}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "2. Información que Recopilamos" : "2. Information We Collect"}
            </h2>
            
            <h3 className="text-lg font-medium">
              {language === "es" ? "2.1 Información Personal" : "2.1 Personal Information"}
            </h3>
            <p className="text-muted-foreground">
              {language === "es"
                ? "Cuando crea una cuenta, recopilamos:"
                : "When you create an account, we collect:"}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{language === "es" ? "Nombre y apellido" : "First and last name"}</li>
              <li>{language === "es" ? "Dirección de correo electrónico" : "Email address"}</li>
              <li>{language === "es" ? "Contraseña (almacenada de forma segura mediante hash, nunca en texto plano)" : "Password (securely hashed, never stored in plain text)"}</li>
              <li>{language === "es" ? "Preferencia de idioma" : "Language preference"}</li>
              <li>{language === "es" ? "Número de teléfono (opcional, para programación de exámenes)" : "Phone number (optional, for exam scheduling)"}</li>
            </ul>

            <h3 className="text-lg font-medium">
              {language === "es" ? "2.2 Información de Pago" : "2.2 Payment Information"}
            </h3>
            <p className="text-muted-foreground">
              {language === "es"
                ? "Los pagos se procesan de forma segura a través de Stripe. Nosotros NO almacenamos números de tarjetas de crédito, CVV u otra información financiera sensible. Stripe nos proporciona:"
                : "Payments are securely processed through Stripe. We do NOT store credit card numbers, CVV, or other sensitive financial information. Stripe provides us with:"}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{language === "es" ? "ID de cliente de Stripe" : "Stripe customer ID"}</li>
              <li>{language === "es" ? "Estado e ID de suscripción" : "Subscription status and ID"}</li>
              <li>{language === "es" ? "Historial de pagos (monto, fecha, estado)" : "Payment history (amount, date, status)"}</li>
            </ul>

            <h3 className="text-lg font-medium">
              {language === "es" ? "2.3 Datos de Uso" : "2.3 Usage Data"}
            </h3>
            <p className="text-muted-foreground">
              {language === "es" ? "Rastreamos automáticamente:" : "We automatically track:"}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{language === "es" ? "Sesiones y resultados de exámenes de práctica" : "Practice exam sessions and results"}</li>
              <li>{language === "es" ? "Progreso en la guía de estudio" : "Study guide progress"}</li>
              <li>{language === "es" ? "Programación de exámenes y asistencia" : "Exam scheduling and attendance"}</li>
              <li>{language === "es" ? "Métricas de rendimiento por categoría y tema" : "Performance metrics by category and topic"}</li>
              <li>{language === "es" ? "Información del dispositivo y navegador" : "Device and browser information"}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "3. Cómo Usamos Su Información" : "3. How We Use Your Information"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es" ? "Usamos su información para:" : "We use your information to:"}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{language === "es" ? "Proporcionar y mantener nuestro Servicio" : "Provide and maintain our Service"}</li>
              <li>{language === "es" ? "Procesar suscripciones y pagos" : "Process subscriptions and payments"}</li>
              <li>{language === "es" ? "Rastrear su progreso de aprendizaje y rendimiento" : "Track your learning progress and performance"}</li>
              <li>{language === "es" ? "Generar certificados de logros" : "Generate certificates of achievement"}</li>
              <li>{language === "es" ? "Enviar recordatorios de exámenes programados" : "Send scheduled exam reminders"}</li>
              <li>{language === "es" ? "Mejorar nuestro contenido y experiencia de usuario" : "Improve our content and user experience"}</li>
              <li>{language === "es" ? "Comunicarnos con usted sobre actualizaciones del servicio" : "Communicate with you about service updates"}</li>
              <li>{language === "es" ? "Responder a consultas de soporte" : "Respond to support inquiries"}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "4. Compartición de Datos" : "4. Data Sharing"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "NO vendemos su información personal. Podemos compartir datos con:"
                : "We do NOT sell your personal information. We may share data with:"}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                <strong>Stripe:</strong> {language === "es" 
                  ? "Para procesar pagos de forma segura"
                  : "For secure payment processing"}
              </li>
              <li>
                <strong>Resend:</strong> {language === "es"
                  ? "Para enviar correos electrónicos transaccionales (por ejemplo, restablecimiento de contraseña)"
                  : "For sending transactional emails (e.g. password resets)"}
              </li>
              <li>
                <strong>{language === "es" ? "Requisitos Legales" : "Legal Requirements"}:</strong> {language === "es"
                  ? "Si la ley lo requiere o para proteger nuestros derechos"
                  : "If required by law or to protect our rights"}
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "5. Seguridad de Datos" : "5. Data Security"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "Implementamos medidas de seguridad estándar de la industria incluyendo:"
                : "We implement industry-standard security measures including:"}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{language === "es" ? "Cifrado HTTPS para toda la transmisión de datos" : "HTTPS encryption for all data transmission"}</li>
              <li>{language === "es" ? "Almacenamiento seguro de bases de datos con acceso restringido" : "Secure database storage with restricted access"}</li>
              <li>{language === "es" ? "Gestión de sesiones con tokens seguros" : "Session management with secure tokens"}</li>
              <li>{language === "es" ? "Procesamiento de pagos compatible con PCI a través de Stripe" : "PCI-compliant payment processing through Stripe"}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "6. Retención de Datos" : "6. Data Retention"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "Conservamos sus datos mientras su cuenta esté activa. Tras la eliminación de la cuenta:"
                : "We retain your data for as long as your account is active. Upon account deletion:"}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{language === "es" ? "Los datos personales se eliminan en un plazo de 30 días" : "Personal data is deleted within 30 days"}</li>
              <li>{language === "es" ? "Los registros de pago se conservan según lo requiera la ley (típicamente 7 años)" : "Payment records are retained as required by law (typically 7 years)"}</li>
              <li>{language === "es" ? "Los datos de uso anonimizados pueden conservarse con fines analíticos" : "Anonymized usage data may be retained for analytics purposes"}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "7. Sus Derechos" : "7. Your Rights"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es" ? "Usted tiene derecho a:" : "You have the right to:"}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{language === "es" ? "Acceder a sus datos personales" : "Access your personal data"}</li>
              <li>{language === "es" ? "Corregir información inexacta" : "Correct inaccurate information"}</li>
              <li>{language === "es" ? "Solicitar la eliminación de sus datos" : "Request deletion of your data"}</li>
              <li>{language === "es" ? "Exportar sus datos en un formato portable" : "Export your data in a portable format"}</li>
              <li>{language === "es" ? "Cancelar su suscripción en cualquier momento" : "Cancel your subscription at any time"}</li>
            </ul>
            <p className="text-muted-foreground">
              {language === "es"
                ? "Para ejercer estos derechos, contáctenos en Support@LBSconnect.net."
                : "To exercise these rights, contact us at Support@LBSconnect.net."}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "8. Cookies y Tecnologías de Seguimiento" : "8. Cookies and Tracking Technologies"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "Usamos cookies esenciales para:"
                : "We use essential cookies for:"}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{language === "es" ? "Mantener su sesión iniciada" : "Keeping you logged in"}</li>
              <li>{language === "es" ? "Recordar sus preferencias de idioma" : "Remembering your language preferences"}</li>
              <li>{language === "es" ? "Configuración de tema (claro/oscuro)" : "Theme settings (light/dark)"}</li>
            </ul>
            <p className="text-muted-foreground">
              {language === "es"
                ? "No usamos cookies de seguimiento de terceros con fines publicitarios."
                : "We do not use third-party tracking cookies for advertising purposes."}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "9. Privacidad de Menores" : "9. Children's Privacy"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "Nuestro Servicio está destinado a usuarios de 18 años o más que se preparan para exámenes de licencias profesionales de Texas. No recopilamos intencionalmente información de menores de 18 años. Si cree que hemos recopilado datos de un menor, contáctenos inmediatamente."
                : "Our Service is intended for users 18 years or older who are preparing for Texas professional licensing exams. We do not knowingly collect information from anyone under 18. If you believe we have collected data from a minor, please contact us immediately."}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "10. Residentes de Texas - Derechos de Privacidad" : "10. Texas Residents - Privacy Rights"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "Bajo la Ley de Privacidad de Datos de Texas (TDPSA), los residentes de Texas tienen derechos adicionales:"
                : "Under the Texas Data Privacy and Security Act (TDPSA), Texas residents have additional rights:"}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{language === "es" ? "Derecho a saber qué datos personales recopilamos" : "Right to know what personal data we collect"}</li>
              <li>{language === "es" ? "Derecho a eliminar datos personales" : "Right to delete personal data"}</li>
              <li>{language === "es" ? "Derecho a corregir inexactitudes" : "Right to correct inaccuracies"}</li>
              <li>{language === "es" ? "Derecho a optar por no participar en publicidad dirigida (no participamos en esto)" : "Right to opt out of targeted advertising (we don't engage in this)"}</li>
              <li>{language === "es" ? "Derecho a no discriminación por ejercer derechos de privacidad" : "Right to non-discrimination for exercising privacy rights"}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "11. Cambios a Esta Política" : "11. Changes to This Policy"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "Podemos actualizar esta Política de Privacidad periódicamente. Le notificaremos los cambios materiales publicando la nueva política en nuestro sitio y actualizando la fecha de \"Última actualización\". Se recomienda revisar esta política periódicamente."
                : "We may update this Privacy Policy periodically. We will notify you of material changes by posting the new policy on our site and updating the \"Last Updated\" date. You are advised to review this policy periodically."}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "12. Contáctenos" : "12. Contact Us"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "Si tiene preguntas sobre esta Política de Privacidad o nuestras prácticas de datos, contáctenos:"
                : "If you have questions about this Privacy Policy or our data practices, contact us:"}
            </p>
            <ul className="list-none text-muted-foreground space-y-1">
              <li><strong>{language === "es" ? "MyEasyPass, operado por LBS, LLC" : "MyEasyPass, operated by LBS, LLC"}</strong></li>
              <li>{language === "es" ? "Correo electrónico" : "Email"}: Support@LBSconnect.net</li>
              <li>{language === "es" ? "Teléfono" : "Phone"}: 281-836-5357</li>
              <li>{language === "es" ? "Ubicación" : "Location"}: 616 FM 1960 RD W STE 101, Houston, TX 77090-3048</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}