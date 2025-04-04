import { Baby, Droplets, Flower2, Ribbon } from 'lucide-react';

export const translations = {
  language: 'Português (PT)',
  nav: {
    services: 'Serviços',
    approach: 'Abordagem',
    mission: 'Missão',
    team: 'Equipa',
    podcast: 'Podcast',
    newsletter: 'Newsletter',
    signIn: 'Entrar',
    signOut: 'Sair',
  },
  hero: {
    title: 'Cuidados de Saúde Feminina, *quando precisar.*',
    subtitle: 'Marque uma consulta com Especialistas em Saúde da Mulher - À Sua Conveniência.',
    cta1: 'Como a podemos ajudar? Faça o quiz',
    cta2: 'Reservar agora',
    cta2Help: 'Marque a sua consulta',
    cta2Help2: 'em menos de 3 minutos.',
  },
  podcast: {
    title: 'Elevando a Saúde Feminina com Patrícia Mota, PT, PhD',
    subtitle: 'O podcast',
    description:
      'Acompanhe "Elevando a Saúde Feminina" da Eleva Care e aumente o seu conhecimento em saúde. Os nossos especialistas discutem investigações de ponta em saúde feminina e traduzem estudos complexos em dicas práticas, todas as semanas. Do bem-estar reprodutivo à saúde mental, cobrimos tudo.',
    cta: 'Ouvir agora',
  },
  services: {
    title: 'Como Podemos Ajudar',
    subtitle: 'Cuidado especializado, personalizado para si',
    description:
      'Obtenha cuidados personalizados com profissionais altamente qualificados em saúde feminina em todo o mundo. Proporcionamos-lhe o aconsenhamento que necessita, desde consultas online até recursos locais, tudo adaptado à sua jornada de saúde.',
    items: [
      {
        icon: <Baby className="h-12 w-12 text-eleva-primary" />,
        title: 'Gravidez e Pós-Parto',
        description:
          'Apoio abrangente para mulheres durante a transformação da gravidez e maternidade.',
        items: [
          '**Fisioterapia:** Prepare-se para o parto, controle a dor, recupere a força, trate a diástase abdominal e intervenções focadas no pavimento pélvico para prevenir e tratar disfunções.',
          '**Cuidados Obstétricos e Ginecológicos:** Tratamento especializado durante a gravidez e recuperação pós-parto.',
          '**Orientação Nutricional:** Otimize a sua alimentação para uma gravidez e pós-parto saudáveis.',
          '**Apoio em Saúde Mental:** Apoio emocional para os desafios da maternidade.',
          '**Exercício:** Benefícios do exercício terapêutico para gravidez e pós-parto, adaptado às mudanças do corpo e recuperação saudável.',
        ],
        image: '/img/Pregnant-Woman-Flowers.jpg?height=450&width=300?monochrome=006D77',
        cta: 'Saber mais',
      },
      {
        icon: <Droplets className="h-12 w-12 text-eleva-primary" />,
        title: 'Saúde Pélvica',
        description:
          'Cuidados especializados que satisfazem as necessidades únicas da saúde pélvica ao longo da vida.',
        items: [
          '**Fisioterapia Pélvica:** Tratamento especializado para incontinência, prolapso de órgãos pélvicos e dor pélvica, incluindo dor durante o sexo.',
          '**Cuidados Obstétricos e Ginecológicos Especializados:** Diagnóstico e tratamento para uma gama de problemas de saúde pélvica como prolapso, endometriose e disfunção sexual.',
          '**Apoio em Saúde Mental:** Consultoria e terapia para enfrentar os aspetos psicológicos de preocupações com a saúde pélvica.',
        ],
        image: '/img/Woman-Working-Out-Living-Room.jpg?height=450&width=300',
        cta: 'Saber mais',
      },
      {
        icon: <Flower2 className="h-12 w-12 text-eleva-primary" />,
        title: 'Em Todas as Fases',
        description:
          'Apoio holístico para a saúde feminina, desde a adolescência até a menopausa e em todos os desafios da sua vida.',
        items: [
          '**Saúde Adolescente:** Enfrente a puberdade, menstruação e primeiros anos da vida adulta feminina com confiança e apoio.',
          '**Gestão da Menopausa:** Acompanhe as mudanças hormonais, controle sintomas e priorize o seu bem-estar.',
          '**Bem-Estar Mental:** Acesso a terapia para gerir o stress, ansiedade, depressão e outras preocupações de saúde mental.',
          '**Exercício e Nutrição:** Descubra planos de exercício e guias nutricionais personalizados.',
          '**Fisioterapia:** Gestão de dor, prevenção de lesões e otimização do desempenho físico, com especialização em saúde do pavimento pélvico para atletas e mulheres ativas.',
        ],
        image: '/img/Smiling-Women-Photo.jpg?height=450&width=300',
        cta: 'Saber mais',
      },
      {
        icon: <Ribbon className="h-12 w-12 text-eleva-primary" />,
        title: 'Empoderando a sua Jornada Contra o Cancro',
        description:
          'Apoio especializado para mulheres que enfrentam cancros da mama e ginecológicos, proporcionando cuidados abrangentes desde o diagnóstico até à sobrevivência.',
        items: [
          '**Fisioterapia:** Otimize a sua recuperação com preparação pré-cirúrgica, reabilitação pós-tratamento, gestão do linfedema e programas de exercícios específicos concebidos para cada fase da sua jornada contra o cancro.',
          '**Gestão da Dor:** Aceda a técnicas baseadas em evidências para gerir a dor relacionada com o tratamento, incluindo terapia manual, exercício terapêutico e gestão do tecido cicatricial.',
          '**Apoio ao Exercício:** Receba prescrições de exercícios personalizados que se adaptam à sua fase de tratamento, ajudando a manter a força, gerir a fadiga e apoiar o seu processo de recuperação.',
          '**Cuidados de Saúde Mental:** Navegue pelos desafios emocionais do diagnóstico e tratamento com apoio profissional focado no desenvolvimento de resiliência e gestão da ansiedade.',
          '**Cuidados do Linfedema:** Beneficie de estratégias especializadas de prevenção e tratamento, incluindo drenagem linfática manual, terapia de compressão e educação para autogestão.',
          '**Abordagem Colaborativa:** A nossa abordagem colaborativa assegura cuidados coordenados com a sua equipa de oncologia, apoiando o seu bem-estar físico e emocional durante o tratamento e recuperação.',
        ],
        image: '/img/cancer-journey.jpg?height=450&width=300',
        cta: 'Saber mais',
      },
    ],
  },
  approach: {
    title: 'Na Eleva Care, acreditamos que:',
    items: [
      'Toda mulher merece acesso a **cuidados de saúde de qualidade**.',
      '**O conhecimento é poder** nas decisões sobre a saúde.',
      '**A colaboração** traz melhores resultados de saúde.',
      'A saúde feminina é uma **jornada em constante evolução**.',
      '**A saúde pélvica** é fundamental para o bem-estar geral.',
    ],
    description:
      'Na Eleva Care, acreditamos em uma abordagem colaborativa. O nosso time de especialistas trabalha em conjunto para oferecer um apoio abrangente e personalizado, garantindo que todos os aspetos da sua saúde sejam atendidos.',
    cta: 'Saiba mais',
  },
  mission: {
    title: 'A Nossa Missão',
    subtitle: 'Transformar a saúde feminina através de inovação e compaixão',
    description:
      'Na Eleva Care, estamos dedicados a empoderar mulheres de todas as idades para que assumam o controle da sua saúde e bem-estar. A nossa missão é fornecer uma plataforma de apoio inclusiva que conecte indivíduos com recursos liderados por especialistas, informação baseada em evidências e uma comunidade colaborativa de profissionais de saúde.',
    vision: {
      title: 'A Nossa Visão',
      description:
        'Construir uma ponte entre a investigação científica e a aplicação prática, oferecendo soluções acessíveis e personalizadas para a saúde feminina em todas as fases da vida.',
    },
    cta: 'Junte-se a nós',
    stats: [
      { value: '10K+', label: 'Mulheres Ajudadas' },
      { value: '50+', label: 'Profissionais Especializados' },
      { value: '95%', label: 'Satisfação das Pacientes' },
      { value: '24/7', label: 'Suporte Disponível' },
    ],
    beliefs: {
      title: 'Na Eleva Care, acreditamos que:',
      items: [
        'Toda mulher merece acesso a cuidados de saúde de qualidade.',
        'O conhecimento é poder nas decisões sobre a saúde.',
        'A colaboração traz melhores resultados de saúde.',
        'A saúde feminina é uma jornada em constante evolução.',
        'A saúde pélvica é fundamental para o bem-estar geral.',
      ],
    },
  },
  team: {
    title: 'Conheça a Nossa Equipa',
    subtitle: 'Fundada por especialistas apaixonados em saúde feminina',
    description:
      'A Eleva Care é liderada por uma equipa de profissionais dedicados que combinam anos de experiência em saúde feminina, tecnologia e cuidados ao paciente. Os nossos fundadores e principais membros estão empenhados em revolucionar o acesso e a experiência de saúde das mulheres.',
    members: [
      {
        name: 'Patricia Mota, PT, PhD',
        role: 'Co-Fundadora e CEO',
        image: '/img/team/team-patricia-mota-2.jpeg?height=1200&width=1200',
        quote:
          'A nossa missão é elevar os cuidados de saúde feminina, tornando-os mais acessíveis, inovadores e capacitadores para todas as mulheres.',
      },
      {
        name: 'Cristine Homsi Jorge, PT, PhD',
        role: 'Consultora Científica (Saúde da Mulher)',
        image: '/img/team/team-cristine-homsi-jorge.jpg?height=1200&width=1200',
        quote:
          'A investigação clínica e a educação capacitam as mulheres para tomarem decisões informadas sobre a sua saúde.',
      },
      {
        name: 'Alexandre Delgado, PT, PhD',
        role: 'Consultor Científico (Fisioterapia Obstétrica)',
        image: '/img/team/team-alexandre-delgado-br.png?height=1200&width=1200',
        quote:
          'A fisioterapia baseada em evidências transforma a experiência da gravidez e do parto, capacitando as mulheres em todas as etapas.',
      },
      {
        name: 'Patricia Driusso, PT, PhD',
        role: 'Consultora Científica (Saúde da Mulher)',
        image: '/img/team/team-patricia-driusso.jpg?height=1200&width=1200',
        quote:
          'A investigação clínica avança os tratamentos de reabilitação enquanto capacita as mulheres através da educação baseada em evidências.',
      },
      {
        name: 'Annelie Gutke, PT, PhD',
        role: 'Consultora Científica (Saúde da Mulher)',
        image: '/img/team/team-annelie-gutke.jpg?height=1200&width=1200',
        quote:
          'Compreender os mecanismos da dor transforma a forma como cuidamos das mulheres durante a gravidez.',
      },
      {
        name: 'Ruben Barakat, PhD',
        role: 'Consultor Científico (Ciências do Exercício)',
        image: '/img/team/team-ruben-barakat.jpg?height=1200&width=1200',
        quote:
          'As evidências mostram que o exercício personalizado durante a gravidez pode transformar os resultados de saúde das mulheres.',
      },
      {
        name: 'Jessica Margarido, PT',
        role: 'Reabilitação Oncológica',
        image: '/img/team/team-jessica-margarido.jpg?height=1200&width=1200',
        quote:
          'A reabilitação baseada em evidências restaura a função e a qualidade de vida durante os cuidados oncológicos.',
      },
      {
        name: 'Joana Goulão Barros, MD, PhD',
        role: 'Ginecologia e Obstetrícia',
        image: '/img/team/team-joana-barros.jpg?height=1200&width=1200',
        quote:
          'A integração da especialidade médica com a reabilitação especializada cria o mais alto padrão de cuidados pré-natais.',
      },
      {
        name: 'Rodrigo Barona',
        role: 'Co-Fundador',
        image: '/img/team/team-rodrigo-barona.jpg?height=1200&width=1200',
        quote:
          'Estamos a transformar os cuidados de saúde feminina combinando especialização clínica com tecnologia inovadora.',
      },
    ],
  },
  newsletter: {
    title: 'Femme Focus',
    subtitle: 'Uma Publicação da Eleva Care',
    description:
      'O seu destaque mensal sobre saúde da mulher, conselhos de especialistas e histórias inspiradoras para nutrir cada etapa da sua jornada de bem-estar.',
    placeholder: 'Insira o seu email',
    cta: 'Inscreva-se',
    privacy: 'Respeitamos a sua privacidade. Pode cancelar a subscrição a qualquer momento.',
  },

  social: {
    title: 'Siga-nos nas redes sociais',
    description:
      'Junte-se à nossa comunidade online para estar a par das nossas últimas investigações, recursos e conselhos sobre saúde feminina.',
    linkedin: 'LinkedIn',
    instagram: 'Instagram',
    facebook: 'Facebook',
    twitter: 'Twitter',
    scholar: 'Google Scholar',
  },
  footer: {
    copyright: '© 2025 Eleva Care. Todos os direitos reservados.',
    privacy: 'Política de Privacidade',
    terms: 'Termos e Condições',
  },
  experts: {
    title: 'Especialistas de Topo',
    subtitle: 'O acesso aos melhores nunca foi tão fácil',
  },
};
