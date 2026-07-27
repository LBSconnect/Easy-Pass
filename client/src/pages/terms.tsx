import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useTranslation } from "react-i18next";

export default function TermsPage() {
  const { i18n } = useTranslation();
  const language = i18n.language;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8" data-testid="heading-terms">
          {language === "es" ? "Términos de Servicio" : "Terms of Service"}
        </h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            {language === "es" 
              ? "Última actualización: 15 de enero de 2026"
              : "Last Updated: January 15, 2026"}
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "1. Aceptación de los Términos" : "1. Acceptance of Terms"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "Al acceder y utilizar MyEasyPass (el \"Servicio\"), propiedad de y operado por LBS, LLC (\"nosotros\", \"nos\" o \"nuestro\"), usted acepta estar sujeto a estos Términos de Servicio. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al Servicio. MyEasyPass es una plataforma de preparación para exámenes de licencias de Texas que ofrece materiales de práctica para exámenes de Bienes Raíces, Seguros de Propiedad y Accidentes, Seguros de Vida y Líneas Generales."
                : "By accessing and using MyEasyPass (the \"Service\"), owned and operated by LBS, LLC (\"we,\" \"us,\" or \"our\"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the Service. MyEasyPass is a Texas licensing exam preparation platform offering practice materials for Real Estate, Property & Casualty Insurance, Life Insurance, and General Lines Insurance exams."}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "2. Descripción del Servicio" : "2. Description of Service"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "MyEasyPass proporciona:"
                : "MyEasyPass provides:"}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{language === "es" ? "Exámenes de práctica cronometrados para licencias de Texas" : "Timed practice exams for Texas licensing"}</li>
              <li>{language === "es" ? "Guías de estudio interactivas con seguimiento de progreso" : "Interactive study guides with progress tracking"}</li>
              <li>{language === "es" ? "Modo de práctica (50 preguntas/90 minutos) y modo de examen completo" : "Practice mode (50 questions/90 minutes) and full mock exam mode"}</li>
              <li>{language === "es" ? "Resultados instantáneos con desglose de rendimiento por tema" : "Instant results with topic-based performance breakdown"}</li>
              <li>{language === "es" ? "Certificados compartibles al aprobar exámenes" : "Shareable certificates upon exam completion"}</li>
              <li>{language === "es" ? "Soporte bilingüe (Inglés/Español)" : "Bilingual support (English/Spanish)"}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "3. Cuentas de Usuario" : "3. User Accounts"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "Para acceder a ciertas funciones del Servicio, debe crear una cuenta con su correo electrónico y contraseña. Usted es responsable de mantener la confidencialidad de su cuenta y de todas las actividades que ocurran bajo su cuenta. Debe notificarnos inmediatamente sobre cualquier uso no autorizado de su cuenta."
                : "To access certain features of the Service, you must create an account with your email address and password. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account."}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "4. Suscripciones y Pagos" : "4. Subscriptions and Payments"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "MyEasyPass ofrece los siguientes planes de suscripción:"
                : "MyEasyPass offers the following subscription plans:"}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{language === "es" ? "Plan Semanal: $6.99 por semana" : "Weekly Plan: $6.99 per week"}</li>
              <li>{language === "es" ? "Plan Mensual: $19.99 por mes" : "Monthly Plan: $19.99 per month"}</li>
            </ul>
            <p className="text-muted-foreground">
              {language === "es"
                ? "Todos los pagos se procesan de forma segura a través de Stripe. Las suscripciones se renuevan automáticamente hasta que las cancele. Puede cancelar su suscripción en cualquier momento a través de su página de perfil. No se ofrecen reembolsos por períodos de suscripción parciales."
                : "All payments are securely processed through Stripe. Subscriptions automatically renew until you cancel. You may cancel your subscription at any time through your profile page. No refunds are offered for partial subscription periods."}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "5. Uso Aceptable" : "5. Acceptable Use"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es" ? "Usted acepta no:" : "You agree not to:"}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{language === "es" ? "Compartir credenciales de cuenta con terceros" : "Share account credentials with third parties"}</li>
              <li>{language === "es" ? "Copiar, distribuir o reproducir el contenido del examen" : "Copy, distribute, or reproduce exam content"}</li>
              <li>{language === "es" ? "Usar el Servicio para cualquier propósito ilegal" : "Use the Service for any unlawful purpose"}</li>
              <li>{language === "es" ? "Intentar acceder sin autorización a nuestros sistemas" : "Attempt unauthorized access to our systems"}</li>
              <li>{language === "es" ? "Interferir con el funcionamiento adecuado del Servicio" : "Interfere with the proper functioning of the Service"}</li>
              <li>{language === "es" ? "Presentar el contenido como preguntas reales de exámenes de licencias de Texas" : "Represent content as actual Texas licensing exam questions"}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "6. Propiedad Intelectual" : "6. Intellectual Property"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "Todo el contenido del Servicio, incluyendo pero no limitado a texto, gráficos, logotipos, preguntas de exámenes y software, es propiedad de LBS, LLC o sus licenciantes y está protegido por las leyes de propiedad intelectual. No puede usar, reproducir o distribuir ningún contenido sin nuestro consentimiento previo por escrito."
                : "All content on the Service, including but not limited to text, graphics, logos, exam questions, and software, is the property of LBS, LLC or its licensors and is protected by intellectual property laws. You may not use, reproduce, or distribute any content without our prior written consent."}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "7. Descargo de Responsabilidad" : "7. Disclaimer"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "MyEasyPass es una herramienta de preparación para exámenes y NO garantiza que aprobará su examen de licencia de Texas. Nuestros materiales de práctica están diseñados para ayudarlo a prepararse, pero los resultados reales del examen dependen de muchos factores. Las preguntas de práctica son representativas del contenido del examen pero pueden no reflejar las preguntas exactas de los exámenes oficiales de licencias de Texas."
                : "MyEasyPass is an exam preparation tool and does NOT guarantee that you will pass your Texas licensing exam. Our practice materials are designed to help you prepare, but actual exam results depend on many factors. Practice questions are representative of exam content but may not reflect exact questions on official Texas licensing exams."}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "8. Limitación de Responsabilidad" : "8. Limitation of Liability"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "En la máxima medida permitida por la ley, LBS, LLC no será responsable de ningún daño indirecto, incidental, especial, consecuente o punitivo, incluyendo pérdida de ganancias, datos u otras pérdidas intangibles, que resulten de su uso o incapacidad de usar el Servicio."
                : "To the maximum extent permitted by law, LBS, LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or other intangible losses, resulting from your use or inability to use the Service."}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "9. Cambios en los Términos" : "9. Changes to Terms"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "Nos reservamos el derecho de modificar estos términos en cualquier momento. Le notificaremos los cambios materiales publicando los nuevos términos en el Servicio. Su uso continuado del Servicio después de dichos cambios constituye su aceptación de los nuevos términos."
                : "We reserve the right to modify these terms at any time. We will notify you of material changes by posting the new terms on the Service. Your continued use of the Service after such changes constitutes your acceptance of the new terms."}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "10. Ley Aplicable" : "10. Governing Law"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "Estos Términos se regirán e interpretarán de acuerdo con las leyes del Estado de Texas, sin tener en cuenta sus disposiciones sobre conflictos de leyes. Cualquier disputa que surja de estos Términos se resolverá en los tribunales ubicados en Houston, Texas."
                : "These Terms shall be governed by and construed in accordance with the laws of the State of Texas, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved in courts located in Houston, Texas."}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {language === "es" ? "11. Información de Contacto" : "11. Contact Information"}
            </h2>
            <p className="text-muted-foreground">
              {language === "es"
                ? "Si tiene alguna pregunta sobre estos Términos de Servicio, contáctenos:"
                : "If you have any questions about these Terms of Service, please contact us:"}
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