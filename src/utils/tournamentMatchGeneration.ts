
import { Player, Match, MatchStage, TournamentFormat } from '@/types/tournament.types';

// Generate matches for knockout tournament format
export const generateKnockoutMatches = (players: Player[]): Match[] => {
  if (players.length < 2) {
    return [];
  }
  
  if (players.length % 2 !== 0) {
    console.error("Knockout tournament requires an even number of players");
    return [];
  }
  
  const matches: Match[] = [];
  let matchId = 1;
  const currentDate = new Date();
  
  // For a simple tournament structure, create a single elimination bracket
  if (players.length === 2) {
    // If there are only two players, create a final match directly
    matches.push({
      id: `match-${matchId++}`,
      round: 1,
      player1Id: players[0].id,
      player2Id: players[1].id,
      completed: false,
      scheduledDate: currentDate.toISOString().split('T')[0],
      scheduledTime: '18:00',
      status: 'scheduled',
      stage: 'final'
    });
    
    return matches;
  }

  // Special case for 6 players
  if (players.length === 6) {
    // Create first round with 2 matches (4 players)
    matches.push({
      id: `match-1`,
      round: 1,
      player1Id: players[0].id,
      player2Id: players[1].id,
      completed: false,
      scheduledDate: currentDate.toISOString().split('T')[0],
      scheduledTime: '17:00',
      status: 'scheduled',
      stage: 'quarter_final',
      nextMatchId: `match-4` // Winner goes to first semifinal
    });

    matches.push({
      id: `match-2`,
      round: 1,
      player1Id: players[2].id,
      player2Id: players[3].id,
      completed: false,
      scheduledDate: currentDate.toISOString().split('T')[0],
      scheduledTime: '18:00',
      status: 'scheduled',
      stage: 'quarter_final',
      nextMatchId: `match-4` // Winner goes to first semifinal
    });

    matches.push({
      id: `match-3`,
      round: 1,
      player1Id: players[4].id,
      player2Id: players[5].id,
      completed: false,
      scheduledDate: currentDate.toISOString().split('T')[0],
      scheduledTime: '19:00',
      status: 'scheduled',
      stage: 'quarter_final',
      nextMatchId: `match-5` // Winner goes directly to second semifinal
    });

    // Create semifinal match for players coming from matches 1 and 2
    matches.push({
      id: `match-4`,
      round: 2,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      scheduledTime: '17:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-6`
    });

    // Create semifinal "match" for winner of match 3 (directly goes to semi)
    matches.push({
      id: `match-5`,
      round: 2,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      scheduledTime: '18:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-6`
    });

    // Create the final
    matches.push({
      id: `match-6`,
      round: 3,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      scheduledTime: '19:00',
      status: 'scheduled',
      stage: 'final'
    });

    return matches;
  }
  
  // For other player counts, create a proper bracket
  const numPlayers = players.length;
  const numRounds = Math.ceil(Math.log2(numPlayers));
  const totalMatches = numPlayers - 1; // In a single elimination tournament with n players, there are always n-1 matches
  
  // Create empty structure for all matches
  for (let round = 1; round <= numRounds; round++) {
    // Calculate matches in this round
    const matchesInRound = Math.floor(Math.pow(2, numRounds - round));
    
    for (let i = 0; i < matchesInRound; i++) {
      // Determine stage based on round
      let stage: MatchStage = 'regular';
      if (round === numRounds) stage = 'final';
      else if (round === numRounds - 1) stage = 'semi_final';
      else if (round === numRounds - 2) stage = 'quarter_final';
      
      const match: Match = {
        id: `match-${matchId++}`,
        round: round,
        player1Id: '',
        player2Id: '',
        completed: false,
        scheduledDate: new Date(currentDate.getTime() + (round - 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduledTime: `${16 + (i % 8)}:00`,
        status: 'scheduled',
        stage
      };
      
      // Link to next match if it's not the final
      if (round < numRounds) {
        const nextRoundMatchIndex = Math.floor(i / 2);
        match.nextMatchId = `match-${totalMatches - matchesInRound / 2 + nextRoundMatchIndex + 1}`;
      }
      
      matches.push(match);
    }
  }
  
  // Shuffle players for randomized seeding
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  
  // Assign players to first round matches
  const firstRoundMatches = matches.filter(m => m.round === 1);
  let playerIndex = 0;
  
  for (const match of firstRoundMatches) {
    if (playerIndex < shuffledPlayers.length) {
      match.player1Id = shuffledPlayers[playerIndex++].id;
    }
    if (playerIndex < shuffledPlayers.length) {
      match.player2Id = shuffledPlayers[playerIndex++].id;
    }
  }
  
  return matches.sort((a, b) => a.round - b.round || parseInt(a.id.split('-')[1]) - parseInt(b.id.split('-')[1]));
};

// Generate matches for league tournament format
export const generateLeagueMatches = (players: Player[]): Match[] => {
  if (players.length < 2) {
    return [];
  }
  
  const matches: Match[] = [];
  let matchId = 1;
  const currentDate = new Date();
  
  // Generate all possible combinations of players (round-robin)
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const matchNumber = matchId - 1;
      const dayOffset = Math.floor(matchNumber / 4); // 4 matches per day
      const timeSlot = matchNumber % 4;
      const startHour = 16 + timeSlot; // Start from 4 PM
      
      matches.push({
        id: `match-${matchId++}`,
        round: 1, // All matches are in round 1 for league format
        player1Id: players[i].id,
        player2Id: players[j].id,
        completed: false,
        scheduledDate: new Date(currentDate.getTime() + dayOffset * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduledTime: `${startHour}:00`,
        status: 'scheduled',
        stage: 'regular'
      });
    }
  }
  
  return matches;
};

// Main function to generate matches based on tournament format
export const generateTournamentMatches = (players: Player[], format: TournamentFormat): Match[] => {
  switch (format) {
    case 'knockout':
      return generateKnockoutMatches(players);
    case 'league':
      return generateLeagueMatches(players);
    default:
      return generateKnockoutMatches(players); // Default to knockout
  }
};
