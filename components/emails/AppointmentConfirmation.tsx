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
import { getTranslations } from 'next-intl/server';

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

export const AppointmentConfirmation = async ({
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
  // Get translations using next-intl server function
  const t = await getTranslations({
    locale,
    namespace: 'notifications.appointmentConfirmation.email',
  });

  return (
    <Html>
      <Head />
      <Preview>{t('preview')}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 py-[40px] font-sans">
          <Container className="mx-auto max-w-[600px] rounded-[8px] bg-white p-[24px]">
            <Section>
              <Text className="text-center text-[24px] font-bold text-[#4F46E5]">Eleva.care</Text>
              <Heading className="my-[24px] text-center text-[20px] font-bold text-gray-800">
                {t('appointmentConfirmed')}
              </Heading>
            </Section>

            <Section className="my-[24px] rounded-[8px] bg-[#F9FAFB] p-[20px]">
              <Row>
                <Column>
                  <Text className="m-0 text-[16px] font-bold text-gray-800">{appointmentDate}</Text>
                  <Text className="m-0 text-[16px] text-gray-600">{appointmentTime}</Text>
                  <Text className="m-0 text-[14px] text-gray-500">
                    {t('timezone')}: {timezone}
                  </Text>
                </Column>
              </Row>
            </Section>

            <Section>
              <Text className="text-[16px] text-gray-800">{t('dearExpert', { expertName })}</Text>
              <Text className="text-[16px] text-gray-800">
                {t('newAppointmentWith', { clientName, eventTitle })}
              </Text>

              <Text className="mb-[8px] mt-[24px] text-[16px] font-bold text-gray-800">
                {t('appointmentDetails')}
              </Text>

              <Section className="my-[16px] border-l-[4px] border-[#4F46E5] pl-[16px]">
                <Text className="m-0 text-[16px] text-gray-800">
                  <strong>{t('type')}</strong> {eventTitle}
                </Text>
                <Text className="m-0 text-[16px] text-gray-800">
                  <strong>{t('client')}</strong> {clientName}
                </Text>
                <Text className="m-0 text-[16px] text-gray-800">
                  <strong>{t('date')}</strong> {appointmentDate}
                </Text>
                <Text className="m-0 text-[16px] text-gray-800">
                  <strong>{t('time')}</strong> {appointmentTime}
                </Text>
                <Text className="m-0 text-[16px] text-gray-800">
                  <strong>{t('timezone')}</strong> {timezone}
                </Text>
                <Text className="m-0 text-[16px] text-gray-800">
                  <strong>{t('duration')}</strong> {appointmentDuration}
                </Text>
                {meetLink && (
                  <Text className="m-0 text-[16px] text-gray-800">
                    <strong>{t('videoMeeting')}</strong>
                  </Text>
                )}
              </Section>

              {notes && (
                <Section className="my-[16px] rounded-[8px] bg-[#F9FAFB] p-[16px]">
                  <Text className="m-0 text-[14px] font-bold text-gray-800">
                    {t('clientNotes')}
                  </Text>
                  <Text className="m-0 text-[14px] text-gray-700">{notes}</Text>
                </Section>
              )}

              {meetLink && (
                <Section className="my-[32px] text-center">
                  <Button
                    className="box-border rounded-[4px] bg-[#4F46E5] px-[24px] py-[12px] text-center font-bold text-white no-underline"
                    href={meetLink}
                  >
                    {t('joinGoogleMeet')}
                  </Button>
                  <Text className="mt-2 text-xs text-gray-500 text-muted-foreground">
                    {t('clickToJoin')}
                  </Text>
                </Section>
              )}

              <Hr className="my-[24px] border-t border-gray-300" />

              <Text className="text-[16px] text-gray-800">{t('addedToGoogleCalendar')}</Text>

              <ul>
                <Text className="text-[14px] text-gray-700">• {t('emailReminder1Hour')}</Text>
                <Text className="text-[14px] text-gray-700">• {t('emailReminder15Min')}</Text>
                <Text className="text-[14px] text-gray-700">• {t('popupReminder5Min')}</Text>
              </ul>

              <Text className="mt-[24px] text-[16px] text-gray-800">{t('thankYou')}</Text>

              <Text className="text-[16px] text-gray-800">
                {t('bestRegards')}
                <br />
                {t('team')}
              </Text>
            </Section>

            <Hr className="my-[24px] border-t border-gray-300" />

            <Section>
              <Text className="text-center text-[12px] text-gray-500">
                © {new Date().getFullYear()} Eleva.care. {t('allRightsReserved')}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AppointmentConfirmation;
