import { Button, Container, Heading, Section, Text } from '@react-email/components';
import React from 'react';

// Types for props
interface EmailContentProps {
  scenario: {
    name: string;
    locale: 'en' | 'es' | 'pt' | 'pt-BR';
    userRole: 'patient' | 'expert' | 'admin';
    darkMode: boolean;
    highContrast: boolean;
    variant: string;
    testAddress: string;
  };
  contentType: string;
  userName: string;
}

// Localized text content
const localizedTexts = {
  welcome: {
    title: {
      en: 'Welcome to Eleva Care, {userName}!',
      es: '¡Bienvenido a Eleva Care, {userName}!',
      pt: 'Bem-vindo ao Eleva Care, {userName}!',
      'pt-BR': 'Bem-vindo ao Eleva Care, {userName}!',
    },
    intro: {
      en: "We're excited to have you join our community of healthcare excellence. Your journey to better health starts here.",
      es: 'Estamos emocionados de tenerte en nuestra comunidad de excelencia en salud. Tu viaje hacia una mejor salud comienza aquí.',
      pt: 'Estamos entusiasmados por tê-lo na nossa comunidade de excelência em saúde. A sua jornada para uma melhor saúde começa aqui.',
      'pt-BR':
        'Estamos empolgados em tê-lo em nossa comunidade de excelência em saúde. Sua jornada para uma melhor saúde começa aqui.',
    },
    whatsNext: {
      en: "What's Next?",
      es: '¿Qué sigue?',
      pt: 'O que se segue?',
      'pt-BR': 'O que vem a seguir?',
    },
    steps: {
      en: [
        'Complete your health profile',
        'Browse our expert healthcare providers',
        'Schedule your first consultation',
      ],
      es: [
        'Completa tu perfil de salud',
        'Explora nuestros expertos en salud',
        'Programa tu primera consulta',
      ],
      pt: [
        'Complete o seu perfil de saúde',
        'Explore os nossos especialistas em saúde',
        'Agende a sua primeira consulta',
      ],
      'pt-BR': [
        'Complete seu perfil de saúde',
        'Explore nossos especialistas em saúde',
        'Agende sua primeira consulta',
      ],
    },
    button: {
      en: 'Get Started →',
      es: 'Comenzar →',
      pt: 'Começar →',
      'pt-BR': 'Começar →',
    },
  },
  expert: {
    title: {
      en: 'New Consultation Request',
      es: 'Nueva Solicitud de Consulta',
      pt: 'Nova Solicitação de Consulta',
      'pt-BR': 'Nova Solicitação de Consulta',
    },
    patientDetails: {
      en: 'Patient Details:',
      es: 'Detalles del Paciente:',
      pt: 'Detalhes do Paciente:',
      'pt-BR': 'Detalhes do Paciente:',
    },
    description: {
      en: 'The patient has specifically requested your expertise based on your specialization in stress management and mental wellness.',
      es: 'El paciente ha solicitado específicamente tu experiencia basada en tu especialización en manejo del estrés y bienestar mental.',
      pt: 'O paciente solicitou especificamente a sua expertise baseada na sua especialização em gestão de stress e bem-estar mental.',
      'pt-BR':
        'O paciente solicitou especificamente sua expertise baseada em sua especialização em gestão de stress e bem-estar mental.',
    },
    button: {
      en: 'View Request →',
      es: 'Ver Solicitud →',
      pt: 'Ver Solicitação →',
      'pt-BR': 'Ver Solicitação →',
    },
  },
  appointment: {
    title: {
      en: 'Appointment Reminder',
      es: 'Recordatorio de Cita',
      pt: 'Lembrete de Consulta',
      'pt-BR': 'Lembrete de Consulta',
    },
    tomorrow: {
      en: 'Tomorrow at 10:00 AM',
      es: 'Mañana a las 10:00',
      pt: 'Amanhã às 10:00',
      'pt-BR': 'Amanhã às 10:00',
    },
    preparation: {
      en: 'Preparation Tips:',
      es: 'Consejos de Preparación:',
      pt: 'Dicas de Preparação:',
      'pt-BR': 'Dicas de Preparação:',
    },
    tips: {
      en: [
        'Test your camera and microphone 10 minutes before',
        'Find a quiet, private space',
        'Have your health records ready',
        "Prepare any questions you'd like to discuss",
      ],
      es: [
        'Prueba tu cámara y micrófono 10 minutos antes',
        'Encuentra un lugar silencioso y privado',
        'Ten tus registros médicos listos',
        'Prepara cualquier pregunta que quieras discutir',
      ],
      pt: [
        'Teste a sua câmara e microfone 10 minutos antes',
        'Encontre um espaço silencioso e privado',
        'Tenha os seus registos de saúde prontos',
        'Prepare qualquer pergunta que gostaria de discutir',
      ],
      'pt-BR': [
        'Teste sua câmera e microfone 10 minutos antes',
        'Encontre um espaço silencioso e privado',
        'Tenha seus registros de saúde prontos',
        'Prepare qualquer pergunta que gostaria de discutir',
      ],
    },
    button: {
      en: 'Join Consultation →',
      es: 'Unirse a la Consulta →',
      pt: 'Juntar-se à Consulta →',
      'pt-BR': 'Participar da Consulta →',
    },
  },
  admin: {
    title: {
      en: 'System Alert: High Contrast Mode',
      es: 'Alerta del Sistema: Modo de Alto Contraste',
      pt: 'Alerta do Sistema: Modo de Alto Contraste',
      'pt-BR': 'Alerta do Sistema: Modo de Alto Contraste',
    },
    testResults: {
      en: 'Accessibility Test Results:',
      es: 'Resultados de Pruebas de Accesibilidad:',
      pt: 'Resultados dos Testes de Acessibilidade:',
      'pt-BR': 'Resultados dos Testes de Acessibilidade:',
    },
    description: {
      en: 'This email demonstrates the high contrast accessibility features working correctly for users with visual impairments.',
      es: 'Este email demuestra las características de accesibilidad de alto contraste funcionando correctamente para usuarios con discapacidades visuales.',
      pt: 'Este email demonstra as características de acessibilidade de alto contraste a funcionar corretamente para utilizadores com deficiências visuais.',
      'pt-BR':
        'Este email demonstra as características de acessibilidade de alto contraste funcionando corretamente para usuários com deficiências visuais.',
    },
  },
  payment: {
    title: {
      en: 'Payment Confirmed',
      es: 'Pago Confirmado',
      pt: 'Pagamento Confirmado',
      'pt-BR': 'Pagamento Confirmado',
    },
    success: {
      en: 'Transaction Successful',
      es: 'Transacción Exitosa',
      pt: 'Transação Bem-sucedida',
      'pt-BR': 'Transação Bem-sucedida',
    },
    description: {
      en: "Your consultation is now confirmed. You'll receive a calendar invitation shortly.",
      es: 'Tu consulta está ahora confirmada. Recibirás una invitación de calendario en breve.',
      pt: 'A sua consulta está agora confirmada. Receberá um convite de calendário em breve.',
      'pt-BR':
        'Sua consulta está agora confirmada. Você receberá um convite de calendário em breve.',
    },
  },
  bounce: {
    title: {
      en: 'Bounce Test Email',
      es: 'Email de Prueba de Rebote',
      pt: 'Email de Teste de Rejeição',
      'pt-BR': 'Email de Teste de Rejeição',
    },
    testing: {
      en: 'Testing Email Delivery',
      es: 'Probando Entrega de Email',
      pt: 'Testando Entrega de Email',
      'pt-BR': 'Testando Entrega de Email',
    },
  },
  spam: {
    title: {
      en: 'Marketing Email - Spam Test',
      es: 'Email de Marketing - Prueba de Spam',
      pt: 'Email de Marketing - Teste de Spam',
      'pt-BR': 'Email de Marketing - Teste de Spam',
    },
    simulation: {
      en: 'Spam Simulation',
      es: 'Simulación de Spam',
      pt: 'Simulação de Spam',
      'pt-BR': 'Simulação de Spam',
    },
  },
};

// Helper function to replace placeholders
const replacePlaceholders = (text: string, userName: string): string => {
  return text.replace('{userName}', userName);
};

// Welcome Email Component
export const WelcomeEmailContent: React.FC<EmailContentProps> = ({ scenario, userName }) => {
  const texts = localizedTexts.welcome;
  const locale = scenario.locale;

  return (
    <Container style={{ padding: '32px 0' }}>
      <Heading style={{ color: '#006D77', fontSize: '28px', marginBottom: '16px' }}>
        {replacePlaceholders(texts.title[locale], userName)}
      </Heading>
      <Text style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>
        {texts.intro[locale]}
      </Text>
      <Section
        style={{ background: '#F7F9F9', padding: '24px', borderRadius: '8px', margin: '24px 0' }}
      >
        <Heading as="h3" style={{ color: '#006D77', marginBottom: '12px' }}>
          {texts.whatsNext[locale]}
        </Heading>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          {texts.steps[locale].map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ul>
      </Section>
      <Button
        href="https://eleva-care.com/dashboard"
        style={{
          background: '#006D77',
          color: 'white',
          padding: '12px 24px',
          textDecoration: 'none',
          borderRadius: '6px',
          display: 'inline-block',
        }}
      >
        {texts.button[locale]}
      </Button>
    </Container>
  );
};

// Expert Email Component
export const ExpertEmailContent: React.FC<EmailContentProps> = ({ scenario }) => {
  const texts = localizedTexts.expert;
  const locale = scenario.locale;

  return (
    <Container style={{ padding: '32px 0' }}>
      <Heading style={{ color: '#006D77', fontSize: '28px', marginBottom: '16px' }}>
        {texts.title[locale]}
      </Heading>
      <Section
        style={{
          background: '#E0FBFC',
          borderLeft: '4px solid #006D77',
          padding: '20px',
          margin: '20px 0',
        }}
      >
        <Heading as="h3" style={{ marginTop: 0 }}>
          {texts.patientDetails[locale]}
        </Heading>
        <Text>
          <strong>Name:</strong> Sarah Johnson
        </Text>
        <Text>
          <strong>Age:</strong> 34
        </Text>
        <Text>
          <strong>Condition:</strong> Stress management consultation
        </Text>
        <Text>
          <strong>Preferred Date:</strong> Tomorrow, 10:00 AM
        </Text>
      </Section>
      <Text>{texts.description[locale]}</Text>
      <Button
        href="https://eleva-care.com/expert/consultations"
        style={{
          background: '#006D77',
          color: 'white',
          padding: '12px 24px',
          textDecoration: 'none',
          borderRadius: '6px',
          display: 'inline-block',
        }}
      >
        {texts.button[locale]}
      </Button>
    </Container>
  );
};

// Appointment Email Component
export const AppointmentEmailContent: React.FC<EmailContentProps> = ({ scenario }) => {
  const texts = localizedTexts.appointment;
  const locale = scenario.locale;

  return (
    <Container style={{ padding: '32px 0' }}>
      <Heading style={{ color: '#006D77', fontSize: '28px', marginBottom: '16px' }}>
        {texts.title[locale]}
      </Heading>
      <Section
        style={{
          background: 'linear-gradient(135deg, #FFD23F, #F0C814)',
          padding: '24px',
          borderRadius: '12px',
          margin: '24px 0',
          color: '#333',
        }}
      >
        <Heading as="h3" style={{ marginTop: 0, color: '#333' }}>
          📅 {texts.tomorrow[locale]}
        </Heading>
        <Text style={{ margin: '8px 0', color: '#333' }}>
          <strong>Expert:</strong> Dr. Maria Silva
        </Text>
        <Text style={{ margin: '8px 0', color: '#333' }}>
          <strong>Specialization:</strong> Mental Health & Wellness
        </Text>
        <Text style={{ margin: '8px 0', color: '#333' }}>
          <strong>Duration:</strong> 45 minutes
        </Text>
        <Text style={{ margin: '8px 0', color: '#333' }}>
          <strong>Type:</strong> Video consultation
        </Text>
      </Section>
      <Heading as="h3">{texts.preparation[locale]}</Heading>
      <ul>
        {texts.tips[locale].map((tip, index) => (
          <li key={index}>{tip}</li>
        ))}
      </ul>
      <Button
        href="https://eleva-care.com/appointments/join"
        style={{
          background: '#006D77',
          color: 'white',
          padding: '12px 24px',
          textDecoration: 'none',
          borderRadius: '6px',
          display: 'inline-block',
        }}
      >
        {texts.button[locale]}
      </Button>
    </Container>
  );
};

// Admin Email Component
export const AdminEmailContent: React.FC<EmailContentProps> = ({ scenario }) => {
  const texts = localizedTexts.admin;
  const locale = scenario.locale;

  return (
    <Container style={{ padding: '32px 0' }}>
      <Heading
        style={{
          color: scenario.highContrast ? '#000000' : '#006D77',
          fontSize: '28px',
          marginBottom: '16px',
          fontWeight: scenario.highContrast ? 'bold' : 'normal',
        }}
      >
        {texts.title[locale]}
      </Heading>
      <Section
        style={{
          background: scenario.highContrast ? '#FFFFFF' : '#F7F9F9',
          border: scenario.highContrast ? '3px solid #000000' : 'none',
          padding: '24px',
          margin: '24px 0',
        }}
      >
        <Heading
          as="h3"
          style={{
            color: scenario.highContrast ? '#000000' : '#006D77',
            marginTop: 0,
            fontWeight: scenario.highContrast ? 'bold' : 'normal',
          }}
        >
          {texts.testResults[locale]}
        </Heading>
        <Text
          style={{
            color: scenario.highContrast ? '#000000' : 'inherit',
            fontWeight: scenario.highContrast ? 'bold' : 'normal',
          }}
        >
          ✅ High contrast colors: PASSED
        </Text>
        <Text
          style={{
            color: scenario.highContrast ? '#000000' : 'inherit',
            fontWeight: scenario.highContrast ? 'bold' : 'normal',
          }}
        >
          ✅ Font weight increased: PASSED
        </Text>
        <Text
          style={{
            color: scenario.highContrast ? '#000000' : 'inherit',
            fontWeight: scenario.highContrast ? 'bold' : 'normal',
          }}
        >
          ✅ Border emphasis: PASSED
        </Text>
        <Text
          style={{
            color: scenario.highContrast ? '#000000' : 'inherit',
            fontWeight: scenario.highContrast ? 'bold' : 'normal',
          }}
        >
          ✅ WCAG 2.1 AA compliance: PASSED
        </Text>
      </Section>
      <Text
        style={{
          color: scenario.highContrast ? '#000000' : 'inherit',
          fontWeight: scenario.highContrast ? 'bold' : 'normal',
        }}
      >
        {texts.description[locale]}
      </Text>
    </Container>
  );
};

// Payment Email Component
export const PaymentEmailContent: React.FC<EmailContentProps> = ({ scenario }) => {
  const texts = localizedTexts.payment;
  const locale = scenario.locale;

  return (
    <Container style={{ padding: '32px 0' }}>
      <Heading style={{ color: '#006D77', fontSize: '24px', marginBottom: '16px' }}>
        {texts.title[locale]}
      </Heading>
      <Section
        style={{
          background: '#E8F5E8',
          borderLeft: '4px solid #28A745',
          padding: '20px',
          margin: '20px 0',
        }}
      >
        <Heading as="h3" style={{ color: '#28A745', marginTop: 0 }}>
          ✅ {texts.success[locale]}
        </Heading>
        <Text>
          <strong>Amount:</strong> €45.00
        </Text>
        <Text>
          <strong>Service:</strong> Mental Health Consultation
        </Text>
        <Text>
          <strong>Expert:</strong> Dr. Maria Silva
        </Text>
        <Text>
          <strong>Transaction ID:</strong> TXN-2024-001234
        </Text>
        <Text>
          <strong>Date:</strong> {new Date().toLocaleDateString()}
        </Text>
      </Section>
      <Text>{texts.description[locale]}</Text>
    </Container>
  );
};

// Bounce Email Component
export const BounceEmailContent: React.FC<EmailContentProps> = ({ scenario }) => {
  const texts = localizedTexts.bounce;
  const locale = scenario.locale;

  return (
    <Container style={{ padding: '32px 0' }}>
      <Heading style={{ color: '#006D77', fontSize: '24px', marginBottom: '16px' }}>
        {texts.title[locale]}
      </Heading>
      <Section
        style={{
          background: '#FFF3CD',
          borderLeft: '4px solid #856404',
          padding: '20px',
          margin: '20px 0',
        }}
      >
        <Heading as="h3" style={{ color: '#856404', marginTop: 0 }}>
          ⚠️ {texts.testing[locale]}
        </Heading>
        <Text>
          This email is sent to <code>bounced@resend.dev</code> to simulate a hard bounce scenario.
        </Text>
        <Text>
          <strong>Expected Result:</strong> This email will bounce with SMTP 550 5.1.1
          (&quot;Unknown User&quot;) response.
        </Text>
        <Text>
          <strong>Use Case:</strong> Testing bounce handling in our application.
        </Text>
      </Section>
    </Container>
  );
};

// Spam Email Component
export const SpamEmailContent: React.FC<EmailContentProps> = ({ scenario }) => {
  const texts = localizedTexts.spam;
  const locale = scenario.locale;

  return (
    <Container style={{ padding: '32px 0' }}>
      <Heading style={{ color: '#006D77', fontSize: '24px', marginBottom: '16px' }}>
        {texts.title[locale]}
      </Heading>
      <Section
        style={{
          background: '#F8D7DA',
          borderLeft: '4px solid #DC3545',
          padding: '20px',
          margin: '20px 0',
        }}
      >
        <Heading as="h3" style={{ color: '#DC3545', marginTop: 0 }}>
          🚨 {texts.simulation[locale]}
        </Heading>
        <Text>
          This email is sent to <code>complained@resend.dev</code> to simulate spam marking.
        </Text>
        <Text>
          <strong>Expected Result:</strong> This email will be received but marked as spam.
        </Text>
        <Text>
          <strong>Use Case:</strong> Testing spam handling and sender reputation management.
        </Text>
      </Section>
      <Text>🎉 AMAZING OFFERS! 💰 CLICK HERE FOR INSTANT SAVINGS! 🎁</Text>
      <Text>This content intentionally mimics spam patterns for testing purposes.</Text>
    </Container>
  );
};

// Helper function to get user name by locale and role
export const getUserName = (scenario: EmailContentProps['scenario']): string => {
  const userNames = {
    en: { patient: 'John Doe', expert: 'Dr. Maria Silva', admin: 'Admin Team' },
    es: { patient: 'Juan Pérez', expert: 'Dra. Maria Silva', admin: 'Equipo Admin' },
    pt: { patient: 'João Silva', expert: 'Dra. Maria Silva', admin: 'Equipa Admin' },
    'pt-BR': { patient: 'João Silva', expert: 'Dra. Maria Silva', admin: 'Equipe Admin' },
  };

  return userNames[scenario.locale][scenario.userRole];
};

// Main content component that routes to the appropriate sub-component
export const EmailContent: React.FC<EmailContentProps> = (props) => {
  const { contentType } = props;

  switch (contentType) {
    case 'welcome':
      return <WelcomeEmailContent {...props} />;
    case 'expert':
      return <ExpertEmailContent {...props} />;
    case 'appointment':
      return <AppointmentEmailContent {...props} />;
    case 'admin':
      return <AdminEmailContent {...props} />;
    case 'payment':
      return <PaymentEmailContent {...props} />;
    case 'bounce':
      return <BounceEmailContent {...props} />;
    case 'spam':
      return <SpamEmailContent {...props} />;
    default:
      return <WelcomeEmailContent {...props} />;
  }
};
