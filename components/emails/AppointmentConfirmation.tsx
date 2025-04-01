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

interface AppointmentConfirmationProps {
  expertName: string;
  clientName: string;
  appointmentDate: string;
  appointmentDuration: string;
  eventTitle: string;
  meetLink?: string;
  notes?: string;
}

export const AppointmentConfirmation = ({
  expertName,
  clientName,
  appointmentDate,
  appointmentDuration,
  eventTitle,
  meetLink,
  notes,
}: AppointmentConfirmationProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your Eleva.care appointment has been confirmed</Preview>
      <Tailwind>
        <Body className="bg-gray-100 py-[40px] font-sans">
          <Container className="mx-auto max-w-[600px] rounded-[8px] bg-white p-[24px]">
            <Section>
              <Text className="text-center text-[24px] font-bold text-[#4F46E5]">Eleva.care</Text>
              <Heading className="my-[24px] text-center text-[20px] font-bold text-gray-800">
                Your appointment has been confirmed
              </Heading>
            </Section>

            <Section className="my-[24px] rounded-[8px] bg-[#F9FAFB] p-[20px]">
              <Row>
                <Column>
                  <Text className="m-0 text-[16px] font-bold text-gray-800">{appointmentDate}</Text>
                  <Text className="m-0 text-[16px] text-gray-600">
                    Duration: {appointmentDuration}
                  </Text>
                </Column>
              </Row>
            </Section>

            <Section>
              <Text className="text-[16px] text-gray-800">Dear {expertName},</Text>
              <Text className="text-[16px] text-gray-800">
                You have a new appointment with <strong>{clientName}</strong> for{' '}
                <strong>{eventTitle}</strong>. We&apos;ve added this to your calendar.
              </Text>

              <Text className="mb-[8px] mt-[24px] text-[16px] font-bold text-gray-800">
                Appointment Details:
              </Text>

              <Section className="my-[16px] border-l-[4px] border-[#4F46E5] pl-[16px]">
                <Text className="m-0 text-[16px] text-gray-800">
                  <strong>Type:</strong> {eventTitle}
                </Text>
                <Text className="m-0 text-[16px] text-gray-800">
                  <strong>Client:</strong> {clientName}
                </Text>
                <Text className="m-0 text-[16px] text-gray-800">
                  <strong>Date/Time:</strong> {appointmentDate}
                </Text>
                <Text className="m-0 text-[16px] text-gray-800">
                  <strong>Duration:</strong> {appointmentDuration}
                </Text>
                {meetLink && (
                  <Text className="m-0 text-[16px] text-gray-800">
                    <strong>Video Meeting:</strong> Available in calendar invite
                  </Text>
                )}
              </Section>

              {notes && (
                <Section className="my-[16px] rounded-[8px] bg-[#F9FAFB] p-[16px]">
                  <Text className="m-0 text-[14px] font-bold text-gray-800">Client Notes:</Text>
                  <Text className="m-0 text-[14px] text-gray-700">{notes}</Text>
                </Section>
              )}

              {meetLink && (
                <Section className="my-[32px] text-center">
                  <Button
                    className="box-border rounded-[4px] bg-[#4F46E5] px-[24px] py-[12px] text-center font-bold text-white no-underline"
                    href={meetLink}
                  >
                    Join Google Meet
                  </Button>
                </Section>
              )}

              <Hr className="my-[24px] border-t border-gray-300" />

              <Text className="text-[16px] text-gray-800">
                This appointment has been added to your Google Calendar with the following
                reminders:
              </Text>

              <ul>
                <Text className="text-[14px] text-gray-700">• Email reminder 1 hour before</Text>
                <Text className="text-[14px] text-gray-700">
                  • Email reminder 15 minutes before
                </Text>
                <Text className="text-[14px] text-gray-700">• Popup reminder 5 minutes before</Text>
              </ul>

              <Text className="mt-[24px] text-[16px] text-gray-800">
                Thank you for using Eleva.care.
              </Text>

              <Text className="text-[16px] text-gray-800">
                Best regards,
                <br />
                The Eleva.care Team
              </Text>
            </Section>

            <Hr className="my-[24px] border-t border-gray-300" />

            <Section>
              <Text className="text-center text-[12px] text-gray-500">
                © {new Date().getFullYear()} Eleva.care. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AppointmentConfirmation;
