
import React from 'react';
import { TournamentFormat } from '@/types/tournament.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Calendar, Zap } from 'lucide-react';

interface TournamentFormatSelectorProps {
  selectedFormat: TournamentFormat;
  onFormatChange: (format: TournamentFormat) => void;
  maxPlayers: number;
}

const TournamentFormatSelector: React.FC<TournamentFormatSelectorProps> = ({
  selectedFormat,
  onFormatChange,
  maxPlayers
}) => {
  const formatOptions = [
    {
      format: 'knockout' as TournamentFormat,
      title: 'Knockout Tournament',
      description: 'Single elimination format where players are eliminated after one loss',
      icon: <Trophy className="h-5 w-5" />,
      pros: ['Fast-paced', 'Clear winner path', 'Exciting elimination matches'],
      cons: ['Players eliminated early get fewer games', 'No second chances'],
      estimatedMatches: maxPlayers > 0 ? maxPlayers - 1 : 0,
      estimatedDuration: 'Short to Medium'
    },
    {
      format: 'league' as TournamentFormat,
      title: 'League Tournament',
      description: 'Round-robin format where every player plays against every other player',
      icon: <Users className="h-5 w-5" />,
      pros: ['Every player gets multiple games', 'Fair ranking system', 'More gameplay for everyone'],
      cons: ['Takes longer to complete', 'May have less excitement than knockouts'],
      estimatedMatches: maxPlayers > 1 ? (maxPlayers * (maxPlayers - 1)) / 2 : 0,
      estimatedDuration: 'Medium to Long'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400 mb-4">
        Choose your tournament format based on the number of players and time available
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {formatOptions.map((option) => (
          <Card 
            key={option.format}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedFormat === option.format 
                ? 'border-blue-500 bg-blue-950/20 shadow-lg' 
                : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => onFormatChange(option.format)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {option.icon}
                  <CardTitle className="text-lg">{option.title}</CardTitle>
                </div>
                {selectedFormat === option.format && (
                  <Badge variant="secondary" className="bg-blue-600 text-white">
                    Selected
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-400">{option.description}</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{option.estimatedDuration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  <span>{option.estimatedMatches} matches</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <h5 className="text-xs font-medium text-green-400 mb-1">Advantages:</h5>
                  <ul className="text-xs text-gray-300 space-y-0.5">
                    {option.pros.map((pro, index) => (
                      <li key={index}>• {pro}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h5 className="text-xs font-medium text-orange-400 mb-1">Considerations:</h5>
                  <ul className="text-xs text-gray-300 space-y-0.5">
                    {option.cons.map((con, index) => (
                      <li key={index}>• {con}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TournamentFormatSelector;
