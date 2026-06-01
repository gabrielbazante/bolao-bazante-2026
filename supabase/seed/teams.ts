// GENERATED from openfootball/worldcup.json — official FIFA 2026 draw
// Source: https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
// Last verified: 2026-06-01. If the official draw changes, update IDs and group_code here
// and re-run the seed. Source of truth: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026

export interface Team {
  id: number;
  fifa_code: string;
  name_pt: string;
  flag_emoji: string;
  group_code: string;
}

export const TEAMS: Team[] = [
  // Group A
  { id: 1,  fifa_code: "MEX", name_pt: "México",              flag_emoji: "🇲🇽", group_code: "A" },
  { id: 2,  fifa_code: "RSA", name_pt: "África do Sul",       flag_emoji: "🇿🇦", group_code: "A" },
  { id: 3,  fifa_code: "KOR", name_pt: "Coreia do Sul",       flag_emoji: "🇰🇷", group_code: "A" },
  { id: 4,  fifa_code: "CZE", name_pt: "República Tcheca",    flag_emoji: "🇨🇿", group_code: "A" },
  // Group B
  { id: 5,  fifa_code: "CAN", name_pt: "Canadá",              flag_emoji: "🇨🇦", group_code: "B" },
  { id: 6,  fifa_code: "BIH", name_pt: "Bósnia e Herzegovina",flag_emoji: "🇧🇦", group_code: "B" },
  { id: 7,  fifa_code: "QAT", name_pt: "Catar",               flag_emoji: "🇶🇦", group_code: "B" },
  { id: 8,  fifa_code: "SUI", name_pt: "Suíça",               flag_emoji: "🇨🇭", group_code: "B" },
  // Group C
  { id: 9,  fifa_code: "BRA", name_pt: "Brasil",              flag_emoji: "🇧🇷", group_code: "C" },
  { id: 10, fifa_code: "MAR", name_pt: "Marrocos",            flag_emoji: "🇲🇦", group_code: "C" },
  { id: 11, fifa_code: "HAI", name_pt: "Haiti",               flag_emoji: "🇭🇹", group_code: "C" },
  { id: 12, fifa_code: "SCO", name_pt: "Escócia",             flag_emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group_code: "C" },
  // Group D
  { id: 13, fifa_code: "USA", name_pt: "Estados Unidos",      flag_emoji: "🇺🇸", group_code: "D" },
  { id: 14, fifa_code: "PAR", name_pt: "Paraguai",            flag_emoji: "🇵🇾", group_code: "D" },
  { id: 15, fifa_code: "AUS", name_pt: "Austrália",           flag_emoji: "🇦🇺", group_code: "D" },
  { id: 16, fifa_code: "TUR", name_pt: "Turquia",             flag_emoji: "🇹🇷", group_code: "D" },
  // Group E
  { id: 17, fifa_code: "GER", name_pt: "Alemanha",            flag_emoji: "🇩🇪", group_code: "E" },
  { id: 18, fifa_code: "CUW", name_pt: "Curaçao",             flag_emoji: "🇨🇼", group_code: "E" },
  { id: 19, fifa_code: "CIV", name_pt: "Costa do Marfim",     flag_emoji: "🇨🇮", group_code: "E" },
  { id: 20, fifa_code: "ECU", name_pt: "Equador",             flag_emoji: "🇪🇨", group_code: "E" },
  // Group F
  { id: 21, fifa_code: "NED", name_pt: "Holanda",             flag_emoji: "🇳🇱", group_code: "F" },
  { id: 22, fifa_code: "JPN", name_pt: "Japão",               flag_emoji: "🇯🇵", group_code: "F" },
  { id: 23, fifa_code: "SWE", name_pt: "Suécia",              flag_emoji: "🇸🇪", group_code: "F" },
  { id: 24, fifa_code: "TUN", name_pt: "Tunísia",             flag_emoji: "🇹🇳", group_code: "F" },
  // Group G
  { id: 25, fifa_code: "BEL", name_pt: "Bélgica",             flag_emoji: "🇧🇪", group_code: "G" },
  { id: 26, fifa_code: "EGY", name_pt: "Egito",               flag_emoji: "🇪🇬", group_code: "G" },
  { id: 27, fifa_code: "IRN", name_pt: "Irã",                 flag_emoji: "🇮🇷", group_code: "G" },
  { id: 28, fifa_code: "NZL", name_pt: "Nova Zelândia",       flag_emoji: "🇳🇿", group_code: "G" },
  // Group H
  { id: 29, fifa_code: "ESP", name_pt: "Espanha",             flag_emoji: "🇪🇸", group_code: "H" },
  { id: 30, fifa_code: "CPV", name_pt: "Cabo Verde",          flag_emoji: "🇨🇻", group_code: "H" },
  { id: 31, fifa_code: "KSA", name_pt: "Arábia Saudita",      flag_emoji: "🇸🇦", group_code: "H" },
  { id: 32, fifa_code: "URU", name_pt: "Uruguai",             flag_emoji: "🇺🇾", group_code: "H" },
  // Group I
  { id: 33, fifa_code: "FRA", name_pt: "França",              flag_emoji: "🇫🇷", group_code: "I" },
  { id: 34, fifa_code: "SEN", name_pt: "Senegal",             flag_emoji: "🇸🇳", group_code: "I" },
  { id: 35, fifa_code: "IRQ", name_pt: "Iraque",              flag_emoji: "🇮🇶", group_code: "I" },
  { id: 36, fifa_code: "NOR", name_pt: "Noruega",             flag_emoji: "🇳🇴", group_code: "I" },
  // Group J
  { id: 37, fifa_code: "ARG", name_pt: "Argentina",           flag_emoji: "🇦🇷", group_code: "J" },
  { id: 38, fifa_code: "ALG", name_pt: "Argélia",             flag_emoji: "🇩🇿", group_code: "J" },
  { id: 39, fifa_code: "AUT", name_pt: "Áustria",             flag_emoji: "🇦🇹", group_code: "J" },
  { id: 40, fifa_code: "JOR", name_pt: "Jordânia",            flag_emoji: "🇯🇴", group_code: "J" },
  // Group K
  { id: 41, fifa_code: "POR", name_pt: "Portugal",            flag_emoji: "🇵🇹", group_code: "K" },
  { id: 42, fifa_code: "COD", name_pt: "Congo DR",            flag_emoji: "🇨🇩", group_code: "K" },
  { id: 43, fifa_code: "UZB", name_pt: "Uzbequistão",         flag_emoji: "🇺🇿", group_code: "K" },
  { id: 44, fifa_code: "COL", name_pt: "Colômbia",            flag_emoji: "🇨🇴", group_code: "K" },
  // Group L
  { id: 45, fifa_code: "ENG", name_pt: "Inglaterra",          flag_emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group_code: "L" },
  { id: 46, fifa_code: "CRO", name_pt: "Croácia",             flag_emoji: "🇭🇷", group_code: "L" },
  { id: 47, fifa_code: "GHA", name_pt: "Gana",                flag_emoji: "🇬🇭", group_code: "L" },
  { id: 48, fifa_code: "PAN", name_pt: "Panamá",              flag_emoji: "🇵🇦", group_code: "L" },
];
