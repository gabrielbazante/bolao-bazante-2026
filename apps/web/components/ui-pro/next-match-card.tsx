import { Clock } from "lucide-react";

type Team = { id: number; name_pt: string; flag_emoji: string };
type Fixture = {
  id: number;
  kickoff_at: string;
  home: Team;
  away: Team;
};

interface NextMatchCardProps {
  fixture: Fixture;
  myBet?: { home_score: number; away_score: number } | null;
}

export function NextMatchCard({ fixture, myBet }: NextMatchCardProps) {
  const kickoff = new Date(fixture.kickoff_at);
  const dateStr = kickoff.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="depth-card hover-lift bg-card p-4">
      {/* Label */}
      <div className="mb-3 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        <Clock size={11} />
        PRÓXIMO JOGO · {dateStr}
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 flex-col items-center gap-1">
          <span className="text-3xl" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.2))" }}>
            {fixture.home.flag_emoji}
          </span>
          <span className="text-xs font-bold">{fixture.home.name_pt}</span>
        </div>

        <div
          className="px-3 font-display text-2xl text-primary"
        >
          VS
        </div>

        <div className="flex flex-1 flex-col items-center gap-1">
          <span className="text-3xl" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.2))" }}>
            {fixture.away.flag_emoji}
          </span>
          <span className="text-xs font-bold">{fixture.away.name_pt}</span>
        </div>
      </div>

      {/* Bet pill or date */}
      <div
        className="mt-3 rounded-xl px-3 py-2 text-center text-xs font-semibold text-primary"
        style={{ background: "linear-gradient(90deg, #f0f9ff, #fff, #f0f9ff)" }}
      >
        {myBet != null
          ? <>Seu palpite: <strong>{myBet.home_score} × {myBet.away_score}</strong> ✓</>
          : "Sem palpite ainda — vá palpitar!"}
      </div>
    </div>
  );
}
