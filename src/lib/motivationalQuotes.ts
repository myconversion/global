import type { SupportedLanguage } from '@/i18n';

export interface Quote {
  text: string;
  author: string;
}

const quotesPtBR: Quote[] = [
  { text: "O sucesso nasce do querer, da determinação e persistência.", author: "José de Alencar" },
  { text: "A única forma de fazer um excelente trabalho é amar o que você faz.", author: "Steve Jobs" },
  { text: "Não espere por uma crise para descobrir o que é importante na sua vida.", author: "Platão" },
  { text: "O segredo de progredir é começar.", author: "Mark Twain" },
  { text: "Acredite em si mesmo e chegará um dia em que os outros não terão outra escolha senão acreditar com você.", author: "Cynthia Kersey" },
  { text: "Grandes realizações não são feitas por impulso, mas por uma soma de pequenas realizações.", author: "Vincent Van Gogh" },
  { text: "Você não precisa ser perfeito para começar, mas precisa começar para ser perfeito.", author: "Zig Ziglar" },
  { text: "A persistência é o caminho do êxito.", author: "Charles Chaplin" },
  { text: "Toda grande caminhada começa com um simples passo.", author: "Lao Tsé" },
  { text: "Só se pode alcançar um grande êxito quando nos mantemos fiéis a nós mesmos.", author: "Friedrich Nietzsche" },
  { text: "O insucesso é apenas uma oportunidade para recomeçar com mais inteligência.", author: "Henry Ford" },
  { text: "Não é a força, mas a constância dos bons resultados que conduz os homens à felicidade.", author: "Friedrich Nietzsche" },
  { text: "A mente que se abre a uma nova ideia jamais voltará ao seu tamanho original.", author: "Albert Einstein" },
  { text: "Talento vence jogos, mas só o trabalho em equipe ganha campeonatos.", author: "Michael Jordan" },
  { text: "Seja a mudança que você deseja ver no mundo.", author: "Mahatma Gandhi" },
  { text: "O único lugar onde o sucesso vem antes do trabalho é no dicionário.", author: "Albert Einstein" },
  { text: "Coragem não é a ausência de medo, mas o julgamento de que algo é mais importante que o medo.", author: "Ambrose Redmoon" },
  { text: "Quanto maior a dificuldade, maior a glória em superá-la.", author: "Epicuro" },
  { text: "A educação é a arma mais poderosa que você pode usar para mudar o mundo.", author: "Nelson Mandela" },
  { text: "Nossas maiores fraquezas residem em desistir. O caminho mais certo para o sucesso é sempre tentar mais uma vez.", author: "Thomas Edison" },
  { text: "O futuro pertence àqueles que acreditam na beleza de seus sonhos.", author: "Eleanor Roosevelt" },
  { text: "Faça o que puder, com o que tiver, onde estiver.", author: "Theodore Roosevelt" },
  { text: "A sorte favorece a mente preparada.", author: "Louis Pasteur" },
  { text: "O conhecimento fala, mas a sabedoria escuta.", author: "Jimi Hendrix" },
  { text: "Você nunca sabe que resultados virão da sua ação. Mas se você não fizer nada, não existirão resultados.", author: "Mahatma Gandhi" },
  { text: "É nos momentos de decisão que o seu destino é traçado.", author: "Tony Robbins" },
  { text: "A vida é 10% o que acontece comigo e 90% como eu reajo a isso.", author: "Charles Swindoll" },
  { text: "Não tenha medo de desistir do bom para perseguir o ótimo.", author: "John D. Rockefeller" },
  { text: "A criatividade é a inteligência se divertindo.", author: "Albert Einstein" },
  { text: "O homem não é produto das circunstâncias, as circunstâncias são produtos dos homens.", author: "Benjamin Disraeli" },
  { text: "Quem não luta pelo futuro que quer, deve aceitar o futuro que vier.", author: "Machado de Assis" },
  { text: "A simplicidade é o último grau de sofisticação.", author: "Leonardo da Vinci" },
  { text: "Sonhos determinam o que você quer. Ação determina o que você conquista.", author: "Aldo Novak" },
  { text: "Liderança não é sobre estar no comando. É sobre cuidar daqueles que estão sob seu comando.", author: "Simon Sinek" },
  { text: "O pessimista vê dificuldade em cada oportunidade. O otimista vê oportunidade em cada dificuldade.", author: "Winston Churchill" },
  { text: "Não são as espécies mais fortes que sobrevivem, mas as que melhor se adaptam às mudanças.", author: "Charles Darwin" },
  { text: "A felicidade não é algo pronto. Ela vem das suas próprias ações.", author: "Dalai Lama" },
  { text: "Concentre-se nos pontos fortes, reconheça as fraquezas, agarre as oportunidades e proteja-se contra as ameaças.", author: "Sun Tzu" },
  { text: "A diferença entre o ordinário e o extraordinário é aquele pequeno extra.", author: "Jimmy Johnson" },
  { text: "Inovação distingue um líder de um seguidor.", author: "Steve Jobs" },
  { text: "A melhor maneira de prever o futuro é criá-lo.", author: "Peter Drucker" },
  { text: "Não importa o quão devagar você vá, desde que não pare.", author: "Confúcio" },
  { text: "Aqueles que são loucos o suficiente para pensar que podem mudar o mundo são os que o fazem.", author: "Steve Jobs" },
  { text: "A disciplina é a ponte entre metas e realizações.", author: "Jim Rohn" },
  { text: "Se você quer algo que nunca teve, precisa fazer algo que nunca fez.", author: "Thomas Jefferson" },
  { text: "O maior risco é não correr risco algum.", author: "Mark Zuckerberg" },
  { text: "Pessoas de sucesso fazem o que pessoas sem sucesso não estão dispostas a fazer.", author: "Jim Rohn" },
  { text: "Transforme suas feridas em sabedoria.", author: "Oprah Winfrey" },
  { text: "O tempo é o recurso mais escasso e, a menos que seja gerenciado, nada mais pode ser gerenciado.", author: "Peter Drucker" },
  { text: "Tudo o que um sonho precisa para ser realizado é alguém que acredite que ele possa ser realizado.", author: "Roberto Shinyashiki" },
];

const quotesEn: Quote[] = [
  { text: "Success is born from desire, determination, and persistence.", author: "José de Alencar" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Don't wait for a crisis to discover what is important in your life.", author: "Plato" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Believe in yourself and there will come a day when others will have no choice but to believe with you.", author: "Cynthia Kersey" },
  { text: "Great achievements are not made by impulse, but by a sum of small achievements.", author: "Vincent Van Gogh" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Persistence is the path to success.", author: "Charles Chaplin" },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "Great success can only be achieved when we remain true to ourselves.", author: "Friedrich Nietzsche" },
  { text: "Failure is simply the opportunity to begin again, this time more intelligently.", author: "Henry Ford" },
  { text: "It is not strength, but the consistency of good results that leads to happiness.", author: "Friedrich Nietzsche" },
  { text: "The mind that opens to a new idea never returns to its original size.", author: "Albert Einstein" },
  { text: "Talent wins games, but teamwork wins championships.", author: "Michael Jordan" },
  { text: "Be the change you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "The only place where success comes before work is in the dictionary.", author: "Albert Einstein" },
  { text: "Courage is not the absence of fear, but the judgment that something is more important than fear.", author: "Ambrose Redmoon" },
  { text: "The greater the difficulty, the greater the glory in overcoming it.", author: "Epicurus" },
  { text: "Education is the most powerful weapon you can use to change the world.", author: "Nelson Mandela" },
  { text: "Our greatest weakness lies in giving up. The surest way to succeed is to try one more time.", author: "Thomas Edison" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "Fortune favors the prepared mind.", author: "Louis Pasteur" },
  { text: "Knowledge speaks, but wisdom listens.", author: "Jimi Hendrix" },
  { text: "You never know what results will come from your action. But if you do nothing, there will be no results.", author: "Mahatma Gandhi" },
  { text: "It is in your moments of decision that your destiny is shaped.", author: "Tony Robbins" },
  { text: "Life is 10% what happens to me and 90% how I react to it.", author: "Charles Swindoll" },
  { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
  { text: "Creativity is intelligence having fun.", author: "Albert Einstein" },
  { text: "Man is not the product of circumstances; circumstances are the product of man.", author: "Benjamin Disraeli" },
  { text: "Those who don't fight for the future they want must accept whatever comes.", author: "Machado de Assis" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Dreams determine what you want. Action determines what you achieve.", author: "Aldo Novak" },
  { text: "Leadership is not about being in charge. It's about taking care of those in your charge.", author: "Simon Sinek" },
  { text: "The pessimist sees difficulty in every opportunity. The optimist sees opportunity in every difficulty.", author: "Winston Churchill" },
  { text: "It is not the strongest species that survives, but the one most adaptable to change.", author: "Charles Darwin" },
  { text: "Happiness is not something ready-made. It comes from your own actions.", author: "Dalai Lama" },
  { text: "Focus on strengths, acknowledge weaknesses, seize opportunities, and protect against threats.", author: "Sun Tzu" },
  { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
  { text: "Innovation distinguishes a leader from a follower.", author: "Steve Jobs" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "The people who are crazy enough to think they can change the world are the ones who do.", author: "Steve Jobs" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "If you want something you've never had, you must do something you've never done.", author: "Thomas Jefferson" },
  { text: "The biggest risk is not taking any risk.", author: "Mark Zuckerberg" },
  { text: "Successful people do what unsuccessful people are not willing to do.", author: "Jim Rohn" },
  { text: "Turn your wounds into wisdom.", author: "Oprah Winfrey" },
  { text: "Time is the scarcest resource and unless it is managed, nothing else can be managed.", author: "Peter Drucker" },
  { text: "All a dream needs to come true is someone who believes it can.", author: "Roberto Shinyashiki" },
];

const quotesEs: Quote[] = [
  { text: "El éxito nace del querer, la determinación y la persistencia.", author: "José de Alencar" },
  { text: "La única forma de hacer un gran trabajo es amar lo que haces.", author: "Steve Jobs" },
  { text: "No esperes una crisis para descubrir qué es importante en tu vida.", author: "Platón" },
  { text: "El secreto para avanzar es comenzar.", author: "Mark Twain" },
  { text: "Cree en ti mismo y llegará el día en que los demás no tendrán otra opción que creer contigo.", author: "Cynthia Kersey" },
  { text: "Las grandes realizaciones no se hacen por impulso, sino por una suma de pequeñas realizaciones.", author: "Vincent Van Gogh" },
  { text: "No necesitas ser perfecto para empezar, pero necesitas empezar para ser perfecto.", author: "Zig Ziglar" },
  { text: "La persistencia es el camino del éxito.", author: "Charles Chaplin" },
  { text: "Todo gran viaje comienza con un simple paso.", author: "Lao Tse" },
  { text: "Solo se puede alcanzar un gran éxito cuando nos mantenemos fieles a nosotros mismos.", author: "Friedrich Nietzsche" },
  { text: "El fracaso es simplemente la oportunidad de comenzar de nuevo, esta vez con más inteligencia.", author: "Henry Ford" },
  { text: "No es la fuerza, sino la constancia de los buenos resultados lo que conduce a la felicidad.", author: "Friedrich Nietzsche" },
  { text: "La mente que se abre a una nueva idea jamás volverá a su tamaño original.", author: "Albert Einstein" },
  { text: "El talento gana partidos, pero el trabajo en equipo gana campeonatos.", author: "Michael Jordan" },
  { text: "Sé el cambio que deseas ver en el mundo.", author: "Mahatma Gandhi" },
  { text: "El único lugar donde el éxito viene antes que el trabajo es en el diccionario.", author: "Albert Einstein" },
  { text: "El coraje no es la ausencia de miedo, sino el juicio de que algo es más importante que el miedo.", author: "Ambrose Redmoon" },
  { text: "Cuanto mayor es la dificultad, mayor es la gloria en superarla.", author: "Epicuro" },
  { text: "La educación es el arma más poderosa que puedes usar para cambiar el mundo.", author: "Nelson Mandela" },
  { text: "Nuestra mayor debilidad reside en rendirnos. El camino más seguro al éxito es intentarlo una vez más.", author: "Thomas Edison" },
  { text: "El futuro pertenece a aquellos que creen en la belleza de sus sueños.", author: "Eleanor Roosevelt" },
  { text: "Haz lo que puedas, con lo que tengas, donde estés.", author: "Theodore Roosevelt" },
  { text: "La suerte favorece a la mente preparada.", author: "Louis Pasteur" },
  { text: "El conocimiento habla, pero la sabiduría escucha.", author: "Jimi Hendrix" },
  { text: "Nunca sabes qué resultados vendrán de tu acción. Pero si no haces nada, no habrá resultados.", author: "Mahatma Gandhi" },
  { text: "Es en tus momentos de decisión que tu destino se traza.", author: "Tony Robbins" },
  { text: "La vida es 10% lo que me sucede y 90% cómo reacciono ante ello.", author: "Charles Swindoll" },
  { text: "No tengas miedo de dejar lo bueno para perseguir lo excelente.", author: "John D. Rockefeller" },
  { text: "La creatividad es la inteligencia divirtiéndose.", author: "Albert Einstein" },
  { text: "El hombre no es producto de las circunstancias, las circunstancias son producto de los hombres.", author: "Benjamin Disraeli" },
  { text: "Quien no lucha por el futuro que quiere, debe aceptar el que venga.", author: "Machado de Assis" },
  { text: "La simplicidad es el último grado de sofisticación.", author: "Leonardo da Vinci" },
  { text: "Los sueños determinan lo que quieres. La acción determina lo que conquistas.", author: "Aldo Novak" },
  { text: "El liderazgo no es estar al mando. Es cuidar de quienes están a tu cargo.", author: "Simon Sinek" },
  { text: "El pesimista ve dificultad en cada oportunidad. El optimista ve oportunidad en cada dificultad.", author: "Winston Churchill" },
  { text: "No son las especies más fuertes las que sobreviven, sino las que mejor se adaptan a los cambios.", author: "Charles Darwin" },
  { text: "La felicidad no es algo hecho. Viene de tus propias acciones.", author: "Dalai Lama" },
  { text: "Concéntrate en las fortalezas, reconoce las debilidades, aprovecha las oportunidades y protégete de las amenazas.", author: "Sun Tzu" },
  { text: "La diferencia entre lo ordinario y lo extraordinario es ese pequeño extra.", author: "Jimmy Johnson" },
  { text: "La innovación distingue a un líder de un seguidor.", author: "Steve Jobs" },
  { text: "La mejor manera de predecir el futuro es crearlo.", author: "Peter Drucker" },
  { text: "No importa cuán lento vayas, siempre y cuando no te detengas.", author: "Confucio" },
  { text: "Los que están lo suficientemente locos como para pensar que pueden cambiar el mundo son los que lo hacen.", author: "Steve Jobs" },
  { text: "La disciplina es el puente entre las metas y los logros.", author: "Jim Rohn" },
  { text: "Si quieres algo que nunca has tenido, debes hacer algo que nunca has hecho.", author: "Thomas Jefferson" },
  { text: "El mayor riesgo es no correr ningún riesgo.", author: "Mark Zuckerberg" },
  { text: "Las personas exitosas hacen lo que las personas sin éxito no están dispuestas a hacer.", author: "Jim Rohn" },
  { text: "Convierte tus heridas en sabiduría.", author: "Oprah Winfrey" },
  { text: "El tiempo es el recurso más escaso y, a menos que se gestione, nada más puede ser gestionado.", author: "Peter Drucker" },
  { text: "Todo lo que un sueño necesita para hacerse realidad es alguien que crea que puede realizarse.", author: "Roberto Shinyashiki" },
];

const allQuotes: Record<SupportedLanguage, Quote[]> = {
  'pt-BR': quotesPtBR,
  en: quotesEn,
  es: quotesEs,
};

// Keep backward-compat export
export const motivationalQuotes = quotesPtBR;

/**
 * Returns quotes for the given language.
 */
export function getQuotes(lang: SupportedLanguage): Quote[] {
  return allQuotes[lang] ?? quotesEn;
}

/**
 * Returns a deterministic quote based on the current date (changes daily).
 */
export function getDailyQuote(lang: SupportedLanguage = 'pt-BR'): Quote {
  const quotes = getQuotes(lang);
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const index = seed % quotes.length;
  return quotes[index];
}
