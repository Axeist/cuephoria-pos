
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
  const tournamentDate = currentDate.toISOString().split('T')[0];
  
  // Shuffle players for randomized seeding
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  
  // Define time slots to avoid conflicts
  const timeSlots = [
    "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
  ];
  
  // Special handling for different player counts
  if (players.length === 2) {
    matches.push({
      id: `match-${matchId++}`,
      round: 1,
      player1Id: shuffledPlayers[0].id,
      player2Id: shuffledPlayers[1].id,
      completed: false,
      scheduledDate: tournamentDate,
      scheduledTime: '18:00', // Final at 6 PM
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
      scheduledDate: tournamentDate,
      scheduledTime: '15:00',
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
      scheduledDate: tournamentDate,
      scheduledTime: '16:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-3`
    });

    // Final at 6 PM
    matches.push({
      id: `match-3`,
      round: 2,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: tournamentDate,
      scheduledTime: '18:00',
      status: 'scheduled',
      stage: 'final'
    });

    return matches;
  }

  if (players.length === 6) {
    // Create first round with 2 matches (4 players advance)
    matches.push({
      id: `match-1`,
      round: 1,
      player1Id: shuffledPlayers[0].id,
      player2Id: shuffledPlayers[1].id,
      completed: false,
      scheduledDate: tournamentDate,
      scheduledTime: '12:00',
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
      scheduledDate: tournamentDate,
      scheduledTime: '13:00',
      status: 'scheduled',
      stage: 'quarter_final',
      nextMatchId: `match-5`
    });

    // Semi-finals (2 winners + 2 bye players)
    matches.push({
      id: `match-3`,
      round: 2,
      player1Id: shuffledPlayers[4].id, // Bye player 1
      player2Id: shuffledPlayers[5].id, // Bye player 2
      completed: false,
      scheduledDate: tournamentDate,
      scheduledTime: '15:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-6`
    });

    matches.push({
      id: `match-4`,
      round: 2,
      player1Id: '', // Winner of match-1
      player2Id: '', // Winner of match-2
      completed: false,
      scheduledDate: tournamentDate,
      scheduledTime: '16:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-6`
    });

    // Final at 6 PM
    matches.push({
      id: `match-5`,
      round: 3,
      player1Id: '', // Winner of match-3
      player2Id: '', // Winner of match-4
      completed: false,
      scheduledDate: tournamentDate,
      scheduledTime: '18:00',
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
        scheduledDate: tournamentDate,
        scheduledTime: timeSlots[i + 2], // Start from 12:00
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
      scheduledDate: tournamentDate,
      scheduledTime: '16:00',
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
      scheduledDate: tournamentDate,
      scheduledTime: '17:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-7`
    });

    // Final at 6 PM
    matches.push({
      id: `match-7`,
      round: 3,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: tournamentDate,
      scheduledTime: '18:00',
      status: 'scheduled',
      stage: 'final'
    });

    return matches;
  }

  // Handle 12, 14, 16+ players properly
  if (players.length === 12) {
    // First round: 4 matches (8 players advance to quarterfinals)
    for (let i = 0; i < 4; i++) {
      matches.push({
        id: `match-${i + 1}`,
        round: 1,
        player1Id: shuffledPlayers[i * 2].id,
        player2Id: shuffledPlayers[i * 2 + 1].id,
        completed: false,
        scheduledDate: tournamentDate,
        scheduledTime: timeSlots[i], // 10:00, 11:00, 12:00, 13:00
        status: 'scheduled',
        stage: 'regular',
        nextMatchId: `match-${5 + Math.floor(i / 2)}`
      });
    }

    // Quarterfinals: 4 matches (4 winners + 4 bye players)
    for (let i = 0; i < 4; i++) {
      const isFirstTwo = i < 2;
      matches.push({
        id: `match-${5 + i}`,
        round: 2,
        player1Id: isFirstTwo ? '' : shuffledPlayers[8 + i - 2].id, // Winners from first round or bye players
        player2Id: isFirstTwo ? '' : shuffledPlayers[8 + i - 1].id,
        completed: false,
        scheduledDate: tournamentDate,
        scheduledTime: timeSlots[i + 2], // 12:00, 13:00, 14:00, 15:00
        status: 'scheduled',
        stage: 'quarter_final',
        nextMatchId: `match-${9 + Math.floor(i / 2)}`
      });
    }

    // Semi-finals: 2 matches
    matches.push({
      id: `match-9`,
      round: 3,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: tournamentDate,
      scheduledTime: '16:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-11`
    });

    matches.push({
      id: `match-10`,
      round: 3,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: tournamentDate,
      scheduledTime: '17:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-11`
    });

    // Final at 6 PM
    matches.push({
      id: `match-11`,
      round: 4,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: tournamentDate,
      scheduledTime: '18:00',
      status: 'scheduled',
      stage: 'final'
    });

    return matches;
  }

  if (players.length === 14) {
    // First round: 6 matches (8 players advance)
    for (let i = 0; i < 6; i++) {
      matches.push({
        id: `match-${i + 1}`,
        round: 1,
        player1Id: shuffledPlayers[i * 2].id,
        player2Id: shuffledPlayers[i * 2 + 1].id,
        completed: false,
        scheduledDate: tournamentDate,
        scheduledTime: timeSlots[i], // 10:00 to 15:00
        status: 'scheduled',
        stage: 'regular',
        nextMatchId: `match-${7 + Math.floor(i / 2)}`
      });
    }

    // Quarterfinals: 4 matches (6 winners + 2 bye players)
    for (let i = 0; i < 4; i++) {
      const isByeMatch = i >= 3;
      matches.push({
        id: `match-${7 + i}`,
        round: 2,
        player1Id: isByeMatch ? shuffledPlayers[12 + i - 3].id : '', // Bye players or winners
        player2Id: isByeMatch ? shuffledPlayers[13 + i - 3].id : '',
        completed: false,
        scheduledDate: tournamentDate,
        scheduledTime: timeSlots[i + 2], // 12:00 to 15:00
        status: 'scheduled',
        stage: 'quarter_final',
        nextMatchId: `match-${11 + Math.floor(i / 2)}`
      });
    }

    // Semi-finals: 2 matches
    matches.push({
      id: `match-11`,
      round: 3,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: tournamentDate,
      scheduledTime: '16:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-13`
    });

    matches.push({
      id: `match-12`,
      round: 3,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: tournamentDate,
      scheduledTime: '17:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-13`
    });

    // Final at 6 PM
    matches.push({
      id: `match-13`,
      round: 4,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: tournamentDate,
      scheduledTime: '18:00',
      status: 'scheduled',
      stage: 'final'
    });

    return matches;
  }

  if (players.length === 16) {
    // Round of 16: 8 matches
    for (let i = 0; i < 8; i++) {
      matches.push({
        id: `match-${i + 1}`,
        round: 1,
        player1Id: shuffledPlayers[i * 2].id,
        player2Id: shuffledPlayers[i * 2 + 1].id,
        completed: false,
        scheduledDate: tournamentDate,
        scheduledTime: timeSlots[i % timeSlots.length],
        status: 'scheduled',
        stage: 'regular',
        nextMatchId: `match-${9 + Math.floor(i / 2)}`
      });
    }

    // Quarterfinals: 4 matches
    for (let i = 0; i < 4; i++) {
      matches.push({
        id: `match-${9 + i}`,
        round: 2,
        player1Id: '',
        player2Id: '',
        completed: false,
        scheduledDate: tournamentDate,
        scheduledTime: timeSlots[i + 2], // 12:00 to 15:00
        status: 'scheduled',
        stage: 'quarter_final',
        nextMatchId: `match-${13 + Math.floor(i / 2)}`
      });
    }

    // Semi-finals: 2 matches
    matches.push({
      id: `match-13`,
      round: 3,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: tournamentDate,
      scheduledTime: '16:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-15`
    });

    matches.push({
      id: `match-14`,
      round: 3,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: tournamentDate,
      scheduledTime: '17:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-15`
    });

    // Final at 6 PM
    matches.push({
      id: `match-15`,
      round: 4,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: tournamentDate,
      scheduledTime: '18:00',
      status: 'scheduled',
      stage: 'final'
    });

    return matches;
  }

  // For larger tournaments (handle using general algorithm)
  return generateGeneralKnockoutMatches(shuffledPlayers, tournamentDate);
};

// General knockout algorithm for any number of players
function generateGeneralKnockoutMatches(players: Player[], tournamentDate: string): Match[] {
  const matches: Match[] = [];
  let matchId = 1;
  
  // Define time slots to avoid conflicts
  const timeSlots = [
    "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
  ];
  
  // Calculate rounds needed
  const numRounds = Math.ceil(Math.log2(players.length));
  
  // Generate all rounds
  let currentRound = 1;
  let currentPlayers = [...players];
  let timeSlotIndex = 0;
  
  while (currentPlayers.length > 1) {
    const matchesThisRound = Math.floor(currentPlayers.length / 2);
    
    for (let i = 0; i < matchesThisRound; i++) {
      const stage = getStageForRound(currentRound, numRounds);
      
      // Special timing for final round
      let scheduledTime;
      if (stage === 'final') {
        scheduledTime = '18:00'; // Final at 6 PM
      } else {
        scheduledTime = timeSlots[timeSlotIndex % timeSlots.length];
        timeSlotIndex++;
      }
      
      matches.push({
        id: `match-${matchId++}`,
        round: currentRound,
        player1Id: currentPlayers[i * 2].id,
        player2Id: currentPlayers[i * 2 + 1].id,
        completed: false,
        scheduledDate: tournamentDate,
        scheduledTime,
        status: 'scheduled',
        stage,
        nextMatchId: currentRound < numRounds ? `match-${matchId + Math.floor(i / 2)}` : undefined
      });
    }
    
    // Handle bye players (odd number of players)
    const remainingPlayers = currentPlayers.slice(matchesThisRound * 2);
    currentPlayers = Array(matchesThisRound).fill(null).map(() => ({ id: '', name: 'TBD' })).concat(remainingPlayers);
    currentRound++;
  }
  
  return matches.sort((a, b) => a.round - b.round || parseInt(a.id.split('-')[1]) - parseInt(b.id.split('-')[1]));
}

// Helper functions
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
  const tournamentDate = currentDate.toISOString().split('T')[0];
  
  // Define time slots to avoid conflicts
  const timeSlots = [
    "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
  ];
  
  let timeSlotIndex = 0;
  
  // Generate all possible combinations of players (round-robin)
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      matches.push({
        id: `match-${matchId++}`,
        round: 1, // All matches are in round 1 for league format
        player1Id: players[i].id,
        player2Id: players[j].id,
        completed: false,
        scheduledDate: tournamentDate,
        scheduledTime: timeSlots[timeSlotIndex % timeSlots.length],
        status: 'scheduled',
        stage: 'regular'
      });
      
      timeSlotIndex++;
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
