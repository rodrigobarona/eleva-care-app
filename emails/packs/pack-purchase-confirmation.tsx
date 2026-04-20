import * as React from 'react';
import { EmailButton, EmailLayout } from '@/components/emails';
import {
  createTableCellStyle,
  ELEVA_BUTTON_STYLES,
  ELEVA_CARD_STYLES,
  ELEVA_COLORS,
  ELEVA_TEXT_STYLES,
  ELEVA_TYPOGRAPHY,
} from '@/emails/utils/brand-constants';
import type { SupportedLocale } from '@/emails/utils/i18n';
import { Heading, Hr, Section, Text } from '@react-email/components';

interface PackPurchaseConfirmationProps {
  buyerName?: string;
  buyerEmail?: string;
  packName?: string;
  eventName?: string;
  expertName?: string;
  sessionsCount?: number;
  promotionCode?: string;
  expiresAt?: string;
  bookingUrl?: string;
  locale?: string;
}

const i18n: Record<string, Record<string, string>> = {
  en: {
    successTitle: 'Session Pack Purchased!',
    successSubtitle: 'Your sessions are ready to be booked',
    greeting: 'Hello',
    intro:
      'Your session pack has been purchased successfully. Use the promotion code below when booking your sessions.',
    detailsTitle: 'Pack Details',
    pack: 'Pack',
    event: 'Event',
    expert: 'Expert',
    sessions: 'Sessions',
    validUntil: 'Valid Until',
    promoTitle: 'Your Promotion Code',
    promoInstructions:
      'Enter this code at checkout when booking your sessions to apply a 100% discount:',
    howToUse: 'How to use your code',
    step1: "Go to the expert's booking page and select a time slot",
    step2: 'Proceed to checkout',
    step3: 'Enter the promotion code in the discount field',
    step4: 'The session will be free — your pack covers it!',
    bookNow: 'Book a Session',
    viewPacks: 'View My Packs',
    supportNote: 'Need assistance?',
    supportText:
      'If you have any questions about your session pack, please contact our support team.',
    thanks: 'Thank you for choosing Eleva Care!',
  },
  pt: {
    successTitle: 'Pacote de Sessões Adquirido!',
    successSubtitle: 'As suas sessões estão prontas para agendar',
    greeting: 'Olá',
    intro:
      'O seu pacote de sessões foi adquirido com sucesso. Use o código promocional abaixo ao agendar as suas sessões.',
    detailsTitle: 'Detalhes do Pacote',
    pack: 'Pacote',
    event: 'Evento',
    expert: 'Especialista',
    sessions: 'Sessões',
    validUntil: 'Válido até',
    promoTitle: 'O Seu Código Promocional',
    promoInstructions:
      'Insira este código no checkout ao agendar as suas sessões para aplicar um desconto de 100%:',
    howToUse: 'Como usar o seu código',
    step1: 'Aceda à página de agendamento do especialista e selecione um horário',
    step2: 'Prossiga para o checkout',
    step3: 'Insira o código promocional no campo de desconto',
    step4: 'A sessão será gratuita — o seu pacote cobre!',
    bookNow: 'Agendar Sessão',
    viewPacks: 'Ver Meus Pacotes',
    supportNote: 'Precisa de ajuda?',
    supportText:
      'Se tiver alguma dúvida sobre o seu pacote de sessões, contacte a nossa equipa de suporte.',
    thanks: 'Obrigado por escolher a Eleva Care!',
  },
  es: {
    successTitle: '¡Paquete de Sesiones Comprado!',
    successSubtitle: 'Tus sesiones están listas para reservar',
    greeting: 'Hola',
    intro:
      'Tu paquete de sesiones ha sido comprado con éxito. Usa el código promocional a continuación al reservar tus sesiones.',
    detailsTitle: 'Detalles del Paquete',
    pack: 'Paquete',
    event: 'Evento',
    expert: 'Experto',
    sessions: 'Sesiones',
    validUntil: 'Válido hasta',
    promoTitle: 'Tu Código Promocional',
    promoInstructions:
      'Ingresa este código en el checkout al reservar tus sesiones para aplicar un descuento del 100%:',
    howToUse: 'Cómo usar tu código',
    step1: 'Ve a la página de reservas del experto y selecciona un horario',
    step2: 'Procede al checkout',
    step3: 'Ingresa el código promocional en el campo de descuento',
    step4: '¡La sesión será gratuita — tu paquete la cubre!',
    bookNow: 'Reservar Sesión',
    viewPacks: 'Ver Mis Paquetes',
    supportNote: '¿Necesitas ayuda?',
    supportText:
      'Si tienes alguna pregunta sobre tu paquete de sesiones, contacta a nuestro equipo de soporte.',
    thanks: '¡Gracias por elegir Eleva Care!',
  },
};

function getLocaleStrings(locale: string) {
  const prefix = locale.toLowerCase().split('-')[0];
  return i18n[prefix] || i18n.en;
}

/**
 * Email sent to the buyer after a successful session-pack purchase. Renders
 * pack details, the promotion code to apply at booking, and a CTA linking to
 * the booking page. Localized for `en` / `pt` / `es` / `pt-BR`.
 *
 * Realistic sample values live only in `PreviewProps` so React Email's dev
 * preview is rich while production rendering can never inherit them.
 *
 * @example
 * ```tsx
 * <PackPurchaseConfirmation
 *   buyerName="Matilde Henriques"
 *   buyerEmail="matilde@example.com"
 *   packName="5-Session Wellness Pack"
 *   eventName="Wellness Consultation"
 *   expertName="Patricia Mota"
 *   sessionsCount={5}
 *   promotionCode="PACK-XY7K9M"
 *   expiresAt="2026-09-01T00:00:00.000Z"
 *   bookingUrl="https://eleva.care/en/dr-maria-santos"
 *   locale="en"
 * />
 * ```
 */
export const PackPurchaseConfirmation = ({
  buyerName = 'Customer',
  buyerEmail = '',
  packName = 'Your session pack',
  eventName = 'Your sessions',
  expertName = 'Your Expert',
  sessionsCount = 0,
  promotionCode = '',
  expiresAt = '',
  bookingUrl = 'https://eleva.care',
  locale = 'en',
}: PackPurchaseConfirmationProps) => {
  const t = getLocaleStrings(locale);
  const normalizedLocale = (locale || 'en').toLowerCase();
  const localeTag = normalizedLocale.startsWith('pt')
    ? normalizedLocale === 'pt-br'
      ? 'pt-BR'
      : 'pt-PT'
    : normalizedLocale.startsWith('es')
      ? 'es-ES'
      : 'en-US';
  // Guard against missing or malformed `expiresAt` so the "Valid Until" row
  // never renders the literal string "Invalid Date".
  const expiryDate = expiresAt ? new Date(expiresAt) : null;
  const formattedExpiry =
    expiryDate && !isNaN(expiryDate.getTime())
      ? expiryDate.toLocaleDateString(localeTag, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '—';

  const subject = `${t.successTitle} - ${packName}`;
  const previewText = `${t.promoInstructions} ${promotionCode}`;

  return (
    <EmailLayout
      subject={subject}
      previewText={previewText}
      headerVariant="branded"
      footerVariant="default"
      locale={locale as SupportedLocale}
    >
      <Section style={ELEVA_CARD_STYLES.success}>
        <Heading
          style={{
            ...ELEVA_TEXT_STYLES.heading2,
            margin: '0 0 8px 0',
            textAlign: 'center' as const,
          }}
        >
          {t.successTitle}
        </Heading>
        <Text
          style={{
            ...ELEVA_TEXT_STYLES.bodyRegular,
            margin: '0',
            textAlign: 'center' as const,
            fontWeight: ELEVA_TYPOGRAPHY.weights.medium,
          }}
        >
          {t.successSubtitle}
        </Text>
      </Section>

      <Section style={{ margin: '32px 0' }}>
        <Text style={{ ...ELEVA_TEXT_STYLES.bodyLarge, margin: '0 0 16px 0' }}>
          {t.greeting} {buyerName},
        </Text>
        <Text style={ELEVA_TEXT_STYLES.bodyRegular}>{t.intro}</Text>
      </Section>

      <Section style={ELEVA_CARD_STYLES.branded}>
        <Heading
          style={{
            ...ELEVA_TEXT_STYLES.heading3,
            margin: '0 0 24px 0',
            borderBottom: `2px solid ${ELEVA_COLORS.primary}`,
            paddingBottom: '12px',
          }}
        >
          {t.detailsTitle}
        </Heading>

        <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
          <tr>
            <td style={createTableCellStyle(true)}>{t.pack}:</td>
            <td style={{ ...createTableCellStyle(false, 'right'), color: ELEVA_COLORS.primary }}>
              {packName}
            </td>
          </tr>
          <tr>
            <td style={createTableCellStyle(true)}>{t.event}:</td>
            <td style={createTableCellStyle(false, 'right')}>{eventName}</td>
          </tr>
          <tr>
            <td style={createTableCellStyle(true)}>{t.expert}:</td>
            <td style={{ ...createTableCellStyle(false, 'right'), color: ELEVA_COLORS.primary }}>
              {expertName}
            </td>
          </tr>
          <tr>
            <td style={createTableCellStyle(true)}>{t.sessions}:</td>
            <td
              style={{
                ...createTableCellStyle(false, 'right'),
                fontSize: '20px',
                fontWeight: ELEVA_TYPOGRAPHY.weights.bold,
                color: ELEVA_COLORS.success,
              }}
            >
              {sessionsCount}
            </td>
          </tr>
          <tr>
            <td style={createTableCellStyle(true)}>{t.validUntil}:</td>
            <td style={createTableCellStyle(false, 'right')}>{formattedExpiry}</td>
          </tr>
        </table>
      </Section>

      <Section
        style={{
          margin: '32px 0',
          padding: '32px',
          backgroundColor: ELEVA_COLORS.neutral.extraLight,
          borderRadius: '12px',
          border: `2px dashed ${ELEVA_COLORS.primary}`,
          textAlign: 'center' as const,
        }}
      >
        <Text
          style={{
            ...ELEVA_TEXT_STYLES.heading3,
            margin: '0 0 12px 0',
            color: ELEVA_COLORS.primary,
          }}
        >
          {t.promoTitle}
        </Text>
        <Text style={{ ...ELEVA_TEXT_STYLES.bodyRegular, margin: '0 0 20px 0' }}>
          {t.promoInstructions}
        </Text>
        <div
          style={{
            display: 'inline-block',
            padding: '16px 32px',
            backgroundColor: ELEVA_COLORS.surface,
            borderRadius: '8px',
            border: `2px solid ${ELEVA_COLORS.primary}`,
          }}
        >
          <Text
            style={{
              margin: '0',
              fontSize: '28px',
              fontWeight: ELEVA_TYPOGRAPHY.weights.bold,
              fontFamily: 'monospace',
              color: ELEVA_COLORS.primary,
              letterSpacing: '3px',
            }}
          >
            {promotionCode}
          </Text>
        </div>
      </Section>

      <Section style={ELEVA_CARD_STYLES.default}>
        <Heading style={{ ...ELEVA_TEXT_STYLES.heading3, margin: '0 0 16px 0' }}>
          {t.howToUse}
        </Heading>
        <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
          {[t.step1, t.step2, t.step3, t.step4].map((step, index) => (
            <tr key={index}>
              <td
                style={{
                  padding: '8px 12px 8px 0',
                  verticalAlign: 'top' as const,
                  width: '32px',
                  fontSize: '16px',
                  fontWeight: ELEVA_TYPOGRAPHY.weights.bold,
                  color: ELEVA_COLORS.primary,
                }}
              >
                {index + 1}.
              </td>
              <td style={{ padding: '8px 0', ...ELEVA_TEXT_STYLES.bodyRegular, margin: 0 }}>
                {step}
              </td>
            </tr>
          ))}
        </table>
      </Section>

      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <EmailButton
          href={bookingUrl}
          style={{
            ...ELEVA_BUTTON_STYLES.primary,
            backgroundColor: ELEVA_COLORS.primary,
            borderColor: ELEVA_COLORS.primary,
            marginRight: '12px',
          }}
        >
          {t.bookNow}
        </EmailButton>
        <EmailButton
          href={`${bookingUrl.split('/').slice(0, 4).join('/')}/my-packs?email=${encodeURIComponent(buyerEmail)}`}
          style={ELEVA_BUTTON_STYLES.secondary}
        >
          {t.viewPacks}
        </EmailButton>
      </Section>

      <Hr style={{ margin: '40px 0', borderColor: ELEVA_COLORS.neutral.border }} />

      <Section style={{ ...ELEVA_CARD_STYLES.default, textAlign: 'center' as const }}>
        <Text style={{ ...ELEVA_TEXT_STYLES.bodySmall, margin: '0' }}>
          <strong style={{ color: ELEVA_COLORS.primary }}>{t.supportNote}</strong>
          <br />
          {t.supportText}
        </Text>
      </Section>

      <Section
        style={{
          ...ELEVA_CARD_STYLES.branded,
          textAlign: 'center' as const,
          marginTop: '32px',
        }}
      >
        <Text
          style={{
            ...ELEVA_TEXT_STYLES.bodyLarge,
            color: ELEVA_COLORS.primary,
            fontWeight: ELEVA_TYPOGRAPHY.weights.semibold,
            margin: '0',
          }}
        >
          {t.thanks}
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default PackPurchaseConfirmation;

PackPurchaseConfirmation.PreviewProps = {
  buyerName: 'João Silva',
  buyerEmail: 'joao@example.com',
  packName: '5-Session Wellness Pack',
  eventName: 'Wellness Consultation',
  expertName: 'Dr. Maria Santos',
  sessionsCount: 5,
  promotionCode: 'PACK-XY7K9M',
  expiresAt: '2026-09-01T00:00:00.000Z',
  bookingUrl: 'https://eleva.care/en/dr-maria-santos',
  locale: 'en',
} as PackPurchaseConfirmationProps;
