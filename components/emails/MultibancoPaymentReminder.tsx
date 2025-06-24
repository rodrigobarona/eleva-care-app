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

interface MultibancoPaymentReminderProps {
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
  reminderType: 'gentle' | 'urgent'; // Day 3 vs Day 6
  daysRemaining: number;
  locale?: string;
}

export const MultibancoPaymentReminder = async ({
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
  reminderType,
  daysRemaining: _daysRemaining,
  locale = 'en',
}: MultibancoPaymentReminderProps) => {
  const t = await getTranslations({
    locale,
    namespace: 'notifications.multibancoPaymentReminder.email',
  });

  const normalizedLocale = normalizeLocale(locale);

  const isUrgent = reminderType === 'urgent';

  return (
    <Html>
      <Head />
      <Preview>{t(`preview.${reminderType}`)}</Preview>
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
            {/* Header with urgency indicator */}
            <Section className="mt-[32px]">
              <Heading
                className={`mx-0 my-[30px] p-0 text-center text-[24px] font-normal ${isUrgent ? 'text-[#dc3545]' : 'text-[#007291]'}`}
              >
                {t(`title.${reminderType}`)}
              </Heading>
            </Section>

            <Text className="text-[14px] leading-[24px] text-black">
              {t('greeting', { customerName })}
            </Text>

            {/* Conditional opening message based on urgency */}
            {isUrgent ? (
              <>
                <Text className="text-[14px] font-semibold leading-[24px] text-[#dc3545]">
                  {t('urgentNotice')}
                </Text>
                <Text className="text-[14px] leading-[24px] text-[#dc3545]">
                  {t('expiryWarning')}
                </Text>
              </>
            ) : (
              <>
                <Text className="text-[14px] leading-[24px] text-black">{t('reminderNotice')}</Text>
                <Text className="text-[14px] leading-[24px] text-black">{t('timeRemaining')}</Text>
              </>
            )}

            {/* Payment Section with urgency styling */}
            <Section
              className={`my-[20px] rounded-[8px] border border-solid p-[20px] ${isUrgent ? 'border-[#dc3545] bg-[#fff5f5]' : 'border-[#007291] bg-[#f0f8ff]'}`}
            >
              <Heading
                className={`m-0 mb-[10px] text-[18px] font-semibold ${isUrgent ? 'text-[#dc3545]' : 'text-[#007291]'}`}
              >
                {t('paymentRequired')}
              </Heading>
              <Text className="m-0 mb-[15px] text-[14px] leading-[24px] text-black">
                {t(`instructions.${reminderType}`)}
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
                  <Text
                    className={`m-0 mt-[10px] text-[12px] font-medium ${isUrgent ? 'text-[#dc3545]' : 'text-[#666]'}`}
                  >
                    {t('expiresAt')}: {voucherExpiresAt}
                  </Text>
                </Column>
              </Row>

              <Section className="mt-[20px] text-center">
                <Button
                  className={`rounded px-5 py-3 text-center text-[12px] font-semibold text-white no-underline ${isUrgent ? 'bg-[#dc3545]' : 'bg-[#007291]'}`}
                  href={hostedVoucherUrl}
                >
                  {t('viewVoucher')}
                </Button>
              </Section>
            </Section>

            {/* Payment Methods */}
            <Section className="my-[20px]">
              <Text className="mb-[10px] text-[14px] font-semibold text-black">
                {t(`paymentMethods.${reminderType}`)}
              </Text>
              <Text className="m-0 text-[12px] leading-[20px] text-black">
                {t(`method1.${reminderType}`)}
              </Text>
              <Text className="m-0 text-[12px] leading-[20px] text-black">
                {t(`method2.${reminderType}`)}
              </Text>
              <Text className="m-0 text-[12px] leading-[20px] text-black">
                {t(`method3.${reminderType}`)}
              </Text>
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

            {/* Urgency-based CTA section */}
            {isUrgent && (
              <Section className="my-[20px] rounded-[8px] border border-solid border-[#dc3545] bg-[#fff5f5] p-[15px] text-center">
                <Text className="m-0 mb-[5px] text-[16px] font-bold text-[#dc3545]">
                  ⚠️ {t('consequences')}
                </Text>
                <Text className="m-0 text-[12px] leading-[18px] text-black">
                  {t('consequencesText')}
                </Text>
              </Section>
            )}

            {/* Support */}
            <Section className="my-[20px] text-center">
              <Text className="m-0 mb-[5px] text-[14px] font-semibold text-black">
                {t(`support.${reminderType}`)}
              </Text>
              <Text className="m-0 text-[12px] leading-[18px] text-gray-600">
                {t(`supportText.${reminderType}`)}
              </Text>
            </Section>

            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />

            <Text className="text-[14px] leading-[24px] text-black">
              {t(`thankYou.${reminderType}`)}
            </Text>
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

export default MultibancoPaymentReminder;
