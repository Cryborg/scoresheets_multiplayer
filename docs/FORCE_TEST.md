# 🔧 Test de Force - Debugging

## Instructions Test

1. **Lancer serveur** : `npm run dev`

2. **Hard refresh navigateur** :
   - Chrome/Safari : `Cmd + Shift + R`  
   - Firefox : `Ctrl + F5`

3. **Ouvrir console** : `F12` ou `Cmd + Alt + I`

4. **Aller sur** : http://localhost:3000/sessions/1

5. **Actions à faire** :
   - **Cliquer dans une case** (ex: première ligne, joueur 1)
   - **Regarder console** : devrait voir `🔍 Focus on: ones-1`
   - **Regarder interface** : devrait voir "✏️ Édition (pause sync)"
   - **Taper "25"** : devrait rester visible
   - **Cliquer ailleurs** : devrait voir `🔍 Blur from: ones-1`

## Expected vs Reality

### ✅ Ce qui devrait se passer :
```
Console:
🔍 Focus on: ones-1
🔄 updateCurrentScores called, editingFields: {ones-1: true}
✏️ Interface shows: "✏️ Édition (pause sync)"
⏸️ No more GET /api/sessions/1/realtime in server logs
✨ User types "25" → stays visible
```

### ❌ Si ça marche pas :
```
- Pas de logs Focus/Blur dans console
- Interface ne montre pas "✏️ Édition" 
- Toujours GET /api/sessions/1/realtime spam
- Chiffres s'effacent toujours
```

## Diagnostic Possible

1. **Cache browser** : Hard refresh pas suffisant
2. **React dev mode** : Composant remonte pas d'état  
3. **Hooks pas connectés** : onFocus/onBlur pas appelés
4. **Build issue** : Code pas pris en compte

## Next Steps

Si logs apparaissent pas → problème handlers onFocus/onBlur  
Si logs OK mais polling continue → problème logique pausePolling  
Si interface OK mais chiffres effacés → problème autre