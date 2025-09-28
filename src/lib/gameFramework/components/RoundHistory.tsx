import React from 'react';
import GameCard from '@/components/layout/GameCard';
import { UILayout } from '../types';

interface RoundHistoryProps {
  session: { rounds?: Record<string, unknown>[] };
  layout: UILayout;
  roundLabel?: string; // "Manche", "Donne", "Partie"
}

export default function RoundHistory({
  session,
  layout,
  roundLabel = "Manche"
}: RoundHistoryProps) {
  if (!layout.roundHistory.show || !session?.rounds?.length) {
    return null;
  }

  return (
    <GameCard title={`Historique des ${roundLabel.toLowerCase()}s`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b dark:border-gray-700">
              {layout.roundHistory.columns.map((column, index) => (
                <th 
                  key={index}
                  className={`p-2 text-sm font-medium ${
                    column.key === 'round' ? 'text-left' : 'text-center'
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {session.rounds.map((round: Record<string, unknown>, roundIndex: number) => (
              <tr key={roundIndex} className="border-b dark:border-gray-700">
                {layout.roundHistory.columns.map((column, colIndex) => (
                  <td 
                    key={colIndex}
                    className={`p-2 text-sm ${
                      column.key === 'round' ? 'font-medium' : 'text-center'
                    }`}
                  >
                    {column.render 
                      ? column.render(round, session)
                      : getDefaultColumnValue(round, column.key, roundLabel)
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GameCard>
  );
}

function getDefaultColumnValue(round: Record<string, unknown>, columnKey: string, roundLabel: string): React.ReactNode {
  switch (columnKey) {
    case 'round':
      return `${roundLabel} ${round.round_number}`;
    case 'details':
      return round.details ? JSON.stringify(round.details) : '-';
    default:
      return round[columnKey] || '-';
  }
}