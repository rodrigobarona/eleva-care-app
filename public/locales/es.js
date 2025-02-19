import { Baby, Droplets, Flower2, Ribbon } from 'lucide-react';

export const translations = {
  language: 'Español',
  nav: {
    services: 'Servicios',
    approach: 'Enfoque',
    mission: 'Misión',
    team: 'Equipo',
    podcast: 'Podcast',
    newsletter: 'Newsletter',
    signIn: 'Iniciar sesión',
    signOut: 'Cerrar sesión',
  },
  hero: {
    title: 'Atención de Clase Mundial para Mujeres, *cuando lo necesites.*',
    subtitle: 'Reserva con los Principales Especialistas en Salud de la Mujer - A Tu Ritmo.',
    cta1: '¿Como podemos ayudarte? Haz el Quiz',
    cta2: 'Reservar ahora',
    cta2Help: 'Marca tu cita',
    cta2Help2: 'en menos de 3 minutos.',
  },
  podcast: {
    title: 'Elevando la Salud Femenina con Patrícia Mota, PT, PhD',
    subtitle: 'El podcast',
    description:
      'Empodera tu viaje de salud con "Elevando la Salud Femenina" de Eleva Care. Nuestros expertos discuten investigaciones de vanguardia sobre salud femenina, traduciendo estudios complejos en ideas prácticas cada semana. Desde el bienestar reproductivo hasta la salud mental, cubrimos todo.',
    cta: 'Escuchar ahora',
  },
  services: {
    title: 'Cómo podemos ayudar',
    subtitle: 'Cuidado especializado, personalizado para ti',
    description:
      'Accede a cuidados personalizados con profesionales altamente cualificados en salud femenina en todo el mundo. Te conectamos con la experiencia que necesitas, desde consultas en línea hasta recursos locales, todo adaptado a tu viaje de salud.',
    items: [
      {
        icon: <Baby className="h-12 w-12 text-eleva-primary" />,
        title: 'Embarazo y Postparto',
        description:
          'Atención integral para apoyar a las mujeres durante el transformador viaje del embarazo y la maternidad temprana.',
        items: [
          '**Fisioterapia:** Prepárate para el parto, maneja el dolor, recupera tu fuerza, trata la diástasis abdominal y recibe intervenciones centradas en el suelo pélvico para prevenir y tratar disfunciones.',
          '**Cuidado Obstétrico y Ginecológico:** Recibe cuidados especializados durante el embarazo y la recuperación postparto.',
          '**Orientación Nutricional:** Optimiza tu dieta para un embarazo y postparto saludables.',
          '**Apoyo en Salud Mental:** Supera los desafíos emocionales y mentales de la maternidad con orientación compasiva.',
          '**Ejercicio:** Explora los beneficios del ejercicio terapéutico durante el embarazo y el postparto, diseñado para apoyar los cambios en tu cuerpo y promover una recuperación saludable.',
        ],
        image: '/img/Pregnant-Woman-Flowers.jpg?height=450&width=300?monochrome=006D77',
        cta: 'Leer más',
      },
      {
        icon: <Droplets className="h-12 w-12 text-eleva-primary" />,
        title: 'Salud Pélvica',
        description:
          'Cuidado especializado que satisface las necesidades únicas de la salud pélvica de las mujeres a lo largo de su vida.',
        items: [
          '**Fisioterapia Pélvica:** Tratamiento especializado para incontinencia, prolapso de órganos pélvicos y dolor pélvico, incluyendo dolor durante las relaciones sexuales.',
          '**Cuidados Obstétricos y Ginecológicos Especializados:** Diagnóstico y tratamiento especializado para una amplia gama de problemas de salud pélvica, como el prolapso, la endometriosis y la disfunción sexual.',
          '**Apoyo en Salud Mental:** Asesoramiento y terapia para abordar los aspectos psicológicos de las preocupaciones sobre la salud pélvica.',
        ],
        image: '/img/Woman-Working-Out-Living-Room.jpg?height=450&width=300',
        cta: 'Leer más',
      },
      {
        icon: <Flower2 className="h-12 w-12 text-eleva-primary" />,
        title: 'En Todas las Etapas',
        description:
          'Apoyo holístico para las preocupaciones de salud femenina, desde la adolescencia hasta la menopausia y más allá.',
        items: [
          '**Salud Adolescente:** Enfrenta con confianza la pubertad, la menstruación y los primeros años de la adultez femenina con el apoyo adecuado.',
          '**Gestión de la Menopausia:** Enfrenta los cambios hormonales, gestiona los síntomas y prioriza tu bienestar.',
          '**Bienestar Mental:** Accede a terapia y apoyo para gestionar el estrés, la ansiedad, la depresión y otras preocupaciones de salud mental.',
          '**Ejercicio y Nutrición:** Descubre planes de ejercicio y guías nutricionales personalizadas para tus necesidades individuales.',
          '**Fisioterapia:** Maneja el dolor, previene lesiones y optimiza tu rendimiento físico, con especialización en salud del suelo pélvico para mujeres activas y atletas.',
        ],
        image: '/img/Smiling-Women-Photo.jpg?height=450&width=300',
        cta: 'Leer más',
      },
      {
        icon: <Ribbon className="h-12 w-12 text-eleva-primary" />,
        title: 'Acompañándote en tu jornada contra el Cáncer',
        description:
          'Apoyo especializado para mujeres que se enfrentan al cáncer de mama y ginecológico, proporcionando atención integral desde el diagnóstico hasta la supervivencia.',
        items: [
          '**Fisioterapia:** Optimiza tu recuperación con preparación prequirúrgica, rehabilitación postratamiento, manejo del linfedema y programas de ejercicios específicos diseñados para cada fase de tu proceso oncológico.',
          '**Control del Dolor:** Accede a técnicas basadas en la evidencia para manejar el dolor relacionado con el tratamiento, incluyendo terapia manual, ejercicio terapéutico y tratamiento del tejido cicatricial.',
          '**Apoyo al Ejercicio:** Recibe prescripciones de ejercicios personalizados que se adaptan a tu fase de tratamiento, ayudando a mantener la fuerza, gestionar la fatiga y apoyar tu proceso de recuperación.',
          '**Atención a la Salud Mental:** Afronta los desafíos emocionales del diagnóstico y tratamiento con apoyo profesional centrado en desarrollar resiliencia y manejar la ansiedad.',
          '**Cuidado del Linfedema:** Benefíciate de estrategias especializadas de prevención y tratamiento, incluyendo drenaje linfático manual, terapia de compresión y educación para el autocuidado.',
          '**Enfoque Colaborativo:** Nuestro enfoque colaborativo garantiza una atención coordinada con tu equipo de oncología, apoyando tu bienestar físico y emocional durante el tratamiento y la recuperación.',
        ],
        image: '/img/cancer-journey.jpg?height=450&width=300',
        cta: 'Saber más',
      },
    ],
  },
  approach: {
    title: 'En Eleva Care, creemos que:',
    items: [
      'Toda mujer merece acceso a **cuidados de salud de calidad**.',
      '**El conocimiento es poder** en las decisiones de salud.',
      '**La colaboración** conduce a mejores resultados de salud.',
      'La salud femenina es un **viaje en constante evolución**.',
      '**La salud pélvica** es fundamental para el bienestar general.',
    ],
    description:
      'En Eleva Care, creemos en un enfoque colaborativo para el cuidado. Nuestro equipo de expertos trabaja en conjunto para ofrecer un apoyo integral y personalizado, asegurando que cada aspecto de tu salud esté cubierto.',
  },
  mission: {
    title: 'Nuestra Misión',
    subtitle: 'Transformar la salud femenina a través de la innovación y la compasión',
    description:
      'En Eleva Care, nos dedicamos a empoderar a las mujeres de todas las edades para que tomen el control de su salud y bienestar. Nuestra misión es proporcionar una plataforma de apoyo inclusiva que conecte a los individuos con recursos liderados por expertos, información basada en evidencia y una comunidad colaborativa de profesionales de la salud.',
    vision: {
      title: 'Nuestra Visión',
      description:
        'Construir un puente entre la investigación científica y la aplicación práctica, ofreciendo soluciones accesibles y personalizadas para la salud femenina en todas las etapas de la vida.',
    },
    cta: 'Únete a nosotros',
    stats: [
      { value: '10K+', label: 'Mujeres Ayudadas' },
      { value: '50+', label: 'Profesionales Especializados' },
      { value: '95%', label: 'Satisfacción de las Pacientes' },
      { value: '24/7', label: 'Soporte Disponible' },
    ],
    beliefs: {
      title: 'En Eleva Care, creemos que:',
      items: [
        'Toda mujer merece acceso a cuidados de salud de calidad.',
        'El conocimiento es poder en las decisiones de salud.',
        'La colaboración conduce a mejores resultados de salud.',
        'La salud femenina es un viaje en constante evolución.',
        'La salud pélvica es fundamental para el bienestar general.',
      ],
    },
  },
  team: {
    title: 'Conoce a Nuestro Equipo',
    subtitle: 'Fundado por expertos apasionados en salud femenina',
    description:
      'Eleva Care está liderado por un equipo de profesionales dedicados que combinan años de experiencia en salud femenina, tecnología y cuidado del paciente. Nuestros fundadores y miembros clave están comprometidos en revolucionar el acceso y la experiencia de las mujeres en el sistema de salud.',
    members: [
      {
        name: 'Patricia Mota, PT, PhD',
        role: 'Co-Fundadora y CEO',
        image: '/img/team/team-patricia-mota-2.jpeg?height=1200&width=1200',
        quote:
          'Nuestra misión es elevar la atención médica de la mujer haciéndola más accesible, innovadora y empoderadora para todas.',
      },
      {
        name: 'Cristine Homsi Jorge, PT, PhD',
        role: 'Asesora Científica (Salud de la Mujer)',
        image: '/img/team/team-cristine-homsi-jorge.jpg?height=1200&width=1200',
        quote:
          'La investigación clínica y la educación empoderan a las mujeres para tomar decisiones informadas sobre su salud.',
      },
      {
        name: 'Alexandre Delgado, PT, PhD',
        role: 'Asesor Científico (Fisioterapia Obstétrica)',
        image: '/img/team/team-alexandre-delgado-br.png?height=1200&width=1200',
        quote:
          'La fisioterapia basada en evidencia transforma la experiencia del embarazo y parto, empoderando a las mujeres en cada etapa.',
      },
      {
        name: 'Patricia Driusso, PT, PhD',
        role: 'Asesora Científica (Salud de la Mujer)',
        image: '/img/team/team-patricia-driusso.jpg?height=1200&width=1200',
        quote:
          'La investigación clínica avanza los tratamientos de rehabilitación mientras empodera a las mujeres a través de la educación basada en evidencia.',
      },
      {
        name: 'Annelie Gutke, PT, PhD',
        role: 'Asesora Científica (Salud de la Mujer)',
        image: '/img/team/team-annelie-gutke.jpg?height=1200&width=1200',
        quote:
          'Comprender los mecanismos del dolor transforma cómo cuidamos a las mujeres durante el embarazo.',
      },
      {
        name: 'Ruben Barakat, PhD',
        role: 'Asesor Científico (Ciencias del Ejercicio)',
        image: '/img/team/team-ruben-barakat.jpg?height=1200&width=1200',
        quote:
          'La evidencia muestra que el ejercicio personalizado durante el embarazo puede transformar los resultados de salud de las mujeres.',
      },
      {
        name: 'Jessica Margarido, PT',
        role: 'Rehabilitación Oncológica',
        image: '/img/team/team-jessica-margarido.jpg?height=1200&width=1200',
        quote:
          'La rehabilitación basada en evidencia restaura la función y la calidad de vida durante el tratamiento del cáncer.',
      },
      {
        name: 'Joana Goulão Barros, MD, PhD',
        role: 'Ginecología y Obstetricia',
        image: '/img/team/team-joana-barros.jpg?height=1200&width=1200',
        quote:
          'La integración de la experiencia médica con la rehabilitación especializada crea el más alto estándar de atención prenatal.',
      },
      {
        name: 'Rodrigo Barona',
        role: 'Co-Fundador',
        image: '/img/team/team-rodrigo-barona.jpg?height=1200&width=1200',
        quote:
          'Estamos transformando la atención médica de la mujer combinando experiencia clínica con tecnología innovadora.',
      },
    ],
  },
  newsletter: {
    title: 'Femme Focus',
    subtitle: 'Una Publicación de Eleva Care',
    description:
      'Tu enfoque mensual sobre la salud de la mujer, consejos de expertos y relatos inspiradores para nutrir cada etapa de tu viaje hacia el bienestar.',
    placeholder: 'Ingresa tu correo electrónico',
    cta: 'Suscribirse',
    privacy: 'Respetamos tu privacidad. Puedes darte de baja en cualquier momento.',
  },

  social: {
    title: 'Síguenos en redes sociales',
    description:
      'Únete a nuestra comunidad en línea para estar al tanto de nuestras últimas investigaciones, recursos y consejos sobre salud femenina.',
    linkedin: 'LinkedIn',
    instagram: 'Instagram',
    facebook: 'Facebook',
    twitter: 'Twitter',
    scholar: 'Google Scholar',
  },
  footer: {
    copyright: '© 2025 Eleva Care. Todos los derechos reservados.',
    privacy: 'Política de privacidad',
    terms: 'Términos y condiciones',
  },
  experts: {
    title: 'Expertos Destacados',
    subtitle: 'El acceso a los mejores nunca ha sido más fácil',
  },
};
