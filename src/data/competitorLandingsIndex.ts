import { cueflowLandings } from "@/data/cueflowLandings";
import { cuebookLandings } from "@/data/cuebookLandings";
import { clubsyncLandings } from "@/data/clubsyncLandings";
import type { CompetitorLandingPage } from "@/data/competitorLandingTypes";

export const allCompetitorLandings: CompetitorLandingPage[] = [
  ...cueflowLandings,
  ...cuebookLandings,
  ...clubsyncLandings,
];

export const allCompetitorLandingPaths = allCompetitorLandings.map((p) => p.path);

export const competitorLandingByPath = (path: string): CompetitorLandingPage | undefined =>
  allCompetitorLandings.find((p) => p.path === path);
