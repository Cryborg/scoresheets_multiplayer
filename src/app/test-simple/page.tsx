'use client';

import { useState } from 'react';

export default function TestSimple() {
  const [scores, setScores] = useState<{ [key: string]: string }>({});

  const handleChange = (key: string, value: string) => {
    console.log('🔍 Change:', key, '=', value);
    setScores(prev => ({ ...prev, [key]: value }));
  };

  const handleFocus = (key: string) => {
    console.log('🔍 Focus:', key);
  };

  const handleBlur = (key: string) => {
    console.log('🔍 Blur:', key);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Test Simple - Saisie</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 mb-4">
            Test saisie SANS polling pour isoler le problème
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            {['ones', 'twos', 'threes', 'fours'].map(category => (
              <div key={category} className="border p-4 rounded">
                <label className="block text-sm font-medium mb-2 capitalize">
                  {category}
                </label>
                <input
                  type="number"
                  value={scores[category] || ''}
                  onChange={(e) => handleChange(category, e.target.value)}
                  onFocus={() => handleFocus(category)}
                  onBlur={() => handleBlur(category)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                            focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">État actuel :</h3>
            <pre className="text-sm text-gray-600">
              {JSON.stringify(scores, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}