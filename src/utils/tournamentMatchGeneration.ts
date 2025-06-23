
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
  
  // Shuffle players for randomized seeding
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  
  // Calculate tournament structure
  const numRounds = Math.ceil(Math.log2(players.length));
  
  // Special handling for different player counts to ensure proper bracket structure
  if (players.length === 2) {
    // Direct final
    matches.push({
      id: `match-${matchId++}`,
      round: 1,
      player1Id: shuffledPlayers[0].id,
      player2Id: shuffledPlayers[1].id,
      completed: false,
      scheduledDate: currentDate.toISOString().split('T')[0],
      scheduledTime: '18:00',
      status: 'scheduled',
      stage: 'final'
    });
    return matches;
  }

  if (players.length === 4) {
    // Semi-finals
    matches.push({
      id: `match-1`,
      round: 1,
      player1Id: shuffledPlayers[0].id,
      player2Id: shuffledPlayers[1].id,
      completed: false,
      scheduledDate: currentDate.toISOString().split('T')[0],
      scheduledTime: '17:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-3`
    });

    matches.push({
      id: `match-2`,
      round: 1,
      player1Id: shuffledPlayers[2].id,
      player2Id: shuffledPlayers[3].id,
      completed: false,
      scheduledDate: currentDate.toISOString().split('T')[0],
      scheduledTime: '18:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-3`
    });

    // Final
    matches.push({
      id: `match-3`,
      round: 2,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      scheduledTime: '19:00',
      status: 'scheduled',
      stage: 'final'
    });

    return matches;
  }

  if (players.length === 6) {
    // Create first round with 2 matches
    matches.push({
      id: `match-1`,
      round: 1,
      player1Id: shuffledPlayers[0].id,
      player2Id: shuffledPlayers[1].id,
      completed: false,
      scheduledDate: currentDate.toISOString().split('T')[0],
      scheduledTime: '16:00',
      status: 'scheduled',
      stage: 'quarter_final',
      nextMatchId: `match-4`
    });

    matches.push({
      id: `match-2`,
      round: 1,
      player1Id: shuffledPlayers[2].id,
      player2Id: shuffledPlayers[3].id,
      completed: false,
      scheduledDate: currentDate.toISOString().split('T')[0],
      scheduledTime: '17:00',
      status: 'scheduled',
      stage: 'quarter_final',
      nextMatchId: `match-4`
    });

    matches.push({
      id: `match-3`,
      round: 1,
      player1Id: shuffledPlayers[4].id,
      player2Id: shuffledPlayers[5].id,
      completed: false,
      scheduledDate: currentDate.toISOString().split('T')[0],
      scheduledTime: '18:00',
      status: 'scheduled',
      stage: 'quarter_final',
      nextMatchId: `match-5`
    });

    // Semi-finals
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

    // Final
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

  if (players.length === 8) {
    // Quarter-finals (4 matches)
    for (let i = 0; i < 4; i++) {
      matches.push({
        id: `match-${i + 1}`,
        round: 1,
        player1Id: shuffledPlayers[i * 2].id,
        player2Id: shuffledPlayers[i * 2 + 1].id,
        completed: false,
        scheduledDate: currentDate.toISOString().split('T')[0],
        scheduledTime: `${16 + i}:00`,
        status: 'scheduled',
        stage: 'quarter_final',
        nextMatchId: `match-${5 + Math.floor(i / 2)}`
      });
    }

    // Semi-finals (2 matches)
    matches.push({
      id: `match-5`,
      round: 2,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      scheduledTime: '17:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-7`
    });

    matches.push({
      id: `match-6`,
      round: 2,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      scheduledTime: '18:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-7`
    });

    // Final
    matches.push({
      id: `match-7`,
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

  // For larger tournaments (12, 14, 16+ players)
  let currentRound = 1;
  let currentPlayers = [...shuffledPlayers];
  
  // First round - reduce to power of 2 if necessary
  if (!isPowerOfTwo(players.length)) {
    const targetFirstRound = players.length - getNearestPowerOfTwo(players.length) / 2;
    
    for (let i = 0; i < targetFirstRound; i++) {
      matches.push({
        id: `match-${matchId++}`,
        round: currentRound,
        player1Id: currentPlayers[i * 2].id,
        player2Id: currentPlayers[i * 2 + 1].id,
        completed: false,
        scheduledDate: currentDate.toISOString().split('T')[0],
        scheduledTime: `${16 + (i % 8)}:00`,
        status: 'scheduled',
        stage: getStageForRound(currentRound, numRounds),
        nextMatchId: `match-${matchId + Math.floor(targetFirstRound / 2) + i / 2}`
      });
    }
    
    // Advance winners and remaining players
    currentPlayers = currentPlayers.slice(targetFirstRound * 2);
    currentRound++;
  }
  
  // Continue with standard bracket
  while (currentPlayers.length > 1 || (currentPlayers.length === 0 && currentRound <= numRounds)) {
    const matchesInRound = Math.max(1, Math.ceil(currentPlayers.length / 2));
    
    for (let i = 0; i < matchesInRound; i++) {
      const stage = getStageForRound(currentRound, numRounds);
      
      matches.push({
        id: `match-${matchId++}`,
        round: currentRound,
        player1Id: currentPlayers.length > i * 2 ? currentPlayers[i * 2].id : '',
        player2Id: currentPlayers.length > i * 2 + 1 ? currentPlayers[i * 2 + 1].id : '',
        completed: false,
        scheduledDate: new Date(currentDate.getTime() + (currentRound - 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduledTime: `${16 + (i % 8)}:00`,
        status: 'scheduled',
        stage,
        nextMatchId: currentRound < numRounds ? `match-${matchId + Math.floor(matchesInRound / 2) + Math.floor(i / 2)}` : undefined
      });
    }
    
    currentPlayers = Array(matchesInRound).fill(null).map(() => ({ id: '', name: 'TBD' }));
    currentRound++;
  }
  
  return matches.sort((a, b) => a.round - b.round || parseInt(a.id.split('-')[1]) - parseInt(b.id.split('-')[1]));
};

// Helper functions
function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

function getNearestPowerOfTwo(n: number): number {
  return Math.pow(2, Math.floor(Math.log2(n)));
}

function getStageForRound(round: number, totalRounds: number): MatchStage {
  if (round === totalRounds) return 'final';
  if (round === totalRounds - 1) return 'semi_final';
  if (round === totalRounds - 2) return 'quarter_final';
  return 'regular';
}

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
