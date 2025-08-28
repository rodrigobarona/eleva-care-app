import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { z, ZodError } from 'zod';

// Types for OG image props
interface UserProfileImageProps {
  name: string;
  username: string;
  headline?: string;
  image?: string;
  specialties?: string[];
}

interface GenericImageProps {
  title: string;
  description: string;
  variant?: 'primary' | 'secondary' | 'accent';
}

interface EventImageProps {
  title: string;
  expertName: string;
  expertImage?: string;
  duration?: string;
  price?: string;
}

export const runtime = 'edge';

// Validation schemas
const profileSchema = z.object({
  imageType: z.literal('profile'),
  name: z.string(),
  username: z.string(),
  headline: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  specialties: z.string().array().optional(),
});

const genericSchema = z.object({
  imageType: z.literal('generic'),
  title: z.string(),
  description: z.string(),
  variant: z.enum(['primary', 'secondary', 'accent']).optional().default('primary'),
});

const eventSchema = z.object({
  imageType: z.literal('event'),
  title: z.string(),
  expertName: z.string(),
  expertImage: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  price: z.string().nullable().optional(),
});

async function handler(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const imageType = searchParams.get('type');

  try {
    const ogConfig = {
      width: 1200,
      height: 630,
    };

    switch (imageType) {
      case 'profile': {
        try {
          const { name, username, headline, image, specialties } = profileSchema.parse({
            name: searchParams.get('name'),
            username: searchParams.get('username'),
            headline: searchParams.get('headline'),
            image: searchParams.get('image'),
            specialties: searchParams.getAll('specialties'),
            imageType,
          });

          const profileProps: UserProfileImageProps = {
            name,
            username,
            headline: headline || undefined,
            image: image || undefined,
            specialties,
          };

          const img = new ImageResponse(
            (
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #006D77 0%, #83C5BE 100%)',
                  padding: '80px',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                  }}
                >
                  <div style={{ color: 'white', fontSize: '60px', fontWeight: 'bold' }}>
                    {profileProps.name}
                  </div>
                  <div style={{ color: 'white', fontSize: '18px' }}>eleva.care</div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    color: 'white',
                    fontSize: '24px',
                    opacity: 0.8,
                    width: '100%',
                  }}
                >
                  @{profileProps.username}
                  {profileProps.headline && ` • ${profileProps.headline}`}
                </div>
              </div>
            ),
            ogConfig,
          );

          return new Response(img.body, {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
          });
        } catch (error) {
          if (error instanceof ZodError) {
            return new Response(
              JSON.stringify({
                error: 'Invalid parameters for profile image',
                message:
                  'Required parameters: name, username. Optional: headline, image, specialties',
                details: error.errors,
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              },
            );
          }
          throw error;
        }
      }

      case 'generic': {
        try {
          const { title, description, variant } = genericSchema.parse({
            title: searchParams.get('title'),
            description: searchParams.get('description'),
            variant: searchParams.get('variant') as 'primary' | 'secondary' | 'accent' | undefined,
            imageType,
          });

          const genericProps: GenericImageProps = {
            title,
            description,
            variant,
          };

          const img = new ImageResponse(
            (
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  height: '100%',
                  background:
                    genericProps.variant === 'secondary'
                      ? 'linear-gradient(135deg, #E29578 0%, #FFDDD2 100%)'
                      : genericProps.variant === 'accent'
                        ? 'linear-gradient(135deg, #E0FBFC 0%, #F7F9F9 100%)'
                        : 'linear-gradient(135deg, #006D77 0%, #83C5BE 100%)',
                  padding: '80px',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontSize: '64px',
                    fontWeight: 'bold',
                    color: genericProps.variant === 'primary' ? 'white' : '#333333',
                    marginBottom: '32px',
                    maxWidth: '1000px',
                    justifyContent: 'center',
                  }}
                >
                  {genericProps.title}
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: '24px',
                    color: genericProps.variant === 'primary' ? 'white' : '#333333',
                    opacity: 0.9,
                    maxWidth: '800px',
                    lineHeight: 1.4,
                    justifyContent: 'center',
                  }}
                >
                  {genericProps.description}
                </div>
                <div
                  style={{
                    display: 'flex',
                    marginTop: '64px',
                    fontSize: '20px',
                    color: genericProps.variant === 'primary' ? 'white' : '#333333',
                    opacity: 0.75,
                    justifyContent: 'center',
                  }}
                >
                  Expert Healthcare for Women • eleva.care
                </div>
              </div>
            ),
            ogConfig,
          );

          return new Response(img.body, {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
          });
        } catch (error) {
          if (error instanceof ZodError) {
            return new Response(
              JSON.stringify({
                error: 'Invalid parameters for generic image',
                message: 'Required parameters: title, description. Optional: variant',
                details: error.errors,
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              },
            );
          }
          throw error;
        }
      }

      case 'event': {
        try {
          const { title, expertName, expertImage, duration, price } = eventSchema.parse({
            title: searchParams.get('title'),
            expertName: searchParams.get('expertName'),
            expertImage: searchParams.get('expertImage'),
            duration: searchParams.get('duration'),
            price: searchParams.get('price'),
            imageType,
          });

          const eventProps: EventImageProps = {
            title,
            expertName,
            expertImage: expertImage || undefined,
            duration: duration || undefined,
            price: price || undefined,
          };

          const img = new ImageResponse(
            (
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  height: '100%',
                  background: '#F7F9F9',
                  padding: '80px',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                  }}
                >
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#333333' }}>
                    {eventProps.title}
                  </div>
                  <div
                    style={{
                      background: '#006D77',
                      color: 'white',
                      padding: '12px 24px',
                      borderRadius: '25px',
                      fontSize: '18px',
                    }}
                  >
                    Book Consultation
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    color: '#006D77',
                    fontSize: '24px',
                    width: '100%',
                  }}
                >
                  with {eventProps.expertName}
                  {eventProps.duration && ` • ${eventProps.duration}`}
                  {eventProps.price && ` • ${eventProps.price}`}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                  }}
                >
                  <div style={{ color: '#333333', fontSize: '20px' }}>
                    Expert Healthcare for Women
                  </div>
                  <div style={{ color: '#006D77', fontSize: '18px' }}>eleva.care</div>
                </div>
              </div>
            ),
            ogConfig,
          );

          return new Response(img.body, {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
          });
        } catch (error) {
          if (error instanceof ZodError) {
            return new Response(
              JSON.stringify({
                error: 'Invalid parameters for event image',
                message:
                  'Required parameters: title, expertName. Optional: expertImage, duration, price',
                details: error.errors,
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              },
            );
          }
          throw error;
        }
      }

      default:
        return new Response(
          JSON.stringify({
            error: 'Invalid image type',
            message: 'Supported types: profile, generic, event',
            availableTypes: ['profile', 'generic', 'event'],
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        );
    }
  } catch (error) {
    console.error('OG Image generation error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to generate OG image',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

export { handler as GET };
