'use client';

import React, { useState } from 'react';
import { HelpCircle, X, Trophy, Car, Award, Zap } from 'lucide-react';

interface MilleBornesRulesHelperProps {
  variant?: 'classique' | 'moderne';
}

export default function MilleBornesRulesHelper({ variant = 'moderne' }: MilleBornesRulesHelperProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Bouton d'aide */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-sm font-medium"
      >
        <HelpCircle className="h-4 w-4" />
        Vraies règles du 1000 Bornes
      </button>

      {/* Modal des règles */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Car className="h-6 w-6" />
                    Mille Bornes - Les VRAIES règles !
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    Découvrez pourquoi c'est un jeu de <strong>5000 points</strong>, pas de 1000 bornes !
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Objectif principal */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <h3 className="font-bold text-yellow-800 dark:text-yellow-200">
                    Objectif : Premier à 5000 POINTS !
                  </h3>
                </div>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                  <strong>Idée reçue :</strong> "Premier à 1000 bornes gagne" ❌<br />
                  <strong>Vraie règle :</strong> "Premier à 5000 points gagne" ✅
                </p>
              </div>

              {/* Système de points */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Points de base */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Points de base
                  </h3>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                    <h4 className="font-medium mb-2">Distances parcourues</h4>
                    <ul className="text-sm space-y-1">
                      <li>• 25 km = 25 points</li>
                      <li>• 50 km = 50 points</li> 
                      <li>• 75 km = 75 points</li>
                      <li>• 100 km = 100 points</li>
                      <li>• 200 km = 200 points</li>
                      <li className="font-medium">• 1000 km max = 1000 points max</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 rounded p-3">
                    <h4 className="font-medium mb-2 text-green-800 dark:text-green-200">Bottes (cartes spéciales)</h4>
                    <ul className="text-sm space-y-1 text-green-700 dark:text-green-300">
                      <li>• As du Volant = 100 pts</li>
                      <li>• Increvable = 100 pts</li>
                      <li>• Essence = 100 pts</li>
                      <li>• Prioritaire = 100 pts</li>
                      <li className="font-medium">• 4 bottes = 700 pts total !</li>
                    </ul>
                  </div>
                </div>

                {/* Points spéciaux */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Points spéciaux
                  </h3>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                    <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Bottes & Coups Fourrés
                    </h4>
                    <ul className="text-sm space-y-1 text-blue-700 dark:text-blue-300">
                      <li>• <strong>Botte exposée</strong> = 100 pts</li>
                      <li>• <strong>Botte en coup fourré</strong> = 100 + 300 = 400 pts</li>
                      <li>• Coup fourré = jouer la botte immédiatement quand l'adversaire attaque</li>
                      <li className="text-xs italic">Exemple : adversaire joue "Accident", vous jouez "As du Volant" = coup fourré !</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-3">
                    <h4 className="font-medium mb-2 text-purple-800 dark:text-purple-200">Fins de manche</h4>
                    <ul className="text-sm space-y-1 text-purple-700 dark:text-purple-300">
                      <li>• Manche terminée = 400 pts</li>
                      <li>• Allonge (700→1000) = 200 pts</li>
                      <li>• Sans les 200 = 300 pts</li>
                      {variant === 'classique' && (
                        <>
                          <li>• Coup du Couronnement = 300 pts</li>
                          <li>• Capot = 500 pts</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Exemple de calcul */}
              <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-bold mb-3 text-gray-900 dark:text-white">
                  Exemple de manche exceptionnelle :
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Distance</div>
                    <div>1000 bornes = 1000 pts</div>
                  </div>
                  <div>
                    <div className="font-medium">Bottes</div>
                    <div>4 bottes = 700 pts</div>
                  </div>
                  <div>
                    <div className="font-medium">Coups fourrés</div>
                    <div>3 × 300 = 900 pts</div>
                  </div>
                  <div>
                    <div className="font-medium">Bonus manche</div>
                    <div>Terminée = 400 pts</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="font-bold text-lg">
                    Total = 3000 points en une manche !
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Plus que la moitié des 5000 points nécessaires à la victoire
                  </div>
                </div>
              </div>

              {/* Différences versions */}
              <div className="mt-6 p-4 border border-orange-200 dark:border-orange-700 rounded-lg">
                <h3 className="font-bold mb-3 text-orange-800 dark:text-orange-200">
                  Versions classique vs moderne
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">Version classique (complète)</h4>
                    <ul className="space-y-1 text-green-600 dark:text-green-400">
                      <li>✅ Coup du Couronnement (+300)</li>
                      <li>✅ Capot (+500)</li>
                      <li>✅ Allonge (+200)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Version moderne (simplifiée)</h4>
                    <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                      <li>❌ Coup du Couronnement</li>
                      <li>❌ Capot</li>
                      <li>❌ Allonge</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Notre application propose les deux variantes : choisissez selon vos préférences !
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}