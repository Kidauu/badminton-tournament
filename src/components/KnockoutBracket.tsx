import { Trophy } from "lucide-react";
import { teamPlayerNames } from "../logic/format";
import { BracketMatchCard } from "./BracketMatchCard";
import { cellsFromMatch } from "./ScoreLine";
import type { Match, Participant, Team } from "../types/tournament";

interface KnockoutBracketProps {
  semifinal1: Match;
  semifinal2: Match;
  final: Match;
  thirdPlace: Match;
  teamsById: Map<string, Team>;
  participants: Participant[];
}

function buildSide(teamId: string | null, teamsById: Map<string, Team>, participants: Participant[], match: Match, side: "A" | "B", seed?: string) {
  if (!teamId) return null;
  const team = teamsById.get(teamId);
  if (!team) return null;
  const [a, b] = teamPlayerNames(team, participants);
  return { seed, name: `Tim ${team.seq}`, members: `${a} & ${b}`, cells: cellsFromMatch(match, side, 3) };
}

function winnerOf(match: Match): "A" | "B" | null {
  if (!match.winnerTeamId) return null;
  return match.winnerTeamId === match.teamAId ? "A" : "B";
}

/** Garis penghubung antar-ronde; `active` = ronde sebelumnya sudah selesai. */
function Join({ top, bottom, kind = "merge" }: { top: boolean; bottom?: boolean; kind?: "merge" | "link" }) {
  if (kind === "link") {
    return (
      <div className="bracket-join bracket-join-link" aria-hidden="true">
        <span className={`bracket-join-stub ${top ? "is-active" : ""}`} />
      </div>
    );
  }
  return (
    <div className="bracket-join" aria-hidden="true">
      <span className={`bracket-join-arm bracket-join-arm-top ${top ? "is-active" : ""}`} />
      <span className={`bracket-join-arm bracket-join-arm-bottom ${bottom ? "is-active" : ""}`} />
      <span className={`bracket-join-stub ${top && bottom ? "is-active" : ""}`} />
    </div>
  );
}

function WinnerSlot({ team, names, label, bronze }: { team?: Team; names: [string, string] | null; label: string; bronze?: boolean }) {
  if (!team || !names) {
    return <div className="bracket-slot bracket-slot-empty">Menunggu {label.toLowerCase()}</div>;
  }
  return (
    <div className={`bracket-slot ${bronze ? "bracket-slot-bronze" : "bracket-slot-champion"}`}>
      <span className="bracket-slot-label">
        {!bronze && <Trophy size={14} />}
        {label}
      </span>
      <p className="bracket-slot-name">
        {names[0]} &amp; {names[1]}
      </p>
      <p className="bracket-slot-sub mono-num">Tim {team.seq}</p>
    </div>
  );
}

export function KnockoutBracket({ semifinal1, semifinal2, final, thirdPlace, teamsById, participants }: KnockoutBracketProps) {
  const sf1Done = Boolean(semifinal1.result);
  const sf2Done = Boolean(semifinal2.result);
  const finalDone = Boolean(final.winnerTeamId);
  const thirdDone = Boolean(thirdPlace.winnerTeamId);

  const championTeam = final.winnerTeamId ? teamsById.get(final.winnerTeamId) : undefined;
  const thirdTeam = thirdPlace.winnerTeamId ? teamsById.get(thirdPlace.winnerTeamId) : undefined;
  const names = (team?: Team) => (team ? teamPlayerNames(team, participants) : null);

  const side = (match: Match, which: "A" | "B", seed?: string) =>
    buildSide(which === "A" ? match.teamAId : match.teamBId, teamsById, participants, match, which, seed);

  return (
    <div className="bracket-scroll">
      <div className="bracket" aria-label="Bagan gugur">
        <div className="bracket-heads" aria-hidden="true">
          <span>Semifinal</span>
          <span />
          <span>Final</span>
          <span />
          <span>Juara</span>
        </div>

        <div className="bracket-row bracket-row-main">
          <div className="bracket-col bracket-col-semis">
            <BracketMatchCard
              roundLabel="Semifinal 1"
              done={sf1Done}
              sideA={side(semifinal1, "A", "A1")}
              sideB={side(semifinal1, "B", "B2")}
              winnerSide={winnerOf(semifinal1)}
              placeholderA="Juara Grup A"
              placeholderB="Runner-up Grup B"
            />
            <BracketMatchCard
              roundLabel="Semifinal 2"
              done={sf2Done}
              sideA={side(semifinal2, "A", "B1")}
              sideB={side(semifinal2, "B", "A2")}
              winnerSide={winnerOf(semifinal2)}
              placeholderA="Juara Grup B"
              placeholderB="Runner-up Grup A"
            />
          </div>

          <Join top={sf1Done} bottom={sf2Done} />

          <div className="bracket-col bracket-col-final">
            <BracketMatchCard
              roundLabel="Final"
              done={finalDone}
              sideA={side(final, "A")}
              sideB={side(final, "B")}
              winnerSide={winnerOf(final)}
              placeholderA="Pemenang Semifinal 1"
              placeholderB="Pemenang Semifinal 2"
            />
          </div>

          <Join kind="link" top={finalDone} />

          <div className="bracket-col">
            <WinnerSlot team={championTeam} names={names(championTeam)} label="Juara" />
          </div>
        </div>

        <div className="bracket-divider">
          <span>Perebutan Juara 3</span>
        </div>

        <div className="bracket-row bracket-row-third">
          <div className="bracket-col bracket-col-sources">
            <span className="bracket-source">Kalah Semifinal 1</span>
            <span className="bracket-source">Kalah Semifinal 2</span>
          </div>

          <Join top={sf1Done && !semifinal1.isBye} bottom={sf2Done && !semifinal2.isBye} />

          <div className="bracket-col bracket-col-final">
            <BracketMatchCard
              roundLabel="Perebutan Juara 3"
              done={thirdDone}
              sideA={side(thirdPlace, "A")}
              sideB={side(thirdPlace, "B")}
              winnerSide={winnerOf(thirdPlace)}
              placeholderA="Kalah Semifinal 1"
              placeholderB="Kalah Semifinal 2"
            />
          </div>

          <Join kind="link" top={thirdDone} />

          <div className="bracket-col">
            <WinnerSlot team={thirdTeam} names={names(thirdTeam)} label="Juara 3" bronze />
          </div>
        </div>
      </div>
    </div>
  );
}
