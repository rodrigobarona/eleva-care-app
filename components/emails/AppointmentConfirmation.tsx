import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

interface EmailTranslations {
  preview: string;
  appointmentConfirmed: string;
  dearExpert: string;
  newAppointmentWith: string;
  addedToCalendar: string;
  appointmentDetails: string;
  type: string;
  client: string;
  date: string;
  time: string;
  timezone: string;
  duration: string;
  videoMeeting: string;
  clientNotes: string;
  joinGoogleMeet: string;
  clickToJoin: string;
  addedToGoogleCalendar: string;
  calendarReminders: string;
  emailReminder1Hour: string;
  emailReminder15Min: string;
  popupReminder5Min: string;
  thankYou: string;
  bestRegards: string;
  team: string;
  allRightsReserved: string;
}

// Default English translations
const translations: Record<string, EmailTranslations> = {
  en: {
    preview: 'Your Eleva.care appointment has been confirmed',
    appointmentConfirmed: 'Your appointment has been confirmed',
    dearExpert: 'Dear',
    newAppointmentWith: 'You have a new appointment with',
    addedToCalendar: "We've added this to your calendar.",
    appointmentDetails: 'Appointment Details:',
    type: 'Type:',
    client: 'Client:',
    date: 'Date:',
    time: 'Time:',
    timezone: 'Timezone:',
    duration: 'Duration:',
    videoMeeting: 'Video Meeting: A Google Meet link is provided below',
    clientNotes: 'Client Notes:',
    joinGoogleMeet: 'Join Google Meet',
    clickToJoin: 'Click the button above to join the meeting at the scheduled time',
    addedToGoogleCalendar:
      'This appointment has been added to your Google Calendar with the following reminders:',
    calendarReminders: 'Calendar Reminders:',
    emailReminder1Hour: 'Email reminder 1 hour before',
    emailReminder15Min: 'Email reminder 15 minutes before',
    popupReminder5Min: 'Popup reminder 5 minutes before',
    thankYou: 'Thank you for using Eleva.care.',
    bestRegards: 'Best regards,',
    team: 'The Eleva.care Team',
    allRightsReserved: 'All rights reserved.',
  },
  es: {
    preview: 'Su cita de Eleva.care ha sido confirmada',
    appointmentConfirmed: 'Su cita ha sido confirmada',
    dearExpert: 'Estimado/a',
    newAppointmentWith: 'Tiene una nueva cita con',
    addedToCalendar: 'Hemos añadido esto a su calendario.',
    appointmentDetails: 'Detalles de la Cita:',
    type: 'Tipo:',
    client: 'Cliente:',
    date: 'Fecha:',
    time: 'Hora:',
    timezone: 'Zona Horaria:',
    duration: 'Duración:',
    videoMeeting: 'Reunión por Video: Se proporciona un enlace a Google Meet a continuación',
    clientNotes: 'Notas del Cliente:',
    joinGoogleMeet: 'Unirse a Google Meet',
    clickToJoin: 'Haga clic en el botón de arriba para unirse a la reunión a la hora programada',
    addedToGoogleCalendar:
      'Esta cita se ha añadido a su Google Calendar con los siguientes recordatorios:',
    calendarReminders: 'Recordatorios de Calendario:',
    emailReminder1Hour: 'Recordatorio por correo electrónico 1 hora antes',
    emailReminder15Min: 'Recordatorio por correo electrónico 15 minutos antes',
    popupReminder5Min: 'Recordatorio emergente 5 minutos antes',
    thankYou: 'Gracias por usar Eleva.care.',
    bestRegards: 'Saludos cordiales,',
    team: 'El Equipo de Eleva.care',
    allRightsReserved: 'Todos los derechos reservados.',
  },
  pt: {
    preview: 'Sua consulta na Eleva.care foi confirmada',
    appointmentConfirmed: 'Sua consulta foi confirmada',
    dearExpert: 'Caro(a)',
    newAppointmentWith: 'Você tem uma nova consulta com',
    addedToCalendar: 'Adicionamos isso ao seu calendário.',
    appointmentDetails: 'Detalhes da Consulta:',
    type: 'Tipo:',
    client: 'Cliente:',
    date: 'Data:',
    time: 'Hora:',
    timezone: 'Fuso Horário:',
    duration: 'Duração:',
    videoMeeting: 'Reunião por Vídeo: Um link do Google Meet é fornecido abaixo',
    clientNotes: 'Notas do Cliente:',
    joinGoogleMeet: 'Entrar no Google Meet',
    clickToJoin: 'Clique no botão acima para entrar na reunião no horário agendado',
    addedToGoogleCalendar:
      'Esta consulta foi adicionada ao seu Google Calendar com os seguintes lembretes:',
    calendarReminders: 'Lembretes de Calendário:',
    emailReminder1Hour: 'Lembrete por e-mail 1 hora antes',
    emailReminder15Min: 'Lembrete por e-mail 15 minutos antes',
    popupReminder5Min: 'Lembrete pop-up 5 minutos antes',
    thankYou: 'Obrigado por usar a Eleva.care.',
    bestRegards: 'Atenciosamente,',
    team: 'A Equipe Eleva.care',
    allRightsReserved: 'Todos os direitos reservados.',
  },
  br: {
    preview: 'Sua consulta na Eleva.care foi confirmada',
    appointmentConfirmed: 'Sua consulta foi confirmada',
    dearExpert: 'Caro(a)',
    newAppointmentWith: 'Você tem uma nova consulta com',
    addedToCalendar: 'Adicionamos isso ao seu calendário.',
    appointmentDetails: 'Detalhes da Consulta:',
    type: 'Tipo:',
    client: 'Cliente:',
    date: 'Data:',
    time: 'Hora:',
    timezone: 'Fuso Horário:',
    duration: 'Duração:',
    videoMeeting: 'Reunião por Vídeo: Um link do Google Meet é fornecido abaixo',
    clientNotes: 'Notas do Cliente:',
    joinGoogleMeet: 'Entrar no Google Meet',
    clickToJoin: 'Clique no botão acima para entrar na reunião no horário agendado',
    addedToGoogleCalendar:
      'Esta consulta foi adicionada ao seu Google Calendar com os seguintes lembretes:',
    calendarReminders: 'Lembretes de Calendário:',
    emailReminder1Hour: 'Lembrete por e-mail 1 hora antes',
    emailReminder15Min: 'Lembrete por e-mail 15 minutos antes',
    popupReminder5Min: 'Lembrete pop-up 5 minutos antes',
    thankYou: 'Obrigado por usar a Eleva.care.',
    bestRegards: 'Atenciosamente,',
    team: 'A Equipe Eleva.care',
    allRightsReserved: 'Todos os direitos reservados.',
  },
};

interface AppointmentConfirmationProps {
  expertName: string;
  clientName: string;
  appointmentDate: string;
  appointmentTime: string;
  timezone: string;
  appointmentDuration: string;
  eventTitle: string;
  meetLink?: string;
  notes?: string;
  locale?: string;
}

export const AppointmentConfirmation = ({
  expertName,
  clientName,
  appointmentDate,
  appointmentTime,
  timezone,
  appointmentDuration,
  eventTitle,
  meetLink,
  notes,
  locale = 'en',
}: AppointmentConfirmationProps) => {
  // Get translations for the specified locale or fallback to English
  const t = translations[locale] || translations.en;

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 py-[40px] font-sans">
          <Container className="mx-auto max-w-[600px] rounded-[8px] bg-white p-[24px]">
            <Section>
              <Text className="text-center text-[24px] font-bold text-[#4F46E5]">Eleva.care</Text>
              <Heading className="my-[24px] text-center text-[20px] font-bold text-gray-800">
                {t.appointmentConfirmed}
              </Heading>
            </Section>

            <Section className="my-[24px] rounded-[8px] bg-[#F9FAFB] p-[20px]">
              <Row>
                <Column>
                  <Text className="m-0 text-[16px] font-bold text-gray-800">{appointmentDate}</Text>
                  <Text className="m-0 text-[16px] text-gray-600">{appointmentTime}</Text>
                  <Text className="m-0 text-[14px] text-gray-500">
                    {t.timezone}: {timezone}
                  </Text>
                </Column>
              </Row>
            </Section>

            <Section>
              <Text className="text-[16px] text-gray-800">
                {t.dearExpert} {expertName},
              </Text>
              <Text className="text-[16px] text-gray-800">
                {t.newAppointmentWith} <strong>{clientName}</strong> for{' '}
                <strong>{eventTitle}</strong>. {t.addedToCalendar}
              </Text>

              <Text className="mb-[8px] mt-[24px] text-[16px] font-bold text-gray-800">
                {t.appointmentDetails}
              </Text>

              <Section className="my-[16px] border-l-[4px] border-[#4F46E5] pl-[16px]">
                <Text className="m-0 text-[16px] text-gray-800">
                  <strong>{t.type}</strong> {eventTitle}
                </Text>
                <Text className="m-0 text-[16px] text-gray-800">
                  <strong>{t.client}</strong> {clientName}
                </Text>
                <Text className="m-0 text-[16px] text-gray-800">
                  <strong>{t.date}</strong> {appointmentDate}
                </Text>
                <Text className="m-0 text-[16px] text-gray-800">
                  <strong>{t.time}</strong> {appointmentTime}
                </Text>
                <Text className="m-0 text-[16px] text-gray-800">
                  <strong>{t.timezone}</strong> {timezone}
                </Text>
                <Text className="m-0 text-[16px] text-gray-800">
                  <strong>{t.duration}</strong> {appointmentDuration}
                </Text>
                {meetLink && (
                  <Text className="m-0 text-[16px] text-gray-800">
                    <strong>{t.videoMeeting}</strong>
                  </Text>
                )}
              </Section>

              {notes && (
                <Section className="my-[16px] rounded-[8px] bg-[#F9FAFB] p-[16px]">
                  <Text className="m-0 text-[14px] font-bold text-gray-800">{t.clientNotes}</Text>
                  <Text className="m-0 text-[14px] text-gray-700">{notes}</Text>
                </Section>
              )}

              {meetLink && (
                <Section className="my-[32px] text-center">
                  <Button
                    className="box-border rounded-[4px] bg-[#4F46E5] px-[24px] py-[12px] text-center font-bold text-white no-underline"
                    href={meetLink}
                  >
                    {t.joinGoogleMeet}
                  </Button>
                  <Text className="mt-2 text-xs text-gray-500 text-muted-foreground">
                    {t.clickToJoin}
                  </Text>
                </Section>
              )}

              <Hr className="my-[24px] border-t border-gray-300" />

              <Text className="text-[16px] text-gray-800">{t.addedToGoogleCalendar}</Text>

              <ul>
                <Text className="text-[14px] text-gray-700">• {t.emailReminder1Hour}</Text>
                <Text className="text-[14px] text-gray-700">• {t.emailReminder15Min}</Text>
                <Text className="text-[14px] text-gray-700">• {t.popupReminder5Min}</Text>
              </ul>

              <Text className="mt-[24px] text-[16px] text-gray-800">{t.thankYou}</Text>

              <Text className="text-[16px] text-gray-800">
                {t.bestRegards}
                <br />
                {t.team}
              </Text>
            </Section>

            <Hr className="my-[24px] border-t border-gray-300" />

            <Section>
              <Text className="text-center text-[12px] text-gray-500">
                © {new Date().getFullYear()} Eleva.care. {t.allRightsReserved}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AppointmentConfirmation;
