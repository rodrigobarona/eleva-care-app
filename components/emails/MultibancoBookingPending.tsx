import { EmailFooter } from '@/lib/email-templates/components/EmailFooter';
import { EmailHeader } from '@/lib/email-templates/components/EmailHeader';
import { normalizeLocale } from '@/lib/email-templates/utils/translations';
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

interface MultibancoBookingPendingProps {
  customerName: string;
  expertName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  timezone: string;
  duration: number;
  multibancoEntity: string;
  multibancoReference: string;
  multibancoAmount: string;
  voucherExpiresAt: string;
  hostedVoucherUrl: string;
  customerNotes?: string;
  locale?: string;
}

export const MultibancoBookingPending = async ({
  customerName,
  expertName,
  serviceName,
  appointmentDate,
  appointmentTime,
  timezone,
  duration,
  multibancoEntity,
  multibancoReference,
  multibancoAmount,
  voucherExpiresAt,
  hostedVoucherUrl,
  customerNotes,
  locale = 'en',
}: MultibancoBookingPendingProps) => {
  const t = await getTranslations({
    locale,
    namespace: 'notifications.multibancoBookingPending.email',
  });

  // Normalize locale to SupportedLocale type
  const normalizedLocale = normalizeLocale(locale);

  return (
    <Html>
      <Head />
      <Preview>{t('preview')}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          {/* Email Header */}
          <EmailHeader
            variant="default"
            showLogo={true}
            theme="light"
            userContext={{ displayName: customerName }}
          />

          <Container className="mx-auto my-[40px] w-[465px] rounded border border-solid border-[#eaeaea] p-[20px]">
            <Section className="mt-[32px]">
              <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
                {t('title')}
              </Heading>
            </Section>

            <Text className="text-[14px] leading-[24px] text-black">
              {t('greeting', { customerName })}
            </Text>

            <Text className="text-[14px] leading-[24px] text-black">
              {t('bookingConfirmedText')}
            </Text>

            {/* Payment Required Section */}
            <Section className="my-[20px] rounded-[8px] border border-solid border-[#e9ecef] bg-[#f8f9fa] p-[20px]">
              <Heading className="m-0 mb-[10px] text-[18px] font-semibold text-[#dc3545]">
                {t('paymentRequired')}
              </Heading>
              <Text className="m-0 mb-[15px] text-[14px] leading-[24px] text-black">
                {t('paymentInstructions')}
              </Text>

              <Row>
                <Column>
                  <Text className="m-0 text-[14px] font-semibold text-black">
                    {t('entity')}: {multibancoEntity}
                  </Text>
                  <Text className="m-0 text-[14px] font-semibold text-black">
                    {t('reference')}: {multibancoReference}
                  </Text>
                  <Text className="m-0 text-[14px] font-semibold text-black">
                    {t('amount')}: €{multibancoAmount}
                  </Text>
                  <Text className="m-0 mt-[10px] text-[12px] font-medium text-[#dc3545]">
                    {t('expiresAt')}: {voucherExpiresAt}
                  </Text>
                </Column>
              </Row>

              <Section className="mt-[20px] text-center">
                <Button
                  className="rounded bg-[#007291] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
                  href={hostedVoucherUrl}
                >
                  {t('viewVoucher')}
                </Button>
              </Section>
            </Section>

            {/* Payment Methods */}
            <Section className="my-[20px]">
              <Text className="mb-[10px] text-[14px] font-semibold text-black">
                {t('paymentMethods')}
              </Text>
              <Text className="m-0 text-[12px] leading-[20px] text-black">{t('method1')}</Text>
              <Text className="m-0 text-[12px] leading-[20px] text-black">{t('method2')}</Text>
              <Text className="m-0 text-[12px] leading-[20px] text-black">{t('method3')}</Text>
            </Section>

            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />

            {/* Appointment Details */}
            <Section className="my-[20px]">
              <Heading className="m-0 mb-[15px] text-[16px] font-semibold text-black">
                {t('appointmentDetails')}
              </Heading>

              <Row>
                <Column>
                  <Text className="m-0 text-[14px] leading-[24px] text-black">
                    <strong>{t('service')}:</strong> {serviceName}
                  </Text>
                  <Text className="m-0 text-[14px] leading-[24px] text-black">
                    <strong>{t('expert')}:</strong> {expertName}
                  </Text>
                  <Text className="m-0 text-[14px] leading-[24px] text-black">
                    <strong>{t('date')}:</strong> {appointmentDate}
                  </Text>
                  <Text className="m-0 text-[14px] leading-[24px] text-black">
                    <strong>{t('time')}:</strong> {appointmentTime} ({timezone})
                  </Text>
                  <Text className="m-0 text-[14px] leading-[24px] text-black">
                    <strong>{t('duration')}:</strong> {duration} {t('minutes')}
                  </Text>
                </Column>
              </Row>

              {customerNotes && (
                <>
                  <Text className="mb-[5px] mt-[15px] text-[14px] font-semibold text-black">
                    {t('customerNotes')}:
                  </Text>
                  <Text className="rounded bg-[#f8f9fa] p-[10px] text-[14px] italic leading-[24px] text-gray-600">
                    {customerNotes}
                  </Text>
                </>
              )}
            </Section>

            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />

            {/* Meeting Access Info */}
            <Section className="my-[20px] rounded-[8px] border border-solid border-[#b3d9ff] bg-[#e7f3ff] p-[15px]">
              <Text className="m-0 mb-[5px] text-[14px] font-semibold text-black">
                {t('meetingAccess')}
              </Text>
              <Text className="m-0 text-[12px] leading-[18px] text-black">
                {t('meetingAccessText')}
              </Text>
            </Section>

            {/* Important Notice */}
            <Section className="my-[20px] rounded-[8px] border border-solid border-[#ffeaa7] bg-[#fff3cd] p-[15px]">
              <Text className="m-0 mb-[5px] text-[14px] font-semibold text-black">
                {t('important')}
              </Text>
              <Text className="m-0 text-[12px] leading-[18px] text-black">
                {t('importantText')}
              </Text>
            </Section>

            {/* Support */}
            <Section className="my-[20px] text-center">
              <Text className="m-0 mb-[5px] text-[14px] font-semibold text-black">
                {t('questions')}
              </Text>
              <Text className="m-0 text-[12px] leading-[18px] text-gray-600">
                {t('questionsText')}
              </Text>
            </Section>

            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />

            <Text className="text-[14px] leading-[24px] text-black">{t('thankYou')}</Text>

            <Text className="text-[14px] leading-[24px] text-black">{t('team')}</Text>
          </Container>

          {/* Email Footer */}
          <EmailFooter
            variant="default"
            showLogo={true}
            showSocialLinks={false}
            showUnsubscribe={true}
            showContactInfo={true}
            language={normalizedLocale}
            theme="light"
          />
        </Body>
      </Tailwind>
    </Html>
  );
};

export default MultibancoBookingPending;
