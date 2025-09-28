#!/usr/bin/env node

/**
 * Script pour nettoyer les données offline corrompues en développement
 */

console.log('🧹 Nettoyage des données offline corrompues...');

// Effacer IndexedDB dans le navigateur
console.log(`
Pour nettoyer complètement les données offline :

1. Ouvrir les DevTools (F12)
2. Aller dans l'onglet Application (ou Storage)
3. Sous "Storage" → "IndexedDB"
4. Supprimer "OhSheetOfflineDB"
5. Rafraîchir la page

Ou exécuter dans la console du navigateur :
---------------------------------------------
indexedDB.deleteDatabase('OhSheetOfflineDB');
console.log('✅ Base de données offline supprimée');
---------------------------------------------
`);