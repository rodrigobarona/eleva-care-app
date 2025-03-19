import { Baby, Droplets, Flower2, Ribbon } from 'lucide-react';

export const translations = {
  language: 'English',
  nav: {
    services: 'Services',
    approach: 'Approach',
    mission: 'Mission',
    team: 'Team',
    podcast: 'Podcast',
    newsletter: 'Newsletter',
    signIn: 'Sign In',
    signOut: 'Sign Out',
  },
  hero: {
    title: 'World-Class Care for Women, *on-demand.*',
    subtitle: "Book Leading Women's Health Specialists - On Your Schedule. ",
    cta1: 'Not sure if we can help? Take the Quiz',
    cta2: 'Find an Expert',
    cta2Help: 'Make your appointment',
    cta2Help2: 'in less than 3 minutes.',
  },
  podcast: {
    title: "Elevating Women's Health with Patrícia Mota, PT, PhD",
    subtitle: 'The podcast',
    description:
      'Empower your health journey with "Elevating Women\'s Health" by Eleva Care. Our expert hosts break down cutting-edge research in women\'s health each week, translating complex studies into actionable insights. From reproductive wellness to mental health, we cover it all.',
    cta: 'Listen Now',
  },
  services: {
    title: 'How we support you',
    subtitle: 'Expert-Led Care, Tailored to You',
    description:
      "Access personalized care from top-rated women's health professionals worldwide. We connect you with the expertise you need, from online consultations to local resources, all tailored to your unique health journey.",
    items: [
      {
        icon: <Baby className="text-eleva-primary h-12 w-12" />,
        title: 'Pregnancy & Postpartum',
        description:
          'Comprehensive care to support women through the transformative journey of pregnancy and early motherhood.',
        items: [
          '**Physical Therapy:** Prepare for birth, manage pain, regain strength, address diastasis recti, and receive targeted pelvic floor interventions to prevent and treat dysfunction.',
          '**OB/GYN Care:** Receive expert care throughout your pregnancy journey and postpartum recovery.',
          '**Nutritional Guidance:** Optimize your diet for a healthy pregnancy and postpartum journey.',
          '**Mental Health Support:** Navigate the emotional and mental challenges of motherhood with compassionate guidance.',
          '**Exercise:** Explore the benefits of therapeutic exercise during pregnancy and postpartum, designed to support your changing body and promote a healthy recovery.',
        ],
        image: '/img/Pregnant-Woman-Flowers.jpg?height=450&width=300?monochrome=006D77',
        cta: 'Learn more',
      },
      {
        icon: <Droplets className="text-eleva-primary h-12 w-12" />,
        title: 'Pelvic Health',
        description:
          'Specialized care addressing the unique pelvic health needs of women throughout their lives.',
        items: [
          '**Pelvic Physical Therapy:** Specialized treatment for incontinence, pelvic organ prolapse, and pelvic pain, including pain during intercourse.',
          '**Specialized OB/GYN Care:** Expert diagnosis and treatment for a range of pelvic health issues, including prolapse, endometriosis, and sexual dysfunction. ',
          '**Mental Health Support:** Counseling and therapy to address the psychological aspects of pelvic health concerns.',
        ],
        image: '/img/Woman-Working-Out-Living-Room.jpg?height=450&width=300',
        cta: 'Learn more',
      },
      {
        icon: <Flower2 className="text-eleva-primary h-12 w-12" />,
        title: 'Through Every Stage',
        description:
          "Holistic support for women's health concerns from adolescence through menopause and beyond.",
        items: [
          '**Teen Health:** Navigate puberty, menstruation, and early womanhood with confidence and support.',
          '**Menopause Management:** Address hormonal changes, manage symptoms, and prioritize your well-being ',
          '**Mental Wellness:** Access therapy and support to manage stress, anxiety, depression, and other mental health concerns.',
          '**Fitness & Nutrition:** Discover personalized exercise plans and nutritional guidance tailored to your individual needs.',
          '**Physical Therapy:** Manage pain, prevent injury, and optimize your physical performance, with specialized expertise in pelvic floor health for active women and female athletes.',
        ],
        image: '/img/Smiling-Women-Photo.jpg?height=450&width=300',
        cta: 'Learn more',
      },
      {
        icon: <Ribbon className="text-eleva-primary h-12 w-12" />,
        title: 'Empowering Your Cancer Journey',
        description:
          'Specialized support for women facing breast and gynecological cancers, providing comprehensive care from diagnosis through survivorship.',
        items: [
          '**Physical Therapy:** Optimize your recovery with pre-surgical preparation, post-treatment rehabilitation, lymphedema management, and targeted exercise programs designed for each phase of your cancer journey.',
          '**Pain Management:** Access evidence-based techniques for managing treatment-related pain, including manual therapy, therapeutic exercise, and scar tissue management.',
          '**Exercise Support:** Receive personalized exercise prescriptions that adapt to your treatment phase, helping maintain strength, manage fatigue, and support your recovery journey.',
          '**Mental Health Care:** Navigate the emotional challenges of diagnosis and treatment with professional support focused on building resilience and managing anxiety.',
          '**Lymphedema Care:** Benefit from specialized prevention strategies and treatment including manual lymphatic drainage, compression therapy, and self-management education.',
          '**Collaborative Approach:** Our collaborative approach ensures coordinated care with your oncology team, supporting your physical and emotional well-being throughout treatment and recovery.',
          'Our collaborative approach ensures coordinated care with your oncology team, supporting your physical and emotional well-being throughout treatment and recovery.',
        ],
        image: '/img/cancer-journey.jpg?height=450&width=300',
        cta: 'Learn more',
      },
    ],
  },
  approach: {
    title: 'At Eleva Care, we believe:',
    items: [
      'Every woman deserves access to **quality healthcare**.',
      '**Knowledge is power** in healthcare decisions.',
      '**Collaboration** leads to better health outcomes.',
      "Women's health is a lifelong, **evolving journey**.",
      '**Pelvic health** is essential to overall well-being.',
    ],
    description:
      'At Eleva Care, we believe in a collaborative approach to care. Our team of experts work together to provide you with comprehensive and personalized support, ensuring that every aspect of your health is addressed.',
    cta: 'Our Mission',
  },
  mission: {
    title: 'Our Mission',
    subtitle: "Transforming women's health care through innovation and compassion",
    description:
      'At Eleva Care, we are dedicated to empowering women of all ages to take control of their health and well-being. Our mission is to provide a supportive and inclusive platform that connects individuals with expert-led resources, evidence-based information, and a collaborative community of healthcare professionals.',
    vision: {
      title: 'Our Vision',
      description:
        "To bridge the gap between scientific research and practical application, delivering accessible and personalized women's health care solutions throughout every life stage.",
    },
    cta: 'Join Us',
    stats: [
      { value: '10K+', label: 'Women Helped' },
      { value: '50+', label: 'Expert Providers' },
      { value: '95%', label: 'Patient Satisfaction' },
      { value: '24/7', label: 'Support Available' },
    ],
    beliefs: {
      title: 'At Eleva Care, we believe:',
      items: [
        'Every woman deserves access to quality healthcare.',
        'Knowledge is power in healthcare decisions.',
        'Collaboration leads to better health outcomes.',
        "Women's health is a lifelong, evolving journey.",
        'Pelvic health is essential to overall well-being.',
      ],
    },
  },
  team: {
    title: 'Meet Our Team',
    subtitle: "Founded by passionate experts in women's health",
    description:
      "Eleva Care is led by a team of dedicated professionals who bring together years of experience in women's health, technology, and patient care. Our founders and key team members are committed to revolutionizing the way women access and experience healthcare.",
    members: [
      {
        name: 'Patricia Mota, PT, PhD',
        role: 'Co-Founder & CEO',
        image: '/img/team/team-patricia-mota-2.jpeg?height=1200&width=1200',
        quote:
          "Our mission is to elevate women's healthcare by making it more accessible, innovative, and empowering for all women.",
      },

      {
        name: 'Cristine Homsi Jorge, PT, PhD',
        role: "Board Advisor (Women's Health)",
        image: '/img/team/team-cristine-homsi-jorge.jpg?height=1200&width=1200',
        quote:
          'Clinical research and education empower women to make informed decisions about their healthcare journey.',
      },
      {
        name: 'Alexandre Delgado, PT, PhD',
        role: 'Board Advisor (Obstetric Physical Therapy)',
        image: '/img/team/team-alexandre-delgado-br.png?height=1200&width=1200',
        quote:
          'Evidence-based physical therapy transforms the pregnancy and birth experience, empowering women through every stage.',
      },
      {
        name: 'Patricia Driusso, PT, PhD',
        role: "Board Advisor (Women's Health)",
        image: '/img/team/team-patricia-driusso.jpg?height=1200&width=1200',
        quote:
          'Clinical research advances rehabilitation treatments while empowering women through evidence-based education.',
      },
      {
        name: 'Annelie Gutke, PT, PhD',
        role: "Board Advisor (Women's Health)",
        image: '/img/team/team-annelie-gutke.jpg?height=1200&width=1200',
        quote:
          'Understanding pain mechanisms transforms how we care for women during pregnancy and beyond.',
      },
      {
        name: 'Ruben Barakat, PhD',
        role: 'Board Advisor (Exercise Science)',
        image: '/img/team/team-ruben-barakat.jpg?height=1200&width=1200',
        quote:
          "Evidence shows that personalized exercise during pregnancy can transform women's health outcomes.",
      },
      {
        name: 'Jessica Margarido, PT',
        role: 'Oncology Rehabilitation',
        image: '/img/team/team-jessica-margarido.jpg?height=1200&width=1200',
        quote:
          'Evidence-based rehabilitation restores function and quality of life throughout cancer care.',
      },
      {
        name: 'Joana Goulão Barros, MD, PhD',
        role: 'Obstetrics & Gynecology',
        image: '/img/team/team-joana-barros.jpg?height=1200&width=1200',
        quote:
          'Integrating medical expertise with specialized rehabilitation creates the highest standard of prenatal care.',
      },
      {
        name: 'Rodrigo Barona',
        role: 'Co-Founder',
        image: '/img/team/team-rodrigo-barona.jpg?height=1200&width=1200',
        quote:
          "We are transforming women's healthcare by combining clinical expertise with innovative technology.",
      },
    ],
  },

  newsletter: {
    title: 'Femme Focus',
    subtitle: 'An Eleva Care Publication',
    description:
      "Your monthly spotlight on women's health insights, expert advice, and empowering stories to nurture every stage of your wellness journey.",
    placeholder: 'Enter your email',
    cta: 'Subscribe',
    privacy: 'We respect your privacy. Unsubscribe at any time.',
  },
  social: {
    title: 'Follow Us',
    linkedin: 'LinkedIn',
    instagram: 'Instagram',
    facebook: 'Facebook',
    twitter: 'Twitter',
    scholar: 'Google Scholar',
  },
  footer: {
    copyright: '© 2025 Eleva Care. All rights reserved.',
    terms: 'Terms of Service',
    privacy: 'Privacy',
  },
  experts: {
    title: 'Top Experts',
    subtitle: 'Access to the best has never been easier',
  },
};
